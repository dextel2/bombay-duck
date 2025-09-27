import { setTimeout as delay } from "timers/promises";
import path from "path";
import { DateTime } from "luxon";
import { ensureDir, readJsonFile, writeJsonFile } from "./io";
import { IST_ZONE, toIsoString } from "./time";

interface RateLimitState {
  lastRequestAt: string;
}

const DEFAULT_MIN_GAP_MS = 60_000;
const STATE_FILE = path.join("data", ".rate-limit.json");

export async function enforceRateLimit(minGapMs: number = DEFAULT_MIN_GAP_MS): Promise<number> {
  await ensureDir(path.dirname(STATE_FILE));
  const state = await readJsonFile<RateLimitState>(STATE_FILE);
  const now = DateTime.now().setZone(IST_ZONE);

  if (state?.lastRequestAt) {
    const last = DateTime.fromISO(state.lastRequestAt, { zone: IST_ZONE });
    if (last.isValid) {
      const diff = now.diff(last).as("milliseconds");
      if (diff < minGapMs) {
        const waitMs = Math.ceil(minGapMs - diff);
        await delay(waitMs);
        const updatedNow = DateTime.now().setZone(IST_ZONE);
        await writeJsonFile(STATE_FILE, { lastRequestAt: toIsoString(updatedNow) });
        return waitMs;
      }
    }
  }

  await writeJsonFile(STATE_FILE, { lastRequestAt: toIsoString(now) });
  return 0;
}
