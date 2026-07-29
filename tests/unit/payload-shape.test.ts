/**
 * Unit tests for BSE payload shape expectations used by the fetch pipeline.
 * Mirrors the lightweight contract checks described in #30 / #31.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { BseApiResponse } from "../../src/types";

const FIXTURES = path.join(__dirname, "..", "fixtures");

function loadFixture(name: string): unknown {
  const raw = readFileSync(path.join(FIXTURES, name), "utf8");
  return JSON.parse(raw);
}

/**
 * Same structural rules as assertPayloadShape in fetch-bse-awards (kept local
 * so tests do not depend on the resilience branch being merged yet).
 */
function assertPayloadShape(payload: unknown): asserts payload is BseApiResponse {
  if (payload === null || typeof payload !== "object") {
    throw new Error("BSE API response is not an object — possible contract change.");
  }

  const candidate = payload as BseApiResponse;

  if (candidate.Table !== undefined && !Array.isArray(candidate.Table)) {
    throw new Error(
      "BSE API response.Table is present but not an array — possible contract change."
    );
  }

  if (Array.isArray(candidate.Table) && candidate.Table.length > 0) {
    const sample = candidate.Table[0] as Record<string, unknown>;
    for (const key of ["NEWSID", "SCRIP_CD"]) {
      if (!(key in sample)) {
        throw new Error(
          `BSE API announcement is missing required field "${key}" — possible contract change.`
        );
      }
    }
  }
}

describe("BSE payload shape", () => {
  it("accepts a quiet-day payload with empty Table", () => {
    const payload = loadFixture("bse-sample-quiet.json");
    assert.doesNotThrow(() => assertPayloadShape(payload));
    const typed = payload as BseApiResponse;
    assert.ok(Array.isArray(typed.Table));
    assert.equal(typed.Table?.length, 0);
  });

  it("accepts a normal awards payload with required fields", () => {
    const payload = loadFixture("bse-sample-awards.json");
    assert.doesNotThrow(() => assertPayloadShape(payload));
    const typed = payload as BseApiResponse;
    assert.equal(typed.Table?.length, 2);
    assert.equal(typed.Table?.[0].NEWSID, "test-news-001");
    assert.equal(typed.Table?.[0].SCRIP_CD, 500510);
  });

  it("rejects a malformed payload where Table is not an array", () => {
    const payload = loadFixture("bse-sample-malformed.json");
    assert.throws(
      () => assertPayloadShape(payload),
      /Table is present but not an array/
    );
  });

  it("rejects non-object payloads", () => {
    assert.throws(() => assertPayloadShape(null), /not an object/);
    assert.throws(() => assertPayloadShape("string"), /not an object/);
  });
});
