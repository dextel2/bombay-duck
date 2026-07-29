/**
 * Fetch the latest BSE "Award of Order / Receipt of Order" announcements,
 * persist raw payloads, and expose structured outputs for downstream steps.
 *
 * Resilience features (see #30):
 * - Configurable retry / backoff via env vars
 * - Cool-off window after consecutive failures
 * - Honour Retry-After response header when present
 * - Minimal schema validation of the BSE payload
 */
import axios, { AxiosError } from "axios";
import { writeFile } from "fs/promises";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import {
  ensureDir,
  writeJsonFile,
  enforceRateLimit,
  getCoolOffRemainingMs,
  recordSuccess,
  recordFailure,
  createChecksum,
  currentTradingDate,
  formatQueryDate,
  nowInIST,
  parseAnnouncementDate,
  toIsoString
} from "@/lib";
import { Announcement, BseApiResponse, FetchSnapshot } from "@/types";

const API_ENDPOINT = "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w";
const RAW_DIR = path.join("data", "raw");
const SNAPSHOT_FILE = path.join("data", "latest-fetch.json");

function parseEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const MAX_ATTEMPTS = parseEnvInt("MAX_ATTEMPTS", 4);
const BASE_RETRY_DELAY_MS = parseEnvInt("BASE_RETRY_DELAY_MS", 2_000);
const RETRY_FACTOR = parseEnvInt("RETRY_FACTOR", 2);

/** Build the query URL used to poll the BSE API for a specific trading day. */
function buildRequestUrl(dateString: string): string {
  const url = new URL(API_ENDPOINT);
  url.searchParams.set("pageno", "1");
  url.searchParams.set("strCat", "Company Update");
  url.searchParams.set("strPrevDate", dateString);
  url.searchParams.set("strScrip", "");
  url.searchParams.set("strSearch", "P");
  url.searchParams.set("strToDate", dateString);
  url.searchParams.set("strType", "C");
  url.searchParams.set("subcategory", "Award of Order / Receipt of Order");
  return url.toString();
}

/**
 * Minimal structural validation of the BSE response.
 * Throws a descriptive error when the contract appears to have changed.
 */
function assertValidPayload(payload: unknown): asserts payload is BseApiResponse {
  if (payload === null || typeof payload !== "object") {
    throw new Error("BSE API contract change: response is not an object.");
  }

  const candidate = payload as Record<string, unknown>;

  // Table may be missing or empty on quiet days – that is valid.
  // We only reject clearly broken shapes.
  if ("Table" in candidate && candidate.Table !== undefined && !Array.isArray(candidate.Table)) {
    throw new Error("BSE API contract change: expected `Table` to be an array when present.");
  }

  if (Array.isArray(candidate.Table) && candidate.Table.length > 0) {
    const first = candidate.Table[0] as Record<string, unknown>;
    const requiredKeys = ["NEWSID", "SCRIP_CD"];
    for (const key of requiredKeys) {
      if (!(key in first)) {
        throw new Error(
          `BSE API contract change: announcement objects are missing required field \"${key}\".`
        );
      }
    }
  }
}

/**
 * Normalize the raw BSE payload into the internal {@link Announcement} shape.
 */
function normaliseAnnouncements(payload: BseApiResponse): Announcement[] {
  const items = payload.Table ?? [];
  return items.map((item) => {
    const announcedAt = parseAnnouncementDate([
      item.DissemDT,
      item.DT_TM,
      item.News_submission_dt
    ]);

    const cleanedHeadline = (item.HEADLINE ?? "").replace(/\s+/g, " ").trim();
    const cleanedName = (item.SLONGNAME ?? "").replace(/\s+/g, " ").trim() || "Unknown";
    const url = item.NURL ?? item.NSURL ?? (item as { URL?: string }).URL ?? item.ATTACHMENTNAME ?? "";

    return {
      newsId: item.NEWSID,
      scripCode: item.SCRIP_CD,
      shortName: cleanedName,
      headline: cleanedHeadline,
      announcedAt,
      url,
      rawTime: item.DissemDT ?? item.DT_TM ?? item.News_submission_dt
    };
  });
}

/**
 * Publish structured announcement data as GitHub Actions outputs for optional
 * downstream jobs.
 */
async function writeGithubOutputs(tradingDate: string, announcements: Announcement[]): Promise<void> {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;

  const lines = [
    `trading_date=${tradingDate}`,
    `announcement_count=${announcements.length}`,
    "announcements<<EOF",
    JSON.stringify(announcements, null, 2),
    "EOF"
  ];

  await writeFile(outputFile, `${lines.join("\n")}\n`, { flag: "a" });
}

/**
 * Append a rich summary of the fetch results (or failure reason) to the GitHub Step Summary.
 */
async function writeRunSummary(
  snapshot: FetchSnapshot | null,
  options?: { coolOffMs?: number; schemaError?: string; failureMessage?: string }
): Promise<void> {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  const lines: string[] = [];

  if (options?.coolOffMs && options.coolOffMs > 0) {
    const minutes = Math.ceil(options.coolOffMs / 60_000);
    lines.push("### BSE Award Watch – Cool-off active");
    lines.push("");
    lines.push(
      `A previous run recorded repeated failures. Skipping fetch for approximately **${minutes} more minute(s)**.`
    );
    lines.push("");
    lines.push("This protects the unauthenticated BSE endpoint from further load.");
    await writeFile(summaryFile, `${lines.join("\n")}\n`, { flag: "a" });
    return;
  }

  if (options?.schemaError) {
    lines.push("### BSE Award Watch – API contract issue");
    lines.push("");
    lines.push(`**Schema validation failed:** ${options.schemaError}`);
    lines.push("");
    lines.push("Inspect the raw payload under `data/raw/` and update the normaliser if the BSE response shape has changed.");
    await writeFile(summaryFile, `${lines.join("\n")}\n`, { flag: "a" });
    return;
  }

  if (options?.failureMessage || !snapshot) {
    lines.push("### BSE Award Watch – Fetch failed");
    lines.push("");
    lines.push(options?.failureMessage ?? "Unknown failure.");
    lines.push("");
    lines.push("Consecutive failures may trigger a cool-off window before the next attempt.");
    await writeFile(summaryFile, `${lines.join("\n")}\n`, { flag: "a" });
    return;
  }

  lines.push(`### BSE Award of Order - ${snapshot.meta.tradingDate}`);
  lines.push("");

  if (snapshot.announcements.length === 0) {
    lines.push("No announcements recorded in this poll.");
  } else {
    lines.push("| # | Company | Code | Time (IST) | Headline | Link |");
    lines.push("| - | ------- | ---- | ---------- | -------- | ---- |");

    snapshot.announcements.forEach((announcement, index) => {
      const safeHeadline = announcement.headline.replace(/\|/g, "\\|");
      const safeCompany = announcement.shortName.replace(/\|/g, "\\|");
      const link = announcement.url ? `[Open](${announcement.url})` : "-";
      lines.push(
        `| ${index + 1} | ${safeCompany} | ${announcement.scripCode} | ${announcement.announcedAt} | ${safeHeadline} | ${link} |`
      );
    });
  }

  lines.push("");
  lines.push(
    `Meta: fetched at ${snapshot.meta.fetchedAt} (IST) | Retries: ${snapshot.meta.retryCount} | Waited: ${snapshot.meta.throttleWaitMs}ms`
  );
  lines.push(`Raw payload: ${snapshot.rawPayloadPath}`);

  await writeFile(summaryFile, `${lines.join("\n")}\n`, { flag: "a" });
}

/** Extract Retry-After delay (ms) from an Axios error when present. */
function getRetryAfterMs(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  const header = error.response?.headers?.["retry-after"];
  if (!header) return null;

  const asNumber = Number(header);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    // Header value is seconds
    return Math.ceil(asNumber * 1000);
  }

  // HTTP-date form is rare for this API; ignore for now
  return null;
}

/** Perform a single HTTP GET against the BSE API. */
export async function fetchPayload(url: string): Promise<BseApiResponse> {
  const response = await axios.get<BseApiResponse>(url, {
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      origin: "https://www.bseindia.com",
      referer: "https://www.bseindia.com/",
      "user-agent": "@dextel2/bombay-duck/1.0",
      "x-requested-with": "XMLHttpRequest",
    },
    timeout: 15_000, // 15 seconds
  });

  return response.data ?? { Table: [], Table1: [] };
}

/**
 * Retry wrapper around {@link fetchPayload} using exponential backoff and
 * optional Retry-After support.
 */
async function fetchWithRetry(url: string): Promise<{ payload: BseApiResponse; retries: number }> {
  let attempt = 0;
  let waitMs = BASE_RETRY_DELAY_MS;

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1;
    try {
      const payload = await fetchPayload(url);
      return { payload, retries: attempt - 1 };
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) {
        throw error;
      }

      const retryAfterMs = getRetryAfterMs(error);
      const delayMs = retryAfterMs ?? waitMs;

      const reason = axios.isAxiosError(error)
        ? `${error.message}${error.response?.status ? ` (HTTP ${error.response.status})` : ""}`
        : (error as Error).message;

      console.warn(
        `Fetch attempt ${attempt}/${MAX_ATTEMPTS} failed (will retry after ${delayMs}ms): ${reason}`
      );

      await delay(delayMs);
      if (!retryAfterMs) {
        waitMs *= RETRY_FACTOR;
      }
    }
  }

  throw new Error("Exhausted retry attempts for BSE API request.");
}

/**
 * Entry point executed by the GitHub Action step.
 */
async function main(): Promise<void> {
  // Honour cool-off window from previous consecutive failures
  const coolOffRemaining = await getCoolOffRemainingMs();
  if (coolOffRemaining > 0) {
    console.log(
      `[cool-off] Skipping fetch – cool-off still active for ~${Math.ceil(coolOffRemaining / 60_000)} minute(s).`
    );
    await writeRunSummary(null, { coolOffMs: coolOffRemaining });
    // Exit successfully so the workflow does not look red; downstream steps
    // will see no new data and simply skip the commit.
    process.exitCode = 0;
    return;
  }

  const istNow = nowInIST();
  const queryDate = formatQueryDate(istNow);
  const tradingDate = currentTradingDate();
  const requestUrl = buildRequestUrl(queryDate);

  try {
    const throttleWaitMs = await enforceRateLimit();

    const { payload, retries } = await fetchWithRetry(requestUrl);

    // Schema validation – fail loudly if the contract has changed
    try {
      assertValidPayload(payload);
    } catch (schemaError) {
      const message = (schemaError as Error).message;
      console.error(message);
      await writeRunSummary(null, { schemaError: message });
      await recordFailure();
      process.exitCode = 1;
      return;
    }

    const announcements = normaliseAnnouncements(payload);
    const fetchedAt = toIsoString(nowInIST());

    const tradingDateDir = path.join(RAW_DIR, tradingDate);
    await ensureDir(tradingDateDir);
    const rawFileName = `awards-${istNow.toFormat("HHmmss")}.json`;
    const rawPayloadPath = path.join("data", "raw", tradingDate, rawFileName);
    await writeJsonFile(path.join(tradingDateDir, rawFileName), payload);

    const snapshot: FetchSnapshot = {
      meta: {
        requestUrl,
        tradingDate,
        fetchedAt,
        retryCount: retries,
        throttleWaitMs,
        totalAnnouncements: announcements.length
      },
      announcements,
      rawPayloadPath
    };

    await writeJsonFile(SNAPSHOT_FILE, snapshot);

    const checksum = createChecksum(announcements.map((item) => item.newsId));
    console.log(`Fetched ${announcements.length} announcements for ${tradingDate}. checksum=${checksum}`);

    await recordSuccess();
    await writeGithubOutputs(tradingDate, announcements);
    await writeRunSummary(snapshot);
  } catch (error) {
    const message = (error as Error).message ?? String(error);
    console.error("Failed to fetch BSE award announcements:", message);

    const failureInfo = await recordFailure();
    if (failureInfo.coolOffActivated) {
      console.warn(
        `[cool-off] Activated after ${failureInfo.consecutiveFailures} consecutive failures. ` +
          `Next eligible fetch in ~${Math.ceil(failureInfo.coolOffMs / 60_000)} minute(s).`
      );
    }

    await writeRunSummary(null, {
      failureMessage: message,
      coolOffMs: failureInfo.coolOffActivated ? failureInfo.coolOffMs : undefined
    });

    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Unhandled error in fetch script:", error);
  process.exitCode = 1;
});
