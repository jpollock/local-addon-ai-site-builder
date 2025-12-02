/**
 * Cache Utility - Simple in-memory cache with TTL and LRU eviction
 *
 * Provides a lightweight caching solution for API responses and
 * validation results. Implements time-to-live (TTL) expiration
 * and least-recently-used (LRU) eviction.
 */

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number; // Maximum number of entries
  defaultTtl: number; // Default TTL in milliseconds
  name?: string; // Name for logging
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 100,
  defaultTtl: 300000, // 5 minutes
  name: 'Cache',
};

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

/**
 * Simple in-memory cache with TTL and LRU eviction
 */
export class Cache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;
  private logger?: {
    info?: (msg: string) => void;
    debug?: (msg: string) => void;
  };

  constructor(
    config: Partial<CacheConfig> = {},
    logger?: {
      info?: (msg: string) => void;
      debug?: (msg: string) => void;
    }
  ) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.logger = logger;
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    // Check if entry exists and is not expired
    if (entry) {
      const now = Date.now();
      if (now < entry.expiresAt) {
        // Update last accessed time
        entry.lastAccessed = now;
        this.hits++;
        this.logger?.debug?.(`[${this.config.name}] Cache hit: ${key}`);
        return entry.value;
      } else {
        // Entry expired, remove it
        this.cache.delete(key);
        this.logger?.debug?.(`[${this.config.name}] Cache expired: ${key}`);
      }
    }

    this.misses++;
    this.logger?.debug?.(`[${this.config.name}] Cache miss: ${key}`);
    return undefined;
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl ?? this.config.defaultTtl);

    // Check if we need to evict entries
    if (
      this.cache.size >= this.config.maxSize &&
      !this.cache.has(key)
    ) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: now,
    });

    this.logger?.debug?.(
      `[${this.config.name}] Cache set: ${key} (TTL: ${ttl ?? this.config.defaultTtl}ms)`
    );
  }

  /**
   * Delete a value from cache
   * @param key - Cache key
   * @returns true if entry was deleted, false if not found
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger?.debug?.(`[${this.config.name}] Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger?.info?.(
      `[${this.config.name}] Cache cleared (${size} entries removed)`
    );
  }

  /**
   * Check if a key exists in cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger?.debug?.(
        `[${this.config.name}] Cleanup removed ${removed} expired entries`
      );
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // Find the least recently accessed entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictions++;
      this.logger?.debug?.(
        `[${this.config.name}] Evicted LRU entry: ${oldestKey}`
      );
    }
  }

  /**
   * Get or compute a value
   * If key exists in cache, return it. Otherwise, compute value and cache it.
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttl);
    return value;
  }
}

/**
 * Cache registry for managing multiple named caches
 */
export class CacheRegistry {
  private caches: Map<string, Cache<any>> = new Map();

  /**
   * Get or create a cache
   */
  getOrCreate<T = any>(
    name: string,
    config?: Partial<CacheConfig>,
    logger?: any
  ): Cache<T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new Cache<T>({ ...config, name }, logger));
    }
    return this.caches.get(name)! as Cache<T>;
  }

  /**
   * Get a cache by name
   */
  get<T = any>(name: string): Cache<T> | undefined {
    return this.caches.get(name) as Cache<T> | undefined;
  }

  /**
   * Get all caches
   */
  getAll(): Map<string, Cache<any>> {
    return this.caches;
  }

  /**
   * Get stats for all caches
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Cleanup all caches (remove expired entries)
   */
  cleanupAll(): void {
    for (const cache of this.caches.values()) {
      cache.cleanup();
    }
  }
}

// Global registry instance
let registryInstance: CacheRegistry | null = null;

/**
 * Get the global cache registry
 */
export function getCacheRegistry(): CacheRegistry {
  if (!registryInstance) {
    registryInstance = new CacheRegistry();
  }
  return registryInstance;
}
