import { createHash } from "crypto";

export function createChecksum(values: string[]): string {
  const hash = createHash("sha256");
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .sort()
    .forEach((value) => hash.update(value));
  return hash.digest("hex");
}
