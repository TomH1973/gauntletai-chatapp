import { Counter, Histogram, Registry } from 'prom-client';

const register = new Registry();

// Search performance metrics
const searchTime = new Histogram({
  name: 'search_duration_seconds',
  help: 'Time taken to perform a search',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const searchErrors = new Counter({
  name: 'search_errors_total',
  help: 'Total number of search errors',
  labelNames: ['type'],
  registers: [register]
});

// Cache metrics
const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['type'],
  registers: [register]
});

const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['type'],
  registers: [register]
});

const searchCacheHits = new Counter({
  name: 'search_cache_hits_total',
  help: 'Total number of search cache hits',
  registers: [register]
});

const searchCacheMisses = new Counter({
  name: 'search_cache_misses_total',
  help: 'Total number of search cache misses',
  registers: [register]
});

// Rate limiting metrics
const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['type'],
  registers: [register]
});

const rateLimitErrors = new Counter({
  name: 'rate_limit_errors_total',
  help: 'Total number of rate limit errors',
  labelNames: ['type'],
  registers: [register]
});

const rateLimitCacheSize = new Histogram({
  name: 'rate_limit_cache_size_bytes',
  help: 'Size of rate limit cache in bytes',
  buckets: [1000, 5000, 10000, 50000, 100000],
  registers: [register]
});

// Utility methods
const getSearchLatency = async (): Promise<number> => {
  const value = await searchTime.get();
  return value.values[0].value;
};

const getCacheHitRate = async (type: string): Promise<number> => {
  const hits = await cacheHits.get();
  const misses = await cacheMisses.get();
  
  const hitCount = hits.values.find(v => v.labels.type === type)?.value || 0;
  const missCount = misses.values.find(v => v.labels.type === type)?.value || 0;
  
  const total = hitCount + missCount;
  return total > 0 ? hitCount / total : 0;
};

const getSearchCacheHitRate = async (): Promise<number> => {
  const hits = await searchCacheHits.get();
  const misses = await searchCacheMisses.get();
  
  const total = hits.values[0].value + misses.values[0].value;
  return total > 0 ? hits.values[0].value / total : 0;
};

export const searchMetrics = {
  // Search metrics
  searchTime,
  searchErrors,

  // Cache metrics
  cacheHits,
  cacheMisses,
  searchCacheHits,
  searchCacheMisses,

  // Rate limiting metrics
  rateLimitHits,
  rateLimitErrors,
  rateLimitCacheSize,

  // Utility methods
  getSearchLatency,
  getCacheHitRate,
  getSearchCacheHitRate
};

export default register; 