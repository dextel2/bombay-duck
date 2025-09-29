/**
 * Merge step that combines the latest fetch snapshot with the persisted
 * intraday state, deduplicating announcements and rolling state files.
 */
import path from "path";
import { access, readdir, rename } from "fs/promises";
import { readJsonFile, writeJsonFile, ensureDir } from "./lib/io";
import { createChecksum } from "./lib/checksum";
import { toIsoHour, formatDisplayTime } from "./lib/time";
import { Announcement, FetchSnapshot, IntradayState } from "./types";

const SNAPSHOT_FILE = path.join("data", "latest-fetch.json");
const DATA_DIR = "data";
const ARCHIVE_DIR = path.join(DATA_DIR, "archive");
const STATE_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}\.json$/;

/** Deduplicate a combined list of announcements keeping the most recent entry. */
function dedupeAnnouncements(existing: Announcement[], incoming: Announcement[]): Announcement[] {
  const byId = new Map(existing.map((item) => [item.newsId, item] as const));
  for (const item of incoming) {
    byId.set(item.newsId, item);
  }
  return Array.from(byId.values()).sort((a, b) => (a.announcedAt > b.announcedAt ? -1 : 1));
}

/** Load the most recent fetch snapshot written by the fetch script. */
async function loadSnapshot(): Promise<FetchSnapshot> {
  const data = await readJsonFile<FetchSnapshot>(SNAPSHOT_FILE);
  if (!data) {
    throw new Error("No latest fetch snapshot found. Run fetch step first.");
  }
  return data;
}

/** Archive stale daily state files so only the active trading day remains in-place. */
async function purgeOldStateFiles(currentTradingDate: string): Promise<void> {
  const entries = await readdir(DATA_DIR, { withFileTypes: true });
  const archiveCandidates = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        STATE_FILE_PATTERN.test(entry.name) &&
        entry.name !== `${currentTradingDate}.json`
    );

  if (archiveCandidates.length === 0) {
    return;
  }

  await ensureDir(ARCHIVE_DIR);

  await Promise.all(
    archiveCandidates.map(async (entry) => {
      const sourcePath = path.join(DATA_DIR, entry.name);
      const destinationPath = await resolveArchivePath(entry.name);
      await rename(sourcePath, destinationPath);
    })
  );
}

async function resolveArchivePath(filename: string): Promise<string> {
  const baseTarget = path.join(ARCHIVE_DIR, filename);
  if (!(await fileExists(baseTarget))) {
    return baseTarget;
  }

  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(ARCHIVE_DIR, `${name}.${timestamp}${ext}`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

/**
 * Entry point for the merge job. Updates the per-day JSON state and logs a summary.
 */
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
