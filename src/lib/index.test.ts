import { 
  // Import everything to make sure the index file exports work
  createChecksum,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  appendFile,
  enforceRateLimit,
  IST_ZONE,
  MARKET_OPEN_HOUR,
  MARKET_CLOSE_HOUR,
  toIsoDate,
  nowInIST,
  formatQueryDate,
  currentTradingDate,
  toIsoHour,
  formatDisplayTime,
  tradingWindowBounds,
  isTradingDay,
  parseAnnouncementDate,
  interpretProfitIndicator,
  toIsoString,
  toIsoDateString
} from "./index";

// Simple tests to validate that exports exist from the index
describe("Library Index Exports", () => {
  it("should export createChecksum function", () => {
    expect(createChecksum).toBeDefined();
    expect(typeof createChecksum).toBe("function");
  });

  it("should export all IO functions", () => {
    expect(ensureDir).toBeDefined();
    expect(readJsonFile).toBeDefined();
    expect(writeJsonFile).toBeDefined();
    expect(appendFile).toBeDefined();
  });

  it("should export enforceRateLimit function", () => {
    expect(enforceRateLimit).toBeDefined();
    expect(typeof enforceRateLimit).toBe("function");
  });

  it("should export IST_ZONE constant", () => {
    expect(IST_ZONE).toBe("Asia/Kolkata");
  });

  it("should export market hour constants", () => {
    expect(MARKET_OPEN_HOUR).toBe(9);
    expect(MARKET_CLOSE_HOUR).toBe(15);
  });

  it("should export all time functions", () => {
    expect(toIsoDate).toBeDefined();
    expect(nowInIST).toBeDefined();
    expect(formatQueryDate).toBeDefined();
    expect(currentTradingDate).toBeDefined();
    expect(toIsoHour).toBeDefined();
    expect(formatDisplayTime).toBeDefined();
    expect(tradingWindowBounds).toBeDefined();
    expect(isTradingDay).toBeDefined();
    expect(parseAnnouncementDate).toBeDefined();
    expect(interpretProfitIndicator).toBeDefined();
    expect(toIsoString).toBeDefined();
    expect(toIsoDateString).toBeDefined();
  });
});