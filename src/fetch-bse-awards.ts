/**
 * Fetch the latest BSE "Award of Order / Receipt of Order" announcements,
 * persist raw payloads, and expose structured outputs for downstream steps.
 */
import axios from "axios";
import { writeFile } from "fs/promises";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import {
  ensureDir,
  writeJsonFile,
  enforceRateLimit,
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
const MAX_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 2_000;
const RETRY_FACTOR = 2;

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
async function writeRunSummary(snapshot: FetchSnapshot): Promise<void> {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  const lines: string[] = [];
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
 * Retry wrapper around {@link fetchPayload} using exponential backoff.
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
      console.warn(
        `Fetch attempt ${attempt} failed (will retry after ${waitMs}ms): ${(error as Error).message}`
      );
      await delay(waitMs);
      waitMs *= RETRY_FACTOR;
    }
  }

  throw new Error("Exhausted retry attempts for BSE API request.");
}

/**
 * Entry point executed by the GitHub Action step.
 */
async function main(): Promise<void> {
  const istNow = nowInIST();
  const queryDate = formatQueryDate(istNow);
  const tradingDate = currentTradingDate();
  const requestUrl = buildRequestUrl(queryDate);

  const throttleWaitMs = await enforceRateLimit();

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

  const checksum = createChecksum(announcements.map((item) => item.newsId));
  console.log(`Fetched ${announcements.length} announcements for ${tradingDate}. checksum=${checksum}`);
  await writeGithubOutputs(tradingDate, announcements);
  await writeRunSummary(snapshot);
}

main().catch((error) => {
  console.error("Failed to fetch BSE award announcements:", error);
  process.exitCode = 1;
});
