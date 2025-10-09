/**
 * Time and date helpers scoped to the Bombay Duck automation.
 *
 * All functions in this module assume the Indian Standard Time (IST) zone so
 * GitHub Action runs match the BSE trading window.
 */
import { DateTime } from "luxon";

/** Indian Standard Time zone identifier. */
export const IST_ZONE = "Asia/Kolkata";
/** Hour (24h) at which BSE trading officially opens. */
export const MARKET_OPEN_HOUR = 9;
/** Hour (24h) at which BSE trading officially closes. */
export const MARKET_CLOSE_HOUR = 15;

/**
 * Convert a Luxon {@link DateTime} to an ISO string, falling back to the native
 * Date representation when Luxon returns `null`.
 */
function toIso(dateTime: DateTime): string {
  return dateTime.toISO() ?? dateTime.toJSDate().toISOString();
}

/**
 * Convert a {@link DateTime} to an ISO date (YYYY-MM-DD). When Luxon cannot
 * produce a value, fall back to a formatted string.
 */
export function toIsoDate(dateTime: DateTime): string {
  return dateTime.toISODate() ?? dateTime.toFormat("yyyy-LL-dd");
}

/**
 * Return the current moment in IST.
 */
export function nowInIST(): DateTime {
  return DateTime.now().setZone(IST_ZONE, { keepLocalTime: false });
}

/**
 * Format a {@link DateTime} for use with the BSE query parameters. Defaults to
 * "today" in IST.
 */
export function formatQueryDate(dateTime: DateTime = nowInIST()): string {
  return dateTime.toFormat("yyyyLLdd");
}

/**
 * Return today's trading date (YYYY-MM-DD) in IST.
 */
export function currentTradingDate(): string {
  return toIsoDate(nowInIST());
}

/**
 * Convert an ISO timestamp to the hour bucket used by the intraday state file.
 */
export function toIsoHour(isoTimestamp: string): string {
  const dt = DateTime.fromISO(isoTimestamp, { zone: IST_ZONE });
  if (!dt.isValid) {
    return nowInIST().toFormat("yyyy-LL-dd'T'HH");
  }
  return dt.setZone(IST_ZONE).toFormat("yyyy-LL-dd'T'HH");
}

/**
 * Render an ISO timestamp as a human-readable label in IST.
 */
export function formatDisplayTime(isoTimestamp: string): string {
  const dt = DateTime.fromISO(isoTimestamp, { zone: IST_ZONE });
  if (!dt.isValid) {
    return isoTimestamp;
  }
  return dt.setZone(IST_ZONE).toFormat("dd MMM yyyy - HH:mm");
}

/**
 * Produce the open/close bounds for the trading window relative to a base
 * moment (defaults to "now").
 */
export function tradingWindowBounds(base: DateTime = nowInIST()): { open: DateTime; close: DateTime } {
  const open = base.set({ hour: MARKET_OPEN_HOUR, minute: 0, second: 0, millisecond: 0 });
  const close = base.set({ hour: MARKET_CLOSE_HOUR, minute: 0, second: 0, millisecond: 0 });
  return { open, close };
}

/**
 * Determine whether the provided moment (defaults to now) falls on a weekday.
 */
export function isTradingDay(dateTime: DateTime = nowInIST()): boolean {
  const weekday = dateTime.weekday; // 1 = Monday ... 7 = Sunday
  return weekday >= 1 && weekday <= 5;
}

/**
 * Interpret multiple date strings emitted by the BSE API and return a normalised
 * ISO timestamp in IST.
 */
export function parseAnnouncementDate(rawValues: Array<string | null | undefined>): string {
  for (const raw of rawValues) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const isoCandidate = DateTime.fromISO(trimmed, { zone: IST_ZONE });
    if (isoCandidate.isValid) {
      return toIso(isoCandidate.setZone(IST_ZONE));
    }

    const formats = [
      "dd MMM yyyy HH:mm:ss",
      "dd MMM yyyy HH:mm",
      "dd/MM/yyyy HH:mm",
      "dd-MM-yyyy HH:mm",
      "MM/dd/yyyy HH:mm",
      "yyyy-MM-dd HH:mm:ss",
      "yyyy-MM-dd HH:mm"
    ];

    for (const format of formats) {
      const parsed = DateTime.fromFormat(trimmed, format, { zone: IST_ZONE });
      if (parsed.isValid) {
        return toIso(parsed);
      }
    }
  }

  return toIso(nowInIST());
}

/**
 * Infer a lightweight sentiment indicator from an announcement headline. The
 * result is deliberately simple and should be treated as a hint rather than a
 * trading signal.
 */
export function interpretProfitIndicator(headline: string): string {
  const normalized = headline.toLowerCase();
  const positiveKeywords = [
    "order",
    "contract",
    "wins",
    "secured",
    "awarded",
    "receipt",
    "bagged",
    "deal",
    "profit"
  ];

  const negativeKeywords = [
    "cancel",
    "loss",
    "decline",
    "terminate",
    "penalty"
  ];

  if (positiveKeywords.some((keyword) => normalized.includes(keyword))) {
    return "Likely Positive";
  }

  if (negativeKeywords.some((keyword) => normalized.includes(keyword))) {
    return "Review Manually";
  }

  return "Neutral";
}

/** Convert a {@link DateTime} to an ISO string. */
export function toIsoString(dateTime: DateTime): string {
  return toIso(dateTime);
}

/** Convert a {@link DateTime} to an ISO date string (YYYY-MM-DD). */
export function toIsoDateString(dateTime: DateTime): string {
  return toIsoDate(dateTime);
}

