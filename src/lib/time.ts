import { DateTime } from "luxon";

export const IST_ZONE = "Asia/Kolkata";
export const MARKET_OPEN_HOUR = 9;
export const MARKET_CLOSE_HOUR = 15;

function toIso(dateTime: DateTime): string {
  return dateTime.toISO() ?? dateTime.toJSDate().toISOString();
}

function toIsoDate(dateTime: DateTime): string {
  return dateTime.toISODate() ?? dateTime.toFormat("yyyy-LL-dd");
}

export function nowInIST(): DateTime {
  return DateTime.now().setZone(IST_ZONE, { keepLocalTime: false });
}

export function formatQueryDate(dateTime: DateTime = nowInIST()): string {
  return dateTime.toFormat("yyyyLLdd");
}

export function currentTradingDate(): string {
  return toIsoDate(nowInIST());
}

export function toIsoHour(isoTimestamp: string): string {
  const dt = DateTime.fromISO(isoTimestamp, { zone: IST_ZONE });
  if (!dt.isValid) {
    return nowInIST().toFormat("yyyy-LL-dd'T'HH");
  }
  return dt.setZone(IST_ZONE).toFormat("yyyy-LL-dd'T'HH");
}

export function formatDisplayTime(isoTimestamp: string): string {
  const dt = DateTime.fromISO(isoTimestamp, { zone: IST_ZONE });
  if (!dt.isValid) {
    return isoTimestamp;
  }
  return dt.setZone(IST_ZONE).toFormat("dd MMM yyyy • HH:mm");
}

export function tradingWindowBounds(base: DateTime = nowInIST()): { open: DateTime; close: DateTime } {
  const open = base.set({ hour: MARKET_OPEN_HOUR, minute: 0, second: 0, millisecond: 0 });
  const close = base.set({ hour: MARKET_CLOSE_HOUR, minute: 0, second: 0, millisecond: 0 });
  return { open, close };
}

export function isTradingDay(dateTime: DateTime = nowInIST()): boolean {
  const weekday = dateTime.weekday; // 1 = Monday ... 7 = Sunday
  return weekday >= 1 && weekday <= 5;
}

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
    return "🚀 Likely Positive";
  }

  if (negativeKeywords.some((keyword) => normalized.includes(keyword))) {
    return "⚠️ Review Manually";
  }

  return "ℹ️ Neutral";
}

export function toIsoString(dateTime: DateTime): string {
  return toIso(dateTime);
}

export function toIsoDateString(dateTime: DateTime): string {
  return toIsoDate(dateTime);
}
