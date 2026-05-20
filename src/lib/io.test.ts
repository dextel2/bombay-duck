import { ensureDir, readJsonFile, writeJsonFile, appendFile } from "./io";
import { mkdir, readFile, writeFile, unlink, rmdir, access } from "fs/promises";
import path from "path";

// Mock temporary directory for tests
const TEST_DIR = path.join(__dirname, "__test_temp__");

describe("IO Utilities", () => {
  beforeEach(async () => {
    // Clean up test directory before each test
    try {
      await rmdir(TEST_DIR, { recursive: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test directory after each test
    try {
      await rmdir(TEST_DIR, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("ensureDir", () => {
    it("should create a directory if it doesn't exist", async () => {
      const dirPath = path.join(TEST_DIR, "new-dir");
      
      await expect(access(dirPath)).rejects.toThrow();
      
      await ensureDir(dirPath);
      
      await expect(access(dirPath)).resolves.not.toThrow();
    });

    it("should create nested directories recursively", async () => {
      const deepDirPath = path.join(TEST_DIR, "level1", "level2", "level3");
      
      await expect(access(deepDirPath)).rejects.toThrow();
      
      await ensureDir(deepDirPath);
      
      await expect(access(deepDirPath)).resolves.not.toThrow();
    });

    it("should not error if directory already exists", async () => {
      const dirPath = path.join(TEST_DIR, "existing-dir");
      await mkdir(dirPath, { recursive: true });
      
      await expect(ensureDir(dirPath)).resolves.not.toThrow();
    });
  });

  describe("readJsonFile", () => {
    it("should read and parse a valid JSON file", async () => {
      const filePath = path.join(TEST_DIR, "valid.json");
      const testData = { name: "Test Data", value: 42, items: [1, 2, 3] };
      
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(filePath, JSON.stringify(testData), "utf8");

      const result = await readJsonFile<{ name: string; value: number; items: number[] }>(filePath);
      
      expect(result).toEqual(testData);
    });

    it("should return null when file does not exist", async () => {
      const filePath = path.join(TEST_DIR, "nonexistent.json");
      
      const result = await readJsonFile(filePath);
      
      expect(result).toBeNull();
    });

    it("should throw error for invalid JSON", async () => {
      const filePath = path.join(TEST_DIR, "invalid.json");
      
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(filePath, "{ invalid json }", "utf8");

      await expect(readJsonFile(filePath)).rejects.toThrow(SyntaxError);
    });

    it("should handle empty JSON objects", async () => {
      const filePath = path.join(TEST_DIR, "empty.json");
      
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(filePath, "{}", "utf8");

      const result = await readJsonFile<Record<string, unknown>>(filePath);
      
      expect(result).toEqual({});
    });

    it("should handle arrays", async () => {
      const filePath = path.join(TEST_DIR, "array.json");
      const testArray = [1, "two", { three: 3 }];
      
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(filePath, JSON.stringify(testArray), "utf8");

      const result = await readJsonFile<(number | string | Record<string, number>)[]>(filePath);
      
      expect(result).toEqual(testArray);
    });
  });

  describe("writeJsonFile", () => {
    it("should write JSON data to a file", async () => {
      const filePath = path.join(TEST_DIR, "output.json");
      const testData = { message: "Hello, World!", count: 42 };

      await writeJsonFile(filePath, testData);

      const fileContent = await readFile(filePath, "utf8");
      const parsedData = JSON.parse(fileContent);

      expect(parsedData).toEqual(testData);
    });

    it("should create parent directories if they don't exist", async () => {
      const filePath = path.join(TEST_DIR, "deep", "nested", "output.json");
      const testData = { nested: true };

      await writeJsonFile(filePath, testData);

      const fileContent = await readFile(filePath, "utf8");
      const parsedData = JSON.parse(fileContent);

      expect(parsedData).toEqual(testData);
    });

    it("should format JSON with 2-space indentation", async () => {
      const filePath = path.join(TEST_DIR, "formatted.json");
      const testData = { a: 1, b: { c: 2 } };

      await writeJsonFile(filePath, testData);

      const fileContent = await readFile(filePath, "utf8");

      // Check that the content is properly formatted with 2-space indentation
      expect(fileContent).toContain('  "a": 1');
      expect(fileContent).toContain('  "b": {\n    "c": 2\n  }');
    });

    it("should handle primitive values", async () => {
      const filePath = path.join(TEST_DIR, "primitive.json");
      const testValue = 42;

      await writeJsonFile(filePath, testValue);

      const fileContent = await readFile(filePath, "utf8");
      const parsedData = JSON.parse(fileContent);

      expect(parsedData).toBe(testValue);
    });

    it("should handle arrays", async () => {
      const filePath = path.join(TEST_DIR, "array.json");
      const testArray = [1, 2, 3, { name: "test" }];

      await writeJsonFile(filePath, testArray);

      const fileContent = await readFile(filePath, "utf8");
      const parsedData = JSON.parse(fileContent);

      expect(parsedData).toEqual(testArray);
    });
  });

  describe("appendFile", () => {
    it("should append content to an existing file", async () => {
      const filePath = path.join(TEST_DIR, "append-test.txt");
      const initialContent = "Initial content\n";
      const appendContent = "Appended content\n";

      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(filePath, initialContent, "utf8");

      await appendFile(filePath, appendContent);

      const fileContent = await readFile(filePath, "utf8");
      expect(fileContent).toBe(initialContent + appendContent);
    });

    it("should create the file if it doesn't exist", async () => {
      const filePath = path.join(TEST_DIR, "new-file.txt");
      const content = "New file content\n";

      await appendFile(filePath, content);

      const fileContent = await readFile(filePath, "utf8");
      expect(fileContent).toBe(content);
    });

    it("should create parent directories if they don't exist", async () => {
      const filePath = path.join(TEST_DIR, "deep", "nested", "append-file.txt");
      const content = "Deep nested content\n";

      await appendFile(filePath, content);

      const fileContent = await readFile(filePath, "utf8");
      expect(fileContent).toBe(content);
    });

    it("should append multiple times correctly", async () => {
      const filePath = path.join(TEST_DIR, "multi-append.txt");
      const content1 = "First line\n";
      const content2 = "Second line\n";
      const content3 = "Third line\n";

      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(filePath, content1, "utf8");
      await appendFile(filePath, content2);
      await appendFile(filePath, content3);

      const fileContent = await readFile(filePath, "utf8");
      expect(fileContent).toBe(content1 + content2 + content3);
    });

    it("should handle empty content", async () => {
      const filePath = path.join(TEST_DIR, "empty-append.txt");
      const initialContent = "Initial\n";

      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(filePath, initialContent, "utf8");

      await appendFile(filePath, "");

      const fileContent = await readFile(filePath, "utf8");
      expect(fileContent).toBe(initialContent);
    });
  });
});