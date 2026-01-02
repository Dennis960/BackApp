/**
 * Filesystem Test Helpers
 * 
 * Functions for filesystem operations in tests
 */
import * as fs from 'fs';
import * as path from 'path';

/** Base path for all test files */
export const TEST_BASE_PATH = '/tmp/backapp';

/**
 * Clean up the test directory before each test
 */
export function cleanupTestDirectory(): void {
  if (fs.existsSync(TEST_BASE_PATH)) {
    fs.rmSync(TEST_BASE_PATH, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_BASE_PATH, { recursive: true });
}

/**
 * Check if a file exists on disk
 */
export function fileExistsOnDisk(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Check if a directory exists on disk
 */
export function directoryExistsOnDisk(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

/**
 * Get all files in a directory recursively
 */
export function getAllFilesInDirectory(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFilesInDirectory(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Create a test file on disk
 */
export function createTestFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

/**
 * Create a test directory on disk
 */
export function createTestDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Read file content from disk
 */
export function readTestFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Get the size of a file on disk
 */
export function getFileSize(filePath: string): number {
  return fs.statSync(filePath).size;
}
