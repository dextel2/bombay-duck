import path from "path";
import { readdir, rm } from "fs/promises";
import { readJsonFile, writeJsonFile, ensureDir } from "./lib/io";
import { createChecksum } from "./lib/checksum";
import { toIsoHour, formatDisplayTime } from "./lib/time";
import { Announcement, FetchSnapshot, IntradayState } from "./types";

const SNAPSHOT_FILE = path.join("data", "latest-fetch.json");
const DATA_DIR = "data";
const STATE_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}\.json$/;

function dedupeAnnouncements(existing: Announcement[], incoming: Announcement[]): Announcement[] {
  const byId = new Map(existing.map((item) => [item.newsId, item] as const));
  for (const item of incoming) {
    byId.set(item.newsId, item);
  }
  return Array.from(byId.values()).sort((a, b) => (a.announcedAt > b.announcedAt ? -1 : 1));
}

async function loadSnapshot(): Promise<FetchSnapshot> {
  const data = await readJsonFile<FetchSnapshot>(SNAPSHOT_FILE);
  if (!data) {
    throw new Error("No latest fetch snapshot found. Run fetch step first.");
  }
  return data;
}

async function purgeOldStateFiles(currentTradingDate: string): Promise<void> {
  const entries = await readdir(DATA_DIR, { withFileTypes: true });
  const removalTasks = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        STATE_FILE_PATTERN.test(entry.name) &&
        entry.name !== `${currentTradingDate}.json`
    )
    .map((entry) => rm(path.join(DATA_DIR, entry.name), { force: true }));

  await Promise.all(removalTasks);
}

async function main(): Promise<void> {
  const snapshot = await loadSnapshot();
  await ensureDir(DATA_DIR);
  await purgeOldStateFiles(snapshot.meta.tradingDate);

  const stateFile = path.join(DATA_DIR, `${snapshot.meta.tradingDate}.json`);
  const existing = await readJsonFile<IntradayState>(stateFile);

  const bucketMap = new Map(Object.entries(existing?.buckets ?? {}));

  for (const announcement of snapshot.announcements) {
    const bucketKey = toIsoHour(announcement.announcedAt);
    const current = bucketMap.get(bucketKey) ?? [];
    bucketMap.set(bucketKey, dedupeAnnouncements(current, [announcement]));
  }

  const buckets = Object.fromEntries(bucketMap);
  const allAnnouncements = Object.values(buckets).flat();
  const checksum = createChecksum(allAnnouncements.map((item) => item.newsId));

  const merged: IntradayState = {
    tradingDate: snapshot.meta.tradingDate,
    buckets,
    meta: {
      lastUpdated: snapshot.meta.fetchedAt,
      checksum,
      totalAnnouncements: allAnnouncements.length,
      requestCount: (existing?.meta.requestCount ?? 0) + 1,
      retryCount: (existing?.meta.retryCount ?? 0) + snapshot.meta.retryCount,
      rawPayloadPath: snapshot.rawPayloadPath
    }
  };

  await writeJsonFile(stateFile, merged);

  console.log(
    `Merged ${snapshot.announcements.length} announcements into ${stateFile}. Updated total=${merged.meta.totalAnnouncements}, lastUpdated=${formatDisplayTime(snapshot.meta.fetchedAt)}.`
  );
}

main().catch((error) => {
  console.error("Failed to merge intraday state:", error);
  process.exitCode = 1;
});
