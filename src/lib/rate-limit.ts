/**
 * On-disk rate limiter and cool-off tracker to ensure API calls respect BSE
 * throttling rules across workflow retries and runs.
 */
import { setTimeout as delay } from "timers/promises";
import path from "path";
import { DateTime } from "luxon";
import { ensureDir, readJsonFile, writeJsonFile } from "@/lib/io";
import { IST_ZONE, toIsoString } from "@/lib/time";

interface RateLimitState {
  lastRequestAt: string;
  /** ISO timestamp until which fetches should be skipped after repeated failures. */
  coolOffUntil?: string;
  /** Consecutive hard failures across runs; reset on success. */
  consecutiveFailures?: number;
}

const DEFAULT_MIN_GAP_MS = 60_000; // 1 minute
const STATE_FILE = path.join("data", ".rate-limit.json");

function parseEnvInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

function parseLastRequestTime(isoString?: string): DateTime | null {
  if (!isoString) return null;
  const dt = DateTime.fromISO(isoString, { zone: IST_ZONE });
  return dt.isValid ? dt : null;
}

/**
 * Ensures a minimum gap between API calls across workflow runs.
 *
 * @param minGapMs - Minimum delay in milliseconds (default: 60 seconds).
 * @returns The number of milliseconds actually waited.
 */
export async function enforceRateLimit(minGapMs: number = DEFAULT_MIN_GAP_MS): Promise<number> {
  await ensureDir(path.dirname(STATE_FILE));

  const now = DateTime.now().setZone(IST_ZONE);
  const state = await readJsonFile<RateLimitState>(STATE_FILE);
  const lastRequest = parseLastRequestTime(state?.lastRequestAt);

  if (lastRequest) {
    const elapsedMs = now.diff(lastRequest).as("milliseconds");

    if (elapsedMs < minGapMs) {
      const waitMs = Math.ceil(minGapMs - elapsedMs);
      await delay(waitMs);
      return await updateRateLimitState(state, waitMs);
    }
  }

  return await updateRateLimitState(state, 0);
}

async function updateRateLimitState(
  previous: RateLimitState | null,
  waitedMs: number
): Promise<number> {
  const timestamp = toIsoString(DateTime.now().setZone(IST_ZONE));
  const next: RateLimitState = {
    lastRequestAt: timestamp,
    coolOffUntil: previous?.coolOffUntil,
    consecutiveFailures: previous?.consecutiveFailures ?? 0
  };
  await writeJsonFile(STATE_FILE, next);
  return waitedMs;
}

/**
 * Returns true when a cool-off window is currently active (after repeated failures).
 * When active, the fetch step should skip the network call and exit cleanly.
 */
export async function isCoolOffActive(): Promise<{ active: boolean; until: string | null; remainingMs: number }> {
  const state = await readJsonFile<RateLimitState>(STATE_FILE);
  const untilIso = state?.coolOffUntil;
  if (!untilIso) {
    return { active: false, until: null, remainingMs: 0 };
  }

  const until = DateTime.fromISO(untilIso, { zone: IST_ZONE });
  if (!until.isValid) {
    return { active: false, until: null, remainingMs: 0 };
  }

  const now = DateTime.now().setZone(IST_ZONE);
  const remainingMs = until.diff(now).as("milliseconds");

  if (remainingMs <= 0) {
    // Cool-off expired; clear it.
    await clearCoolOff();
    return { active: false, until: null, remainingMs: 0 };
  }

  return { active: true, until: untilIso, remainingMs: Math.ceil(remainingMs) };
}

/**
 * Record a successful fetch: reset consecutive failure counter and clear cool-off.
 */
export async function recordFetchSuccess(): Promise<void> {
  const state = (await readJsonFile<RateLimitState>(STATE_FILE)) ?? { lastRequestAt: "" };
  const next: RateLimitState = {
    lastRequestAt: state.lastRequestAt || toIsoString(DateTime.now().setZone(IST_ZONE)),
    consecutiveFailures: 0,
    coolOffUntil: undefined
  };
  await writeJsonFile(STATE_FILE, next);
}

/**
 * Record a hard failure. After `threshold` consecutive failures, enter a cool-off
 * window of `coolOffMinutes` (default from env COOL_OFF_MINUTES or 45).
 * Existing cool-off windows are preserved so repeated failures do not reset expiry.
 */
export async function recordFetchFailure(options?: {
  threshold?: number;
  coolOffMinutes?: number;
}): Promise<{ consecutiveFailures: number; coolOffStarted: boolean; coolOffUntil: string | null }> {
  const threshold = options?.threshold ?? parseEnvInt("FAILURE_THRESHOLD", 3);
  const coolOffMinutes = options?.coolOffMinutes ?? parseEnvInt("COOL_OFF_MINUTES", 45);

  const state = (await readJsonFile<RateLimitState>(STATE_FILE)) ?? {
    lastRequestAt: toIsoString(DateTime.now().setZone(IST_ZONE))
  };

  const consecutiveFailures = (state.consecutiveFailures ?? 0) + 1;
  let coolOffUntil: string | undefined = state.coolOffUntil;
  let coolOffStarted = false;

  // Only start a cool-off when threshold is reached and none is already active.
  // Preserving an existing window prevents expiry from being pushed forever.
  if (consecutiveFailures >= threshold && !state.coolOffUntil) {
    const until = DateTime.now().setZone(IST_ZONE).plus({ minutes: coolOffMinutes });
    coolOffUntil = toIsoString(until);
    coolOffStarted = true;
  }

  const next: RateLimitState = {
    lastRequestAt: state.lastRequestAt,
    consecutiveFailures,
    coolOffUntil
  };
  await writeJsonFile(STATE_FILE, next);

  return {
    consecutiveFailures,
    coolOffStarted,
    coolOffUntil: coolOffUntil ?? null
  };
}

async function clearCoolOff(): Promise<void> {
  const state = await readJsonFile<RateLimitState>(STATE_FILE);
  if (!state) return;
  const next: RateLimitState = {
    lastRequestAt: state.lastRequestAt,
    consecutiveFailures: state.consecutiveFailures,
    coolOffUntil: undefined
  };
  await writeJsonFile(STATE_FILE, next);
}
