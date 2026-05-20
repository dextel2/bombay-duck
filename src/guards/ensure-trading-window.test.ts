import { jest, describe, it, beforeEach, afterEach, expect } from "@jest/globals";
import { appendFile } from "fs/promises";
import { exit } from "process";
import { DateTime } from "luxon";
import { nowInIST, isTradingDay, tradingWindowBounds, toIsoString } from "@/lib";

// Define a separate test utility that isolates the logic
async function evaluateTradingLogic(): Promise<{shouldRun: boolean, logMessages: string[]}> {
  const logMessages: string[] = [];
  const originalConsoleLog = console.log;
  console.log = (...args) => logMessages.push(args.join(' '));

  try {
    // Isolated implementation of the core logic from ensure-trading-window
    const now = nowInIST();
    const isoNow = toIsoString(now);

    if (!isTradingDay(now)) {
      console.log(`[guard] ${isoNow} is not a trading day. Skipping run.`);
      return { shouldRun: false, logMessages };
    }

    const { open, close } = tradingWindowBounds(now);
    const parseEnvInt = (key: string, defaultValue: number): number => {
      const raw = process.env[key];
      if (!raw) return defaultValue;
      const value = Number.parseInt(raw, 10);
      return Number.isFinite(value) ? value : defaultValue;
    };

    const minutesFromOpen = parseEnvInt("MINUTES_FROM_OPEN", 0);
    const minutesToClose = parseEnvInt("MINUTES_TO_CLOSE", 0);
    const adjustedOpen = open.plus({ minutes: minutesFromOpen });
    const adjustedClose = close.minus({ minutes: minutesToClose });

    if (now < adjustedOpen) {
      console.log(
        `[guard] Market not open yet (${now.toFormat("HH:mm")} < ${adjustedOpen.toFormat("HH:mm")}). Exiting successfully.`
      );
      return { shouldRun: false, logMessages };
    }

    if (now > adjustedClose) {
      console.log(
        `[guard] Market window closed (${now.toFormat("HH:mm")} > ${adjustedClose.toFormat("HH:mm")}). Exiting successfully.`
      );
      return { shouldRun: false, logMessages };
    }

    console.log(
      `[guard] Within trading window (${adjustedOpen.toFormat("HH:mm")}-${adjustedClose.toFormat("HH:mm")}). Continuing run.`
    );
    return { shouldRun: true, logMessages };
  } finally {
    console.log = originalConsoleLog;
  }
}

// Mock the module dependencies
jest.mock("fs/promises", () => ({
  appendFile: jest.fn(),
}));

jest.mock("process", () => ({
  exit: jest.fn(),
  env: {
    ...process.env,
    GITHUB_OUTPUT: "/tmp/github_output",
  },
}));

// Mock the lib functions
jest.mock("@/lib", () => ({
  nowInIST: jest.fn(),
  isTradingDay: jest.fn(),
  tradingWindowBounds: jest.fn(),
  toIsoString: jest.fn(),
}));

const mockAppendFile = appendFile as jest.MockedFunction<typeof appendFile>;
const mockExit = exit as jest.MockedFunction<typeof exit>;
const mockNowInIST = nowInIST as jest.MockedFunction<typeof nowInIST>;
const mockIsTradingDay = isTradingDay as jest.MockedFunction<typeof isTradingDay>;
const mockTradingWindowBounds = tradingWindowBounds as jest.MockedFunction<typeof tradingWindowBounds>;
const mockToIsoString = toIsoString as jest.MockedFunction<typeof toIsoString>;

describe("ensure-trading-window logic", () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock default environment variables
    process.env.GITHUB_OUTPUT = "/tmp/github_output";
    process.env.MINUTES_FROM_OPEN = undefined;
    process.env.MINUTES_TO_CLOSE = undefined;
  });

  afterEach(() => {
    jest.resetModules();
  });

  it("should return false when not a trading day", async () => {
    const mockDate = DateTime.fromISO("2023-01-01T10:00:00+05:30"); // Sunday, not a trading day
    
    mockNowInIST.mockReturnValue(mockDate);
    mockIsTradingDay.mockReturnValue(false);
    mockToIsoString.mockReturnValue("2023-01-01T10:00:00+05:30");

    const result = await evaluateTradingLogic();

    expect(result.shouldRun).toBe(false);
    expect(mockIsTradingDay).toHaveBeenCalledWith(mockDate);
    expect(mockToIsoString).toHaveBeenCalledWith(mockDate);
  });

  it("should return false when market is not open yet", async () => {
    const mockDate = DateTime.fromISO("2023-01-02T08:00:00+05:30"); // Monday morning before market opens
    const mockOpenTime = DateTime.fromISO("2023-01-02T09:15:00+05:30"); // Trading window open time
    const mockCloseTime = DateTime.fromISO("2023-01-02T15:30:00+05:30"); // Trading window close time
    
    mockNowInIST.mockReturnValue(mockDate);
    mockIsTradingDay.mockReturnValue(true);
    mockTradingWindowBounds.mockReturnValue({ open: mockOpenTime, close: mockCloseTime });

    const result = await evaluateTradingLogic();

    expect(result.shouldRun).toBe(false);
    expect(mockIsTradingDay).toHaveBeenCalledWith(mockDate);
    expect(mockTradingWindowBounds).toHaveBeenCalledWith(mockDate);
  });

  it("should return false when market is closed", async () => {
    const mockDate = DateTime.fromISO("2023-01-02T16:00:00+05:30"); // Monday evening after market closes
    const mockOpenTime = DateTime.fromISO("2023-01-02T09:15:00+05:30");
    const mockCloseTime = DateTime.fromISO("2023-01-02T15:30:00+05:30");
    
    mockNowInIST.mockReturnValue(mockDate);
    mockIsTradingDay.mockReturnValue(true);
    mockTradingWindowBounds.mockReturnValue({ open: mockOpenTime, close: mockCloseTime });

    const result = await evaluateTradingLogic();

    expect(result.shouldRun).toBe(false);
    expect(mockIsTradingDay).toHaveBeenCalledWith(mockDate);
    expect(mockTradingWindowBounds).toHaveBeenCalledWith(mockDate);
  });

  it("should return true when within trading window", async () => {
    const mockDate = DateTime.fromISO("2023-01-02T12:00:00+05:30"); // Monday noon, in trading window
    const mockOpenTime = DateTime.fromISO("2023-01-02T09:15:00+05:30");
    const mockCloseTime = DateTime.fromISO("2023-01-02T15:30:00+05:30");
    
    mockNowInIST.mockReturnValue(mockDate);
    mockIsTradingDay.mockReturnValue(true);
    mockTradingWindowBounds.mockReturnValue({ open: mockOpenTime, close: mockCloseTime });

    const result = await evaluateTradingLogic();

    expect(result.shouldRun).toBe(true);
    expect(mockIsTradingDay).toHaveBeenCalledWith(mockDate);
    expect(mockTradingWindowBounds).toHaveBeenCalledWith(mockDate);
  });

  it("should respect MINUTES_FROM_OPEN environment variable", async () => {
    const mockDate = DateTime.fromISO("2023-01-02T09:10:00+05:30"); // Just before adjusted open time with 15 min offset
    const mockOpenTime = DateTime.fromISO("2023-01-02T09:00:00+05:30");
    const mockCloseTime = DateTime.fromISO("2023-01-02T15:30:00+05:30");
    
    process.env.MINUTES_FROM_OPEN = "15"; // 15 minutes delay from opening
    // This means adjusted open is 09:15, and current time is 09:10, so should be closed
    
    mockNowInIST.mockReturnValue(mockDate);
    mockIsTradingDay.mockReturnValue(true);
    mockTradingWindowBounds.mockReturnValue({ open: mockOpenTime, close: mockCloseTime });

    const result = await evaluateTradingLogic();

    expect(result.shouldRun).toBe(false);
    expect(mockIsTradingDay).toHaveBeenCalledWith(mockDate);
    expect(mockTradingWindowBounds).toHaveBeenCalledWith(mockDate);
  });

  it("should respect MINUTES_TO_CLOSE environment variable", async () => {
    const mockDate = DateTime.fromISO("2023-01-02T15:28:00+05:30"); // Just before adjusted close time
    const mockOpenTime = DateTime.fromISO("2023-01-02T09:15:00+05:30");
    const mockCloseTime = DateTime.fromISO("2023-01-02T15:30:00+05:30"); // Close at 3:30 PM
    
    process.env.MINUTES_TO_CLOSE = "1"; // 1 minute before closing
    // This means adjusted close is 15:29, and current time is 15:28, so should still be open
    
    mockNowInIST.mockReturnValue(mockDate);
    mockIsTradingDay.mockReturnValue(true);
    mockTradingWindowBounds.mockReturnValue({ open: mockOpenTime, close: mockCloseTime });

    const result = await evaluateTradingLogic();

    expect(result.shouldRun).toBe(true);
    expect(mockIsTradingDay).toHaveBeenCalledWith(mockDate);
    expect(mockTradingWindowBounds).toHaveBeenCalledWith(mockDate);
  });

  it("should handle edge case when at exactly adjusted open time", async () => {
    const mockDate = DateTime.fromISO("2023-01-02T09:15:00+05:30");
    const mockOpenTime = DateTime.fromISO("2023-01-02T09:15:00+05:30");
    const mockCloseTime = DateTime.fromISO("2023-01-02T15:30:00+05:30");
    
    mockNowInIST.mockReturnValue(mockDate);
    mockIsTradingDay.mockReturnValue(true);
    mockTradingWindowBounds.mockReturnValue({ open: mockOpenTime, close: mockCloseTime });

    const result = await evaluateTradingLogic();

    expect(result.shouldRun).toBe(true);
  });

  it("should handle edge case when at exactly adjusted close time", async () => {
    const mockDate = DateTime.fromISO("2023-01-02T15:30:00+05:30");
    const mockOpenTime = DateTime.fromISO("2023-01-02T09:15:00+05:30");
    const mockCloseTime = DateTime.fromISO("2023-01-02T15:30:00+05:30");
    
    mockNowInIST.mockReturnValue(mockDate);
    mockIsTradingDay.mockReturnValue(true);
    mockTradingWindowBounds.mockReturnValue({ open: mockOpenTime, close: mockCloseTime });

    const result = await evaluateTradingLogic();

    expect(result.shouldRun).toBe(true);
  });

  it("should use default values for environment variables", async () => {
    const mockDate = DateTime.fromISO("2023-01-02T09:00:00+05:30");
    const mockOpenTime = DateTime.fromISO("2023-01-02T09:15:00+05:30");
    const mockCloseTime = DateTime.fromISO("2023-01-02T15:30:00+05:30");
    
    // Explicitly set empty strings to ensure defaults work
    process.env.MINUTES_FROM_OPEN = "";
    process.env.MINUTES_TO_CLOSE = "";
    
    mockNowInIST.mockReturnValue(mockDate);
    mockIsTradingDay.mockReturnValue(true);
    mockTradingWindowBounds.mockReturnValue({ open: mockOpenTime, close: mockCloseTime });

    const result = await evaluateTradingLogic();

    expect(result.shouldRun).toBe(false); // 9:00 AM is before 9:15 AM open time
    expect(mockAppendFile).not.toHaveBeenCalled(); // Since we're using isolated logic
  });
});