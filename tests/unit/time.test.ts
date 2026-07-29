/**
 * Unit tests for src/lib/time.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import {
  IST_ZONE,
  MARKET_OPEN_HOUR,
  MARKET_CLOSE_HOUR,
  isTradingDay,
  tradingWindowBounds,
  formatQueryDate,
  toIsoHour,
  formatDisplayTime,
  interpretProfitIndicator,
  parseAnnouncementDate,
  toIsoDate
} from "../../src/lib/time";

describe("isTradingDay", () => {
  it("returns true for Monday through Friday", () => {
    // 2026-07-27 is a Monday
    const monday = DateTime.fromISO("2026-07-27T10:00:00", { zone: IST_ZONE });
    const friday = DateTime.fromISO("2026-07-31T10:00:00", { zone: IST_ZONE });
    assert.equal(isTradingDay(monday), true);
    assert.equal(isTradingDay(friday), true);
  });

  it("returns false for Saturday and Sunday", () => {
    const saturday = DateTime.fromISO("2026-08-01T10:00:00", { zone: IST_ZONE });
    const sunday = DateTime.fromISO("2026-08-02T10:00:00", { zone: IST_ZONE });
    assert.equal(isTradingDay(saturday), false);
    assert.equal(isTradingDay(sunday), false);
  });
});

describe("tradingWindowBounds", () => {
  it("sets open and close to configured market hours on the same day", () => {
    const base = DateTime.fromISO("2026-07-29T12:00:00", { zone: IST_ZONE });
    const { open, close } = tradingWindowBounds(base);
    assert.equal(open.hour, MARKET_OPEN_HOUR);
    assert.equal(open.minute, 0);
    assert.equal(close.hour, MARKET_CLOSE_HOUR);
    assert.equal(close.minute, 0);
    assert.equal(toIsoDate(open), "2026-07-29");
    assert.equal(toIsoDate(close), "2026-07-29");
  });
});

describe("formatQueryDate", () => {
  it("formats as yyyyLLdd for BSE query params", () => {
    const dt = DateTime.fromISO("2026-07-29T09:30:00", { zone: IST_ZONE });
    assert.equal(formatQueryDate(dt), "20260729");
  });
});

describe("toIsoHour", () => {
  it("buckets an ISO timestamp to yyyy-LL-dd'T'HH in IST", () => {
    const result = toIsoHour("2026-07-29T15:37:00+05:30");
    assert.equal(result, "2026-07-29T15");
  });

  it("falls back gracefully for invalid input", () => {
    const result = toIsoHour("not-a-date");
    assert.match(result, /^\d{4}-\d{2}-\d{2}T\d{2}$/);
  });
});

describe("formatDisplayTime", () => {
  it("renders a human-readable IST label", () => {
    const label = formatDisplayTime("2026-07-29T09:38:00+05:30");
    assert.match(label, /29 Jul 2026/);
    assert.match(label, /09:38/);
  });
});

describe("parseAnnouncementDate", () => {
  it("parses common BSE date formats", () => {
    const iso = parseAnnouncementDate(["29 Jul 2026 09:38:00"]);
    assert.ok(iso.includes("2026-07-29"));
  });

  it("skips empty values and uses the first valid one", () => {
    const iso = parseAnnouncementDate([null, "", "2026-07-29T10:52:00+05:30"]);
    assert.ok(iso.includes("2026-07-29"));
  });
});

describe("interpretProfitIndicator", () => {
  it("flags order/win language as Likely Positive", () => {
    assert.equal(
      interpretProfitIndicator("L&T Wins Major Order from Kuwait Oil Company"),
      "Likely Positive"
    );
    assert.equal(
      interpretProfitIndicator("Company has secured a new work order"),
      "Likely Positive"
    );
  });

  it("flags cancel/loss language as Review Manually", () => {
    assert.equal(
      interpretProfitIndicator("Order cancelled due to penalty"),
      "Review Manually"
    );
  });

  it("returns Neutral for unrelated headlines", () => {
    assert.equal(
      interpretProfitIndicator("Board meeting scheduled for next week"),
      "Neutral"
    );
  });
});
