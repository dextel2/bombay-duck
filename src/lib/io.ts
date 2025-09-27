/**
 * Lightweight filesystem utilities used across the automation scripts.
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * Ensure that a directory exists before writing files to it.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Read and parse a JSON file, returning `null` when the file does not exist.
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const data = await readFile(filePath, "utf8");
    return JSON.parse(data) as T;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Serialize a value to JSON and write it to disk, creating parent directories as needed.
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Append text to a file, creating it first when it does not exist.
 */
export async function appendFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, { flag: "a", encoding: "utf8" });
}
