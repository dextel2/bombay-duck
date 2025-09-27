import { readFile, writeFile } from "fs/promises";
import path from "path";
import Mustache from "mustache";
import { readJsonFile } from "./lib/io";
import { currentTradingDate, formatDisplayTime, interpretProfitIndicator } from "./lib/time";
import { IntradayState, RenderContext, RenderRow } from "./types";

const MARKER_START = "<!-- snapshot:start -->";
const MARKER_END = "<!-- snapshot:end -->";
const TEMPLATE_PATH = path.join("templates", "awards.md.mustache");

function sanitize(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function buildRows(state: IntradayState): RenderRow[] {
  const entries = Object.entries(state.buckets ?? {});
  entries.sort(([a], [b]) => (a > b ? -1 : 1));

  const rows: RenderRow[] = [];

  for (const [hourKey, announcements] of entries) {
    const sorted = [...announcements].sort((a, b) => (a.announcedAt > b.announcedAt ? -1 : 1));
    for (const announcement of sorted) {
      rows.push({
        hourLabel: hourKey.replace("T", " ") + ":00",
        company: sanitize(announcement.shortName),
        code: String(announcement.scripCode),
        headline: sanitize(announcement.headline || ""),
        url: announcement.url,
        announcedAtLabel: formatDisplayTime(announcement.announcedAt),
        profitIndicator: interpretProfitIndicator(announcement.headline || "")
      });
    }
  }

  return rows;
}

async function loadTemplate(): Promise<string> {
  return readFile(TEMPLATE_PATH, "utf8");
}

async function loadState(tradingDate: string): Promise<IntradayState | null> {
  const pathToState = path.join("data", `${tradingDate}.json`);
  return readJsonFile<IntradayState>(pathToState);
}

function buildContext(tradingDate: string, state: IntradayState | null): RenderContext {
  if (!state) {
    return {
      tradingDate,
      tradingDateDisplay: tradingDate,
      hasAnnouncements: false,
      announcementCount: 0,
      requestCount: 0,
      retryCount: 0,
      lastUpdatedDisplay: "Not yet updated",
      stateFileName: `${tradingDate}.json`,
      rows: []
    };
  }

  const rows = buildRows(state);
  return {
    tradingDate,
    tradingDateDisplay: tradingDate,
    hasAnnouncements: rows.length > 0,
    announcementCount: state.meta.totalAnnouncements,
    requestCount: state.meta.requestCount,
    retryCount: state.meta.retryCount,
    lastUpdatedDisplay: formatDisplayTime(state.meta.lastUpdated),
    stateFileName: `${tradingDate}.json`,
    rows
  };
}

function injectIntoReadme(readme: string, rendered: string): string {
  const start = readme.indexOf(MARKER_START);
  const end = readme.indexOf(MARKER_END);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("README markers <!-- snapshot:start --> and <!-- snapshot:end --> are required.");
  }

  const before = readme.slice(0, start + MARKER_START.length);
  const after = readme.slice(end);
  const content = `\n\n${rendered.trim()}\n\n`;
  return `${before}${content}${after}`;
}

async function main(): Promise<void> {
  const tradingDate = currentTradingDate();
  const state = await loadState(tradingDate);
  const template = await loadTemplate();
  const context = buildContext(tradingDate, state);
  const rendered = Mustache.render(template, context, {}, { escape: (value) => String(value) });

  const readmePath = path.join("README.md");
  const readme = await readFile(readmePath, "utf8");
  const updated = injectIntoReadme(readme, rendered);
  await writeFile(readmePath, updated, "utf8");

  console.log(`Rendered README snapshot for ${tradingDate}. rows=${context.rows.length}`);
}

main().catch((error) => {
  console.error("Failed to render README:", error);
  process.exitCode = 1;
});
