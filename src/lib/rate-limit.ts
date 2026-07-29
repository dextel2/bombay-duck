/**
 * On-disk rate limiter and cool-off tracker to ensure API calls respect BSE
 * throttling rules across workflow runs.
 */
import { setTimeout as delay } from "timers/promises";
import path from "path";
import { DateTime } from "luxon";
import { ensureDir, readJsonFile, writeJsonFile } from "@/lib/io";
import { IST_ZONE, toIsoString } from "@/lib/time";

interface RateLimitState {
  lastRequestAt: string;
  consecutiveFailures?: number;
  coolOffUntil?: string | null;
}

const DEFAULT_MIN_GAP_MS = 60_000; // 1 minute
const DEFAULT_COOL_OFF_MS = 30 * 60_000; // 30 minutes
const DEFAULT_FAILURE_THRESHOLD = 3;
const STATE_FILE = path.join("data", ".rate-limit.json");

function parseEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseIso(isoString?: string | null): DateTime | null {
  if (!isoString) return null;
  const dt = DateTime.fromISO(isoString, { zone: IST_ZONE });
  return dt.isValid ? dt : null;
}

async function loadState(): Promise<RateLimitState> {
  await ensureDir(path.dirname(STATE_FILE));
  const state = await readJsonFile<RateLimitState>(STATE_FILE);
  return state ?? { lastRequestAt: "" };
}

async function saveState(state: RateLimitState): Promise<void> {
  await writeJsonFile(STATE_FILE, state);
}

/**
 * Ensures a minimum gap between API calls across workflow runs.
 *
 * @param minGapMs - Minimum delay in milliseconds (default: 60 seconds).
 * @returns The number of milliseconds actually waited.
 */
export async function enforceRateLimit(minGapMs: number = DEFAULT_MIN_GAP_MS): Promise<number> {
  const now = DateTime.now().setZone(IST_ZONE);
  const state = await loadState();
  const lastRequest = parseIso(state.lastRequestAt);

  let waitedMs = 0;

  if (lastRequest) {
    const elapsedMs = now.diff(lastRequest).as("milliseconds");
    if (elapsedMs < minGapMs) {
      waitedMs = Math.ceil(minGapMs - elapsedMs);
      await delay(waitedMs);
    }
  }

  state.lastRequestAt = toIsoString(DateTime.now().setZone(IST_ZONE));
  await saveState(state);
  return waitedMs;
}

/**
 * Returns remaining cool-off milliseconds if a cool-off is active, otherwise 0.
 */
export async function getCoolOffRemainingMs(): Promise<number> {
  const state = await loadState();
  const coolOffUntil = parseIso(state.coolOffUntil);
  if (!coolOffUntil) return 0;

  const now = DateTime.now().setZone(IST_ZONE);
  const remaining = coolOffUntil.diff(now).as("milliseconds");
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

/**
 * Record a successful fetch – resets consecutive failure count and clears cool-off.
 */
export async function recordSuccess(): Promise<void> {
  const state = await loadState();
  state.consecutiveFailures = 0;
  state.coolOffUntil = null;
  await saveState(state);
}

/**
 * Record a failed fetch. After the configured threshold is reached, starts a cool-off window.
 *
 * @returns Object describing whether cool-off was activated and its duration.
 */
export async function recordFailure(): Promise<{ coolOffActivated: boolean; coolOffMs: number; consecutiveFailures: number }> {
  const state = await loadState();
  const failures = (state.consecutiveFailures ?? 0) + 1;
  state.consecutiveFailures = failures;

  const threshold = parseEnvInt("FAILURE_THRESHOLD", DEFAULT_FAILURE_THRESHOLD);
  const coolOffMs = parseEnvInt("COOL_OFF_MS", DEFAULT_COOL_OFF_MS);

  let coolOffActivated = false;
  if (failures >= threshold) {
    const until = DateTime.now().setZone(IST_ZONE).plus({ milliseconds: coolOffMs });
    state.coolOffUntil = toIsoString(until);
    coolOffActivated = true;
  }

  await saveState(state);
  return { coolOffActivated, coolOffMs, consecutiveFailures: failures };
}
