/**
 * Guard script executed before the main workflow to decide whether the market
 * is open. It writes a `should_run` output for downstream steps.
 */
import { appendFile } from "fs/promises";
import { exit } from "process";
import { nowInIST, isTradingDay, tradingWindowBounds, toIsoString } from "@/lib";

/** Append a key/value pair to the GitHub Actions output file. */
async function setOutput(key: string, value: string): Promise<void> {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  await appendFile(outputFile, `${key}=${value}\n`);
}

/** Read an integer from the environment, falling back to a default value. */
function parseEnvInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : defaultValue;
}

/**
 * Entry point for the guard script. Emits `should_run` and exits with code 0
 * even when the trading window is closed.
 */
async function main(): Promise<void> {
  const now = nowInIST();
  const isoNow = toIsoString(now);

  if (!isTradingDay(now)) {
    console.log(`[guard] ${isoNow} is not a trading day. Skipping run.`);
    await setOutput("should_run", "false");
    exit(0);
  }

  const { open, close } = tradingWindowBounds(now);
  const minutesFromOpen = parseEnvInt("MINUTES_FROM_OPEN", 0);
  const minutesToClose = parseEnvInt("MINUTES_TO_CLOSE", 0);
  const adjustedOpen = open.plus({ minutes: minutesFromOpen });
  const adjustedClose = close.minus({ minutes: minutesToClose });

  if (now < adjustedOpen) {
    console.log(
      `[guard] Market not open yet (${now.toFormat("HH:mm")} < ${adjustedOpen.toFormat("HH:mm")}). Exiting successfully.`
    );
    await setOutput("should_run", "false");
    exit(0);
  }

  if (now > adjustedClose) {
    console.log(
      `[guard] Market window closed (${now.toFormat("HH:mm")} > ${adjustedClose.toFormat("HH:mm")}). Exiting successfully.`
    );
    await setOutput("should_run", "false");
    exit(0);
  }

  console.log(
    `[guard] Within trading window (${adjustedOpen.toFormat("HH:mm")}-${adjustedClose.toFormat("HH:mm")}). Continuing run.`
  );
  await setOutput("should_run", "true");
}

main().catch((error) => {
  console.error("[guard] Failed to evaluate trading window:", error);
  exit(1);
});
