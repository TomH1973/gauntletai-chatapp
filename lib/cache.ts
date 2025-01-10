import { Message, Thread, CacheEntry } from '@/types';

interface CacheOptions {
  maxAge?: number;
  maxSize?: number;
  name?: string;
  persistKey?: string;
  defaultValue?: any;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  invalidations: number;
}

interface StoredCacheData<T> {
  data: T;
  timestamp: number;
}

class Cache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxAge: number;
  private maxSize: number;
  private name: string;
  private persistKey?: string;
  private stats: CacheStats;
  private defaultValue?: any;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxAge = options.maxAge || 5 * 60 * 1000;
    this.maxSize = options.maxSize || 1000;
    this.name = options.name || 'default';
    this.persistKey = options.persistKey;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      invalidations: 0
    };
    this.defaultValue = options.defaultValue;

    if (this.persistKey) {
      this.loadFromStorage();
    }

    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, Math.min(this.maxAge / 2, 60000));
  }

  private cleanup() {
    const now = Date.now();
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      this.stats.invalidations += invalidated;
      this.stats.size = this.cache.size;
      this.persistStats();
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(`cache:${this.persistKey}`);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, StoredCacheData<T>>;
        Object.entries(parsed).forEach(([key, value]) => {
          this.cache.set(key, {
            data: value.data,
            timestamp: value.timestamp,
            lastAccessed: Date.now(),
            accessCount: 0
          });
        });
      }
    } catch (error) {
      console.error(`Failed to load cache ${this.name}:`, error);
    }
  }

  private persistToStorage() {
    if (!this.persistKey) return;

    try {
      const data: Record<string, StoredCacheData<T>> = {};
      this.cache.forEach((entry, key) => {
        data[key] = {
          data: entry.data,
          timestamp: entry.timestamp
        };
      });
      localStorage.setItem(`cache:${this.persistKey}`, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to persist cache ${this.name}:`, error);
    }
  }

  private persistStats() {
    try {
      localStorage.setItem(`cache:${this.name}:stats`, JSON.stringify(this.stats));
    } catch (error) {
      console.error(`Failed to persist stats for ${this.name}:`, error);
    }
  }

  set(key: string, value: T): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      let oldestKey = '';
      let oldestAccess = Date.now();

      this.cache.forEach((entry, k) => {
        if (entry.lastAccessed < oldestAccess) {
          oldestAccess = entry.lastAccessed;
          oldestKey = k;
        }
      });

      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.invalidations++;
      }
    }

    this.cache.set(key, {
      data: {
        ...this.defaultValue,
        ...value
      },
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    });

    this.stats.size = this.cache.size;
    if (this.persistKey) {
      this.persistToStorage();
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      this.persistStats();
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      this.stats.invalidations++;
      this.stats.misses++;
      this.persistStats();
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.hits++;
    this.persistStats();

    return {
      ...this.defaultValue,
      ...entry.data
    };
  }

  delete(key: string): void {
    if (this.cache.delete(key)) {
      this.stats.invalidations++;
      this.stats.size = this.cache.size;
      this.persistStats();
      if (this.persistKey) {
        this.persistToStorage();
      }
    }
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    if (size > 0) {
      this.stats.invalidations += size;
      this.stats.size = 0;
      this.persistStats();
      if (this.persistKey) {
        this.persistToStorage();
      }
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.stats.invalidations += count;
      this.stats.size = this.cache.size;
      this.persistStats();
      if (this.persistKey) {
        this.persistToStorage();
      }
    }

    return count;
  }
}

// Message cache with 5-minute TTL and persistence
export const messageCache = new Cache<Message>({
  maxAge: 5 * 60 * 1000,
  maxSize: 1000,
  name: 'messages',
  persistKey: 'messages',
  defaultValue: {
    readBy: [],
    readAt: {},
    edits: [],
    reactions: [],
    attachments: []
  }
});

// Thread participant cache with 1-minute TTL
export const participantCache = new Cache<string[]>({
  maxAge: 60 * 1000,
  maxSize: 100,
  name: 'participants'
});

// Thread cache with 5-minute TTL and persistence
export const threadCache = new Cache<Thread>({
  maxAge: 5 * 60 * 1000,
  maxSize: 50,
  name: 'threads',
  persistKey: 'threads',
  defaultValue: {
    participants: [],
    messages: [],
    metadata: {}
  }
});

// User presence cache with 30-second TTL
export const presenceCache = new Cache<Set<string>>({
  maxAge: 30 * 1000,
  maxSize: 100,
  name: 'presence'
}); 