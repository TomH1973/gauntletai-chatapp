'use client';

import { useEffect, useState } from 'react';
import { cache, getMetrics } from '@/config/redis';

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  operationLatency: number;
}

export function CacheMonitor() {
  const [stats, setStats] = useState<CacheStats>({
    hits: 0,
    misses: 0,
    hitRate: 0,
    operationLatency: 0
  });

  useEffect(() => {
    const updateStats = async () => {
      const metrics = getMetrics();
      const [hitsMetric, missesMetric, durationMetric] = await Promise.all([
        metrics.cacheHits.get(),
        metrics.cacheMisses.get(),
        metrics.cacheOperationDuration.get()
      ]);

      const hits = Number(hitsMetric.values[0]?.value ?? 0);
      const misses = Number(missesMetric.values[0]?.value ?? 0);
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;
      
      // Use the average of the histogram buckets for latency
      const latency = durationMetric.values.reduce((sum, bucket) => 
        sum + Number(bucket.value), 0) / durationMetric.values.length || 0;

      setStats({
        hits,
        misses,
        hitRate,
        operationLatency: latency
      });
    };

    updateStats();
    const interval = setInterval(() => {
      updateStats().catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Cache Monitor</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold">Cache Hits</h3>
          <p className="text-2xl">{stats.hits.toLocaleString()}</p>
        </div>
        <div>
          <h3 className="font-semibold">Cache Misses</h3>
          <p className="text-2xl">{stats.misses.toLocaleString()}</p>
        </div>
        <div>
          <h3 className="font-semibold">Hit Rate</h3>
          <p className="text-2xl">{stats.hitRate.toFixed(1)}%</p>
        </div>
        <div>
          <h3 className="font-semibold">Avg Latency</h3>
          <p className="text-2xl">{stats.operationLatency.toFixed(2)}ms</p>
        </div>
      </div>
    </div>
  );
} 