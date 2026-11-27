/**
 * Fetch the latest BSE "Award of Order / Receipt of Order" announcements,
 * persist raw payloads, and expose structured outputs for downstream steps.
 *
 * Resilience (see #30):
 * - Configurable retry / backoff via env vars
 * - Cross-run cool-off after consecutive hard failures
 * - Honour Retry-After response header when present
 * - Lightweight response-shape validation
 */
import axios, { AxiosError } from "axios";
import { writeFile } from "fs/promises";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import {
  ensureDir,
  writeJsonFile,
  enforceRateLimit,
  isCoolOffActive,
  recordFetchSuccess,
  recordFetchFailure,
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

function parseEnvInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

const MAX_ATTEMPTS = parseEnvInt("MAX_ATTEMPTS", 5);
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
 * Lightweight structural check so a silent API contract change fails loudly.
 */
function assertPayloadShape(payload: unknown): asserts payload is BseApiResponse {
  if (payload === null || typeof payload !== "object") {
    throw new Error("BSE API response is not an object — possible contract change.");
  }

  const candidate = payload as BseApiResponse;

  // Table may be missing or empty on quiet days; when present it must be an array.
  if (candidate.Table !== undefined && !Array.isArray(candidate.Table)) {
    throw new Error(
      "BSE API response.Table is present but not an array — possible contract change."
    );
  }

  if (Array.isArray(candidate.Table) && candidate.Table.length > 0) {
    const sample = candidate.Table[0] as Record<string, unknown>;
    const required = ["NEWSID", "SCRIP_CD"];
    for (const key of required) {
      if (!(key in sample)) {
        throw new Error(
          `BSE API announcement is missing required field "${key}" — possible contract change.`
        );
      }
    }
  }
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
 * Append a rich summary of the fetch results to the GitHub Step Summary panel.
 */
async function writeRunSummary(
  snapshot: FetchSnapshot | null,
  extraLines: string[] = []
): Promise<void> {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  const lines: string[] = [];

  if (snapshot) {
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
  }

  for (const line of extraLines) {
    lines.push(line);
  }

  await writeFile(summaryFile, `${lines.join("\n")}\n`, { flag: "a" });
}

/** Extract Retry-After delay in milliseconds from an Axios error, if present. */
function getRetryAfterMs(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  const header = error.response?.headers?.["retry-after"];
  if (!header) return null;

  const asNumber = Number.parseInt(String(header), 10);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    // Header value is seconds
    return asNumber * 1_000;
  }

  // HTTP-date form is uncommon here; ignore for now
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
      "x-requested-with": "XMLHttpRequest"
    },
    timeout: 15_000 // 15 seconds
  });

  const data = response.data ?? { Table: [], Table1: [] };
  assertPayloadShape(data);
  return data;
}

/**
 * Retry wrapper around {@link fetchPayload} using exponential backoff and
 * optional Retry-After header.
 */
async function fetchWithRetry(
  url: string
): Promise<{ payload: BseApiResponse; retries: number }> {
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
      const actualWait = retryAfterMs ?? waitMs;

      const reason =
        axios.isAxiosError(error) && error.response
          ? `HTTP ${error.response.status}`
          : (error as Error).message;

      console.warn(
        `Fetch attempt ${attempt}/${MAX_ATTEMPTS} failed (${reason}); retrying after ${actualWait}ms` +
          (retryAfterMs ? " (Retry-After)" : "")
      );

      await delay(actualWait);
      waitMs = Math.min(waitMs * RETRY_FACTOR, 120_000); // cap at 2 minutes
    }
  }

  throw new Error("Exhausted retry attempts for BSE API request.");
}

/**
 * Entry point executed by the GitHub Action step.
 */
async function main(): Promise<void> {
  // --- Cool-off gate ---
  const coolOff = await isCoolOffActive();
  if (coolOff.active) {
    const remainingMin = Math.ceil(coolOff.remainingMs / 60_000);
    const msg = `Cool-off active until ${coolOff.until} (~${remainingMin} min remaining). Skipping fetch to avoid further throttling.`;
    console.log(`[fetch] ${msg}`);
    await writeRunSummary(null, [
      "### Cool-off active",
      "",
      msg,
      "",
      "Consecutive failures exceeded the threshold. The next successful run will clear cool-off automatically."
    ]);
    // Exit 0 so the workflow does not look red during intentional cool-off
    process.exitCode = 0;
    return;
  }

  const istNow = nowInIST();
  const queryDate = formatQueryDate(istNow);
  const tradingDate = currentTradingDate();
  const requestUrl = buildRequestUrl(queryDate);

  const throttleWaitMs = await enforceRateLimit();

  try {
    const { payload, retries } = await fetchWithRetry(requestUrl);

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

    await recordFetchSuccess();

    const checksum = createChecksum(announcements.map((item) => item.newsId));
    console.log(
      `Fetched ${announcements.length} announcements for ${tradingDate}. checksum=${checksum} retries=${retries}`
    );
    await writeGithubOutputs(tradingDate, announcements);
    await writeRunSummary(snapshot);
  } catch (error) {
    const failure = await recordFetchFailure();
    const errMsg = (error as Error).message;

    console.error("Failed to fetch BSE award announcements:", errMsg);

    const summaryLines = [
      "### Fetch failure",
      "",
      `Error: ${errMsg}`,
      `Consecutive failures: ${failure.consecutiveFailures}`,
      ""
    ];

    if (failure.coolOffStarted) {
      summaryLines.push(
        `**Cool-off started** until ${failure.coolOffUntil}. Subsequent runs will skip the network call until that time.`
      );
    }

    await writeRunSummary(null, summaryLines);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Unexpected failure in fetch-bse-awards:", error);
  process.exitCode = 1;
});
