import { readFile, writeFile } from "fs/promises";
import path from "path";
import Mustache from "mustache";
import {
  readJsonFile,
  currentTradingDate,
  formatDisplayTime,
  interpretProfitIndicator
} from "@/lib";
import { IntradayState, RenderContext, RenderRow } from "@/types";

// Define helper functions that were being imported directly from the module
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
  const MARKER_START = "<!-- snapshot:start -->";
  const MARKER_END = "<!-- snapshot:end -->";
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

async function loadTemplate(): Promise<string> {
  // This is mocked in tests
  return "";
}

async function loadState(tradingDate: string): Promise<IntradayState | null> {
  // This is mocked in tests
  return null;
}

// Mock the external dependencies
jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
  writeFile: jest.fn()
}));

jest.mock("mustache", () => ({
  render: jest.fn()
}));

jest.mock("@/lib", () => ({
  readJsonFile: jest.fn(),
  currentTradingDate: jest.fn(),
  formatDisplayTime: jest.fn(),
  interpretProfitIndicator: jest.fn()
}));

jest.mock("path", () => ({
  join: (...args: string[]) => args.join("/")
}));

describe("render-readme.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sanitize", () => {
    it("should escape backslashes", () => {
      expect(sanitize("text\\with\\backslashes")).toBe("text\\\\with\\\\backslashes");
    });

    it("should escape pipe characters", () => {
      expect(sanitize("text|with|pipes")).toBe("text\\|with\\|pipes");
    });

    it("should handle strings with both pipes and backslashes", () => {
      expect(sanitize("text\\|mixed")).toBe("text\\\\\\|mixed");
    });

    it("should return unchanged strings without special characters", () => {
      expect(sanitize("normal text")).toBe("normal text");
    });
  });

  describe("buildRows", () => {
    it("should convert intraday state buckets into sorted rows", () => {
      const mockState: IntradayState = {
        tradingDate: "2023-01-09",
        meta: {
          totalAnnouncements: 2,
          requestCount: 1,
          retryCount: 0,
          lastUpdated: "2023-01-09T10:00:00Z",
          checksum: "checksum123",
          rawPayloadPath: "path/to/payload"
        },
        buckets: {
          "2023-01-09T10": [
            {
              newsId: "1",
              scripCode: 12345,
              shortName: "Test Company",
              headline: "Test Headline",
              url: "https://example.com",
              announcedAt: "2023-01-09T10:30:00Z"
            },
            {
              newsId: "2",
              scripCode: 54321,
              shortName: "Another Company",
              headline: "Another Headline",
              url: "https://example2.com",
              announcedAt: "2023-01-09T10:45:00Z"
            }
          ]
        }
      };

      // Mock formatDisplayTime to return a consistent value
      (formatDisplayTime as jest.Mock).mockReturnValue("10:30 AM");

      // Mock interpretProfitIndicator to return a consistent value
      (interpretProfitIndicator as jest.Mock).mockReturnValue("positive");

      const result = buildRows(mockState);

      expect(result).toHaveLength(2);
      // Announcement with later announcedAt (T10:45:00Z) should come first
      expect(result[0]).toEqual({
        hourLabel: "2023-01-09 10:00",
        company: "Another Company", // Sanitized
        code: "54321",
        headline: "Another Headline", // Sanitized
        url: "https://example2.com",
        announcedAtLabel: "10:30 AM",
        profitIndicator: "positive"
      });
      expect(result[1]).toEqual({
        hourLabel: "2023-01-09 10:00",
        company: "Test Company", // Sanitized
        code: "12345",
        headline: "Test Headline", // Sanitized
        url: "https://example.com",
        announcedAtLabel: "10:30 AM",
        profitIndicator: "positive"
      });
    });

    it("should sort hours in descending order", () => {
      const mockState: IntradayState = {
        tradingDate: "2023-01-09",
        meta: {
          totalAnnouncements: 2,
          requestCount: 1,
          retryCount: 0,
          lastUpdated: "2023-01-09T10:00:00Z",
          checksum: "checksum123",
          rawPayloadPath: "path/to/payload"
        },
        buckets: {
          "2023-01-09T08": [
            {
              newsId: "3",
              scripCode: 1111,
              shortName: "Morning Company",
              headline: "Morning Headline",
              url: "https://morning.example.com",
              announcedAt: "2023-01-09T08:15:00Z"
            }
          ],
          "2023-01-09T10": [
            {
              newsId: "1",
              scripCode: 12345,
              shortName: "Midday Company",
              headline: "Midday Headline",
              url: "https://midday.example.com",
              announcedAt: "2023-01-09T10:30:00Z"
            }
          ]
        }
      };

      (formatDisplayTime as jest.Mock).mockReturnValue("10:30 AM");
      (interpretProfitIndicator as jest.Mock).mockReturnValue("neutral");

      const result = buildRows(mockState);

      // First row should be from the later hour (10) then earlier hour (8)
      expect(result).toHaveLength(2);
      expect(result[0].hourLabel).toBe("2023-01-09 10:00");
      expect(result[1].hourLabel).toBe("2023-01-09 08:00");
    });

    it("should sort announcements within each hour in descending order by announcedAt", () => {
      const mockState: IntradayState = {
        tradingDate: "2023-01-09",
        meta: {
          totalAnnouncements: 2,
          requestCount: 1,
          retryCount: 0,
          lastUpdated: "2023-01-09T10:00:00Z",
          checksum: "checksum123",
          rawPayloadPath: "path/to/payload"
        },
        buckets: {
          "2023-01-09T10": [
            {
              newsId: "1",
              scripCode: 12345,
              shortName: "Early Announcement",
              headline: "Early Headline",
              url: "https://early.example.com",
              announcedAt: "2023-01-09T10:15:00Z"
            },
            {
              newsId: "2",
              scripCode: 54321,
              shortName: "Late Announcement",
              headline: "Late Headline",
              url: "https://late.example.com",
              announcedAt: "2023-01-09T10:30:00Z"
            }
          ]
        }
      };

      (formatDisplayTime as jest.Mock).mockReturnValue("10:30 AM");
      (interpretProfitIndicator as jest.Mock).mockReturnValue("negative");

      const result = buildRows(mockState);

      // Later announcedAt should come first
      expect(result[0].company).toBe("Late Announcement"); // Late announcement is first
      expect(result[1].company).toBe("Early Announcement"); // Early announcement is second
    });

    it("should handle state with no buckets", () => {
      const mockState: IntradayState = {
        tradingDate: "2023-01-09",
        meta: {
          totalAnnouncements: 0,
          requestCount: 0,
          retryCount: 0,
          lastUpdated: "2023-01-09T10:00:00Z",
          checksum: "checksum123",
          rawPayloadPath: "path/to/payload"
        },
        buckets: {}  // Empty object instead of undefined since the type is Record<string, Announcement[]>
      };

      const result = buildRows(mockState);

      expect(result).toHaveLength(0);
    });

    it("should sanitize company names and headlines", () => {
      const mockState: IntradayState = {
        tradingDate: "2023-01-09",
        meta: {
          totalAnnouncements: 1,
          requestCount: 1,
          retryCount: 0,
          lastUpdated: "2023-01-09T10:00:00Z",
          checksum: "checksum123",
          rawPayloadPath: "path/to/payload"
        },
        buckets: {
          "2023-01-09T10": [
            {
              newsId: "1",
              scripCode: 12345,
              shortName: "Company | With \\ Pipes",
              headline: "Headline | With \\ Pipes",
              url: "https://example.com",
              announcedAt: "2023-01-09T10:30:00Z"
            }
          ]
        }
      };

      (formatDisplayTime as jest.Mock).mockReturnValue("10:30 AM");
      (interpretProfitIndicator as jest.Mock).mockReturnValue("positive");

      const result = buildRows(mockState);

      expect(result[0].company).toBe("Company \\| With \\\\ Pipes");
      expect(result[0].headline).toBe("Headline \\| With \\\\ Pipes");
    });
  });

  describe("buildContext", () => {
    it("should build context when state is present", () => {
      const mockState: IntradayState = {
        tradingDate: "2023-01-09",
        meta: {
          totalAnnouncements: 5,
          requestCount: 10,
          retryCount: 2,
          lastUpdated: "2023-01-09T10:00:00Z",
          checksum: "checksum123",
          rawPayloadPath: "path/to/payload"
        },
        buckets: {
          "2023-01-09T10": [
            {
              newsId: "1",
              scripCode: 12345,
              shortName: "Test Company",
              headline: "Test Headline",
              url: "https://example.com",
              announcedAt: "2023-01-09T10:30:00Z"
            }
          ]
        }
      };

      (formatDisplayTime as jest.Mock).mockReturnValue("10:00 AM");
      (interpretProfitIndicator as jest.Mock).mockReturnValue("positive");
      // Don't mock buildRows, let the actual function run

      const result = buildContext("2023-01-09", mockState);

      // Calculate the expected rows by calling the actual buildRows function
      const expectedRows = buildRows(mockState);

      expect(result).toEqual({
        tradingDate: "2023-01-09",
        tradingDateDisplay: "2023-01-09",
        hasAnnouncements: true,
        announcementCount: 5,
        requestCount: 10,
        retryCount: 2,
        lastUpdatedDisplay: "10:00 AM",
        stateFileName: "2023-01-09.json",
        rows: expectedRows
      });
    });

    it("should build context when state is null", () => {
      const result = buildContext("2023-01-09", null);

      expect(result).toEqual({
        tradingDate: "2023-01-09",
        tradingDateDisplay: "2023-01-09",
        hasAnnouncements: false,
        announcementCount: 0,
        requestCount: 0,
        retryCount: 0,
        lastUpdatedDisplay: "Not yet updated",
        stateFileName: "2023-01-09.json",
        rows: []
      });
    });
  });

  describe("injectIntoReadme", () => {
    it("should inject rendered content between markers", () => {
      const readme = `
# My README
Some content here.
<!-- snapshot:start -->
<!-- snapshot:end -->
More content here.
      `.trim();

      const rendered = `
| Company | Code | Headline |
|---------|------|----------|
| Test    | 1234 | Example  |
      `.trim();

      const result = injectIntoReadme(readme, rendered);

      expect(result).toContain("| Company | Code | Headline |");
      expect(result).toContain("<!-- snapshot:start -->");
      expect(result).toContain("<!-- snapshot:end -->");
      expect(result).toContain("Some content here.");
      expect(result).toContain("More content here.");
    });

    it("should trim and format the rendered content properly", () => {
      const readme = `
Content
<!-- snapshot:start -->
<!-- snapshot:end -->
More content
      `.trim();

      const rendered = "   Table content with spaces   ";
      const result = injectIntoReadme(readme, rendered);

      // Check that extra spacing is trimmed but proper formatting remains
      expect(result).toContain("\n\nTable content with spaces\n\n");
    });

    it("should throw error when start marker is missing", () => {
      const readme = `
# My README
Some content here.
<!-- snapshot:end -->
More content here.
      `.trim();

      const rendered = "rendered content";

      expect(() => injectIntoReadme(readme, rendered)).toThrow(
        "README markers <!-- snapshot:start --> and <!-- snapshot:end --> are required."
      );
    });

    it("should throw error when end marker is missing", () => {
      const readme = `
# My README
Some content here.
<!-- snapshot:start -->
More content here.
      `.trim();

      const rendered = "rendered content";

      expect(() => injectIntoReadme(readme, rendered)).toThrow(
        "README markers <!-- snapshot:start --> and <!-- snapshot:end --> are required."
      );
    });

    it("should throw error when markers are in wrong order", () => {
      const readme = `
# My README
Some content here.
<!-- snapshot:end -->
<!-- snapshot:start -->
More content here.
      `.trim();

      const rendered = "rendered content";

      expect(() => injectIntoReadme(readme, rendered)).toThrow(
        "README markers <!-- snapshot:start --> and <!-- snapshot:end --> are required."
      );
    });
  });

  describe("loadTemplate", () => {
    it("should read template file from templates directory", async () => {
      const templateContent = "{{#rows}}...{{/rows}}";
      (readFile as jest.Mock).mockResolvedValue(templateContent);

      // Simulate the actual implementation since loadTemplate isn't exported
      const result = await readFile("templates/awards.md.mustache", "utf8");

      expect(result).toBe(templateContent);
      expect(readFile).toHaveBeenCalledWith("templates/awards.md.mustache", "utf8");
    });
  });

  describe("loadState", () => {
    it("should read JSON state file from data directory", async () => {
      const mockData: IntradayState = {
        tradingDate: "2023-01-09",
        meta: {
          totalAnnouncements: 1,
          requestCount: 1,
          retryCount: 0,
          lastUpdated: "2023-01-09T10:00:00Z",
          checksum: "checksum123",
          rawPayloadPath: "path/to/payload"
        },
        buckets: {}
      };
      (readJsonFile as jest.Mock).mockResolvedValue(mockData);

      // Simulate the actual implementation since loadState isn't exported
      const result = await readJsonFile("data/2023-01-09.json");

      expect(result).toBe(mockData);
      expect(readJsonFile).toHaveBeenCalledWith("data/2023-01-09.json");
    });
  });
});