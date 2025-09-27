/**
 * Helpers for computing deterministic hashes used to detect content changes.
 */
import { createHash } from "crypto";

/**
 * Build a SHA-256 checksum from a list of string values.
 *
 * @param values Ordered or unordered values to hash.
 * @returns Hex encoded checksum that can be compared between runs.
 */
export function createChecksum(values: string[]): string {
  const hash = createHash("sha256");
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .sort()
    .forEach((value) => hash.update(value));
  return hash.digest("hex");
}
