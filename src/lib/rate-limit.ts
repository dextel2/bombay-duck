/**
 * On-disk rate limiter to ensure API calls respect BSE throttling rules
 * across workflow retries.
 */
import { setTimeout as delay } from "timers/promises";
import path from "path";
import { DateTime } from "luxon";
import { ensureDir, readJsonFile, writeJsonFile } from "@/lib/io";
import { IST_ZONE, toIsoString } from "@/lib/time";

interface RateLimitState {
  lastRequestAt: string;
}

const DEFAULT_MIN_GAP_MS = 60_000; // 1 minute
const STATE_FILE = path.join("data", ".rate-limit.json");

/**
 * Ensures a minimum gap between API calls across workflow runs.
 *
 * @param minGapMs - Minimum delay in milliseconds (default: 60 seconds).
 * @returns The number of milliseconds actually waited.
 */
export async function enforceRateLimit(minGapMs: number = DEFAULT_MIN_GAP_MS): Promise<number> {
  // Ensure directory exists
  await ensureDir(path.dirname(STATE_FILE));

  const now = DateTime.now().setZone(IST_ZONE);
  const state = await readJsonFile<RateLimitState>(STATE_FILE);
  const lastRequest = parseLastRequestTime(state?.lastRequestAt);

  // If a valid last request exists, calculate the gap
  if (lastRequest) {
    const elapsedMs = now.diff(lastRequest).as("milliseconds");

    if (elapsedMs < minGapMs) {
      const waitMs = Math.ceil(minGapMs - elapsedMs);
      await delay(waitMs);
      return await updateRateLimitState();
    }
  }

  return await updateRateLimitState(0);

  // --- Helper functions ---
  async function updateRateLimitState(waitedMs = 0): Promise<number> {
    const timestamp = toIsoString(DateTime.now().setZone(IST_ZONE));
    await writeJsonFile(STATE_FILE, { lastRequestAt: timestamp });
    return waitedMs;
  }

  function parseLastRequestTime(isoString?: string): DateTime | null {
    if (!isoString) return null;
    const dt = DateTime.fromISO(isoString, { zone: IST_ZONE });
    return dt.isValid ? dt : null;
  }
}
