/**
 * Utility for computing deterministic SHA-256 checksums
 * to detect content changes.
 */
import { createHash } from "crypto";

/**
 * Generates a SHA-256 checksum from a list of string values.
 *
 * @param values - An array of strings (order-insensitive).
 * @returns A hex-encoded SHA-256 checksum.
 */
export function createChecksum(values: string[]): string {
  const normalizedValues = values
    .map((v) => v.trim())   // Remove extra spaces
    .filter((v) => v.length > 0) // Drop empty strings
    .sort();                // Ensure consistent ordering

  const hash = createHash("sha256");
  for (const value of normalizedValues) {
    hash.update(value);
  }

  return hash.digest("hex");
}
