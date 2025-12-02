/**
 * Mock File System
 *
 * Provides in-memory file system mock for testing.
 * Simulates fs operations without touching the actual file system.
 */

import * as path from 'path';

interface FileSystemEntry {
  type: 'file' | 'directory';
  content?: string;
  children?: Map<string, FileSystemEntry>;
}

class MockFileSystem {
  private fs: Map<string, FileSystemEntry> = new Map();

  constructor() {
    this.reset();
  }

  /**
   * Reset to empty file system
   */
  reset(): void {
    this.fs.clear();
  }

  /**
   * Normalize path for consistent lookup
   */
  private normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  /**
   * Get entry at path
   */
  private getEntry(filePath: string): FileSystemEntry | undefined {
    return this.fs.get(this.normalizePath(filePath));
  }

  /**
   * Set entry at path
   */
  private setEntry(filePath: string, entry: FileSystemEntry): void {
    this.fs.set(this.normalizePath(filePath), entry);
  }

  /**
   * Ensure directory exists
   */
  private ensureDir(dirPath: string): void {
    const normalized = this.normalizePath(dirPath);
    if (!this.fs.has(normalized)) {
      this.setEntry(normalized, { type: 'directory', children: new Map() });
    }
  }

  /**
   * Check if path exists
   */
  existsSync(filePath: string): boolean {
    return this.fs.has(this.normalizePath(filePath));
  }

  /**
   * Read file content
   */
  readFileSync(filePath: string, encoding?: string): string {
    const entry = this.getEntry(filePath);
    if (!entry) {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    if (entry.type !== 'file') {
      throw new Error(`EISDIR: illegal operation on a directory, read '${filePath}'`);
    }
    return entry.content || '';
  }

  /**
   * Write file content
   */
  writeFileSync(filePath: string, content: string, encoding?: string): void {
    const normalized = this.normalizePath(filePath);
    const dir = path.dirname(normalized);

    // Ensure parent directory exists
    if (dir !== '.' && dir !== '/') {
      this.ensureDir(dir);
    }

    this.setEntry(normalized, { type: 'file', content });
  }

  /**
   * Create directory
   */
  mkdirSync(dirPath: string, options?: { recursive?: boolean }): void {
    const normalized = this.normalizePath(dirPath);

    if (options?.recursive) {
      // Create all parent directories
      const parts = normalized.split('/').filter(Boolean);
      let current = '';
      for (const part of parts) {
        current += '/' + part;
        this.ensureDir(current);
      }
    } else {
      // Create only if parent exists
      const parent = path.dirname(normalized);
      if (parent !== '.' && parent !== '/' && !this.existsSync(parent)) {
        throw new Error(`ENOENT: no such file or directory, mkdir '${dirPath}'`);
      }
      this.ensureDir(normalized);
    }
  }

  /**
   * Read directory contents
   */
  readdirSync(dirPath: string): string[] {
    const entry = this.getEntry(dirPath);
    if (!entry) {
      throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
    }
    if (entry.type !== 'directory') {
      throw new Error(`ENOTDIR: not a directory, scandir '${dirPath}'`);
    }

    // Return all files/dirs that start with this path
    const normalized = this.normalizePath(dirPath);
    const results: string[] = [];

    for (const [entryPath] of this.fs.entries()) {
      const dir = path.dirname(entryPath);
      if (this.normalizePath(dir) === normalized) {
        results.push(path.basename(entryPath));
      }
    }

    return results;
  }

  /**
   * Delete file
   */
  unlinkSync(filePath: string): void {
    const normalized = this.normalizePath(filePath);
    const entry = this.getEntry(filePath);

    if (!entry) {
      throw new Error(`ENOENT: no such file or directory, unlink '${filePath}'`);
    }
    if (entry.type !== 'file') {
      throw new Error(`EISDIR: illegal operation on a directory, unlink '${filePath}'`);
    }

    this.fs.delete(normalized);
  }

  /**
   * Remove directory
   */
  rmdirSync(dirPath: string): void {
    const normalized = this.normalizePath(dirPath);
    const entry = this.getEntry(dirPath);

    if (!entry) {
      throw new Error(`ENOENT: no such file or directory, rmdir '${dirPath}'`);
    }
    if (entry.type !== 'directory') {
      throw new Error(`ENOTDIR: not a directory, rmdir '${dirPath}'`);
    }

    // Check if directory is empty
    const contents = this.readdirSync(dirPath);
    if (contents.length > 0) {
      throw new Error(`ENOTEMPTY: directory not empty, rmdir '${dirPath}'`);
    }

    this.fs.delete(normalized);
  }
}

/**
 * Global mock file system instance
 */
export const mockFs = new MockFileSystem();

/**
 * Get mock fs module for jest.mock()
 */
export function getMockFsModule() {
  return {
    existsSync: jest.fn((filePath: string) => mockFs.existsSync(filePath)),
    readFileSync: jest.fn((filePath: string, encoding?: string) =>
      mockFs.readFileSync(filePath, encoding)
    ),
    writeFileSync: jest.fn((filePath: string, content: string, encoding?: string) =>
      mockFs.writeFileSync(filePath, content, encoding)
    ),
    mkdirSync: jest.fn((dirPath: string, options?: { recursive?: boolean }) =>
      mockFs.mkdirSync(dirPath, options)
    ),
    readdirSync: jest.fn((dirPath: string) => mockFs.readdirSync(dirPath)),
    unlinkSync: jest.fn((filePath: string) => mockFs.unlinkSync(filePath)),
    rmdirSync: jest.fn((dirPath: string) => mockFs.rmdirSync(dirPath)),
  };
}
