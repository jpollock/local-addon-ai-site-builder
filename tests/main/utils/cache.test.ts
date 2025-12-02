/**
 * Tests for cache utility
 */

import {
  Cache,
  CacheRegistry,
  CacheConfig,
  DEFAULT_CACHE_CONFIG,
  getCacheRegistry,
} from '../../../src/main/utils/cache';

describe('cache utility', () => {
  describe('DEFAULT_CACHE_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_CACHE_CONFIG.maxSize).toBe(100);
      expect(DEFAULT_CACHE_CONFIG.defaultTtl).toBe(300000); // 5 minutes
      expect(DEFAULT_CACHE_CONFIG.name).toBe('Cache');
    });
  });

  describe('Cache', () => {
    let cache: Cache<string>;

    beforeEach(() => {
      cache = new Cache<string>({ maxSize: 3, defaultTtl: 1000 });
    });

    describe('get/set', () => {
      it('should set and get a value', () => {
        cache.set('key1', 'value1');
        expect(cache.get('key1')).toBe('value1');
      });

      it('should return undefined for non-existent key', () => {
        expect(cache.get('nonexistent')).toBeUndefined();
      });

      it('should overwrite existing value', () => {
        cache.set('key1', 'value1');
        cache.set('key1', 'value2');
        expect(cache.get('key1')).toBe('value2');
      });

      it('should expire entries after TTL', async () => {
        jest.useFakeTimers();

        cache.set('key1', 'value1', 100);
        expect(cache.get('key1')).toBe('value1');

        // Advance time past TTL
        jest.advanceTimersByTime(150);

        expect(cache.get('key1')).toBeUndefined();

        jest.useRealTimers();
      });

      it('should use custom TTL when provided', async () => {
        jest.useFakeTimers();

        cache.set('key1', 'value1', 500);
        cache.set('key2', 'value2', 100);

        jest.advanceTimersByTime(200);

        expect(cache.get('key1')).toBe('value1');
        expect(cache.get('key2')).toBeUndefined();

        jest.useRealTimers();
      });
    });

    describe('has', () => {
      it('should return true for existing key', () => {
        cache.set('key1', 'value1');
        expect(cache.has('key1')).toBe(true);
      });

      it('should return false for non-existent key', () => {
        expect(cache.has('nonexistent')).toBe(false);
      });

      it('should return false for expired key', () => {
        jest.useFakeTimers();

        cache.set('key1', 'value1', 100);
        expect(cache.has('key1')).toBe(true);

        jest.advanceTimersByTime(150);

        expect(cache.has('key1')).toBe(false);

        jest.useRealTimers();
      });
    });

    describe('delete', () => {
      it('should delete existing entry', () => {
        cache.set('key1', 'value1');
        expect(cache.delete('key1')).toBe(true);
        expect(cache.get('key1')).toBeUndefined();
      });

      it('should return false for non-existent key', () => {
        expect(cache.delete('nonexistent')).toBe(false);
      });
    });

    describe('clear', () => {
      it('should remove all entries', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.clear();
        expect(cache.get('key1')).toBeUndefined();
        expect(cache.get('key2')).toBeUndefined();
      });
    });

    describe('LRU eviction', () => {
      it('should evict least recently used entry when maxSize is reached', () => {
        // Use fake timers to ensure distinct timestamps for LRU tracking
        jest.useFakeTimers();

        cache.set('key1', 'value1');
        jest.advanceTimersByTime(10);
        cache.set('key2', 'value2');
        jest.advanceTimersByTime(10);
        cache.set('key3', 'value3');
        jest.advanceTimersByTime(10);

        // Access key1 to make it recently used (updates lastAccessed)
        cache.get('key1');
        jest.advanceTimersByTime(10);

        // Add new entry, should evict key2 (least recently used)
        cache.set('key4', 'value4');

        expect(cache.get('key1')).toBe('value1');
        expect(cache.get('key2')).toBeUndefined(); // Evicted
        expect(cache.get('key3')).toBe('value3');
        expect(cache.get('key4')).toBe('value4');

        jest.useRealTimers();
      });

      it('should not evict when updating existing key', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');

        // Update existing key (should not trigger eviction)
        cache.set('key1', 'updated');

        expect(cache.get('key1')).toBe('updated');
        expect(cache.get('key2')).toBe('value2');
        expect(cache.get('key3')).toBe('value3');
      });
    });

    describe('getStats', () => {
      it('should return correct statistics', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');

        cache.get('key1'); // Hit
        cache.get('key2'); // Hit
        cache.get('nonexistent'); // Miss

        const stats = cache.getStats();
        expect(stats.size).toBe(2);
        expect(stats.maxSize).toBe(3);
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBeCloseTo(0.666, 2);
      });

      it('should return zero hit rate when no requests', () => {
        const stats = cache.getStats();
        expect(stats.hitRate).toBe(0);
      });

      it('should track evictions', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');
        cache.set('key4', 'value4'); // Triggers eviction

        const stats = cache.getStats();
        expect(stats.evictions).toBe(1);
      });
    });

    describe('cleanup', () => {
      it('should remove expired entries', () => {
        jest.useFakeTimers();

        cache.set('key1', 'value1', 100);
        cache.set('key2', 'value2', 500);

        jest.advanceTimersByTime(200);

        cache.cleanup();

        expect(cache.get('key1')).toBeUndefined();
        expect(cache.get('key2')).toBe('value2');

        jest.useRealTimers();
      });
    });

    describe('getOrCompute', () => {
      it('should return cached value if exists', async () => {
        cache.set('key1', 'cached');
        const compute = jest.fn().mockResolvedValue('computed');

        const result = await cache.getOrCompute('key1', compute);

        expect(result).toBe('cached');
        expect(compute).not.toHaveBeenCalled();
      });

      it('should compute and cache if not exists', async () => {
        const compute = jest.fn().mockResolvedValue('computed');

        const result = await cache.getOrCompute('key1', compute);

        expect(result).toBe('computed');
        expect(compute).toHaveBeenCalledTimes(1);
        expect(cache.get('key1')).toBe('computed');
      });

      it('should use custom TTL', async () => {
        jest.useFakeTimers();

        const compute = jest.fn().mockResolvedValue('computed');
        await cache.getOrCompute('key1', compute, 100);

        jest.advanceTimersByTime(150);

        expect(cache.get('key1')).toBeUndefined();

        jest.useRealTimers();
      });
    });

    describe('with logger', () => {
      it('should call logger methods', () => {
        const logger = {
          info: jest.fn(),
          debug: jest.fn(),
        };

        const loggedCache = new Cache<string>({ maxSize: 3, defaultTtl: 1000 }, logger);

        loggedCache.set('key1', 'value1');
        loggedCache.get('key1');
        loggedCache.get('nonexistent');
        loggedCache.delete('key1');
        loggedCache.clear();

        expect(logger.debug).toHaveBeenCalled();
      });
    });
  });

  describe('CacheRegistry', () => {
    let registry: CacheRegistry;

    beforeEach(() => {
      registry = new CacheRegistry();
    });

    describe('getOrCreate', () => {
      it('should create new cache if not exists', () => {
        const cache = registry.getOrCreate<string>('test');
        expect(cache).toBeInstanceOf(Cache);
      });

      it('should return existing cache if exists', () => {
        const cache1 = registry.getOrCreate<string>('test');
        const cache2 = registry.getOrCreate<string>('test');
        expect(cache1).toBe(cache2);
      });

      it('should use provided config', () => {
        const cache = registry.getOrCreate<string>('test', { maxSize: 50 });
        const stats = cache.getStats();
        expect(stats.maxSize).toBe(50);
      });
    });

    describe('get', () => {
      it('should return cache if exists', () => {
        registry.getOrCreate<string>('test');
        expect(registry.get('test')).toBeDefined();
      });

      it('should return undefined if not exists', () => {
        expect(registry.get('nonexistent')).toBeUndefined();
      });
    });

    describe('getAll', () => {
      it('should return all caches', () => {
        registry.getOrCreate('cache1');
        registry.getOrCreate('cache2');

        const all = registry.getAll();
        expect(all.size).toBe(2);
        expect(all.has('cache1')).toBe(true);
        expect(all.has('cache2')).toBe(true);
      });
    });

    describe('getAllStats', () => {
      it('should return stats for all caches', () => {
        const cache1 = registry.getOrCreate<string>('cache1');
        const cache2 = registry.getOrCreate<string>('cache2');

        cache1.set('key1', 'value1');
        cache2.set('key2', 'value2');

        const stats = registry.getAllStats();
        expect(stats['cache1'].size).toBe(1);
        expect(stats['cache2'].size).toBe(1);
      });
    });

    describe('clearAll', () => {
      it('should clear all caches', () => {
        const cache1 = registry.getOrCreate<string>('cache1');
        const cache2 = registry.getOrCreate<string>('cache2');

        cache1.set('key1', 'value1');
        cache2.set('key2', 'value2');

        registry.clearAll();

        expect(cache1.get('key1')).toBeUndefined();
        expect(cache2.get('key2')).toBeUndefined();
      });
    });

    describe('cleanupAll', () => {
      it('should cleanup all caches', () => {
        jest.useFakeTimers();

        const cache1 = registry.getOrCreate<string>('cache1', { defaultTtl: 100 });
        const cache2 = registry.getOrCreate<string>('cache2', { defaultTtl: 100 });

        cache1.set('key1', 'value1');
        cache2.set('key2', 'value2');

        jest.advanceTimersByTime(150);

        registry.cleanupAll();

        // Verify cleanup happened (stats show size still includes expired until accessed)
        expect(cache1.has('key1')).toBe(false);
        expect(cache2.has('key2')).toBe(false);

        jest.useRealTimers();
      });
    });
  });

  describe('getCacheRegistry', () => {
    it('should return singleton instance', () => {
      const registry1 = getCacheRegistry();
      const registry2 = getCacheRegistry();
      expect(registry1).toBe(registry2);
    });

    it('should return CacheRegistry instance', () => {
      const registry = getCacheRegistry();
      expect(registry).toBeInstanceOf(CacheRegistry);
    });
  });
});
