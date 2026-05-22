// Mock the ensure-trading-window module to prevent execution of the main function
jest.mock("./ensure-trading-window", () => {
  // Return a mock module with some sample exports to verify re-export works
  return {
    __esModule: true,
    // Add a mock function to test that exports are properly re-exported
    mockFunction: jest.fn(),
  };
});

describe("guards/index", () => {
  describe("exports", () => {
    it("should properly re-export from ensure-trading-window", async () => {
      // Use dynamic import to avoid executing the main function
      const guardsModule: any = await import("./index");

      // Verify that the export is a valid module
      expect(guardsModule).toBeDefined();
      expect(typeof guardsModule).toBe("object");

      // Should have the mocked export from the ensure-trading-window module
      expect(guardsModule['mockFunction']).toBeDefined();
      expect(typeof guardsModule['mockFunction']).toBe("function");
    });

    it("should have expected exports", async () => {
      // Use dynamic import to avoid executing the main function
      const guardsModule: any = await import("./index");

      // Even though we don't know the specific exports of ensure-trading-window,
      // we can at least verify that the export object is present
      expect(guardsModule).toBeTruthy();
    });
  });
});