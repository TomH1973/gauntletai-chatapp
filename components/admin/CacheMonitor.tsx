'use client';

import { useState, useEffect } from 'react';
import { messageCache, threadCache, participantCache, presenceCache } from '@/lib/cache';

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  invalidations: number;
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  invalidationRate: number;
  utilizationRate: number;
}

export function CacheMonitor() {
  const [stats, setStats] = useState<Record<string, CacheStats>>({});
  const [metrics, setMetrics] = useState<Record<string, CacheMetrics>>({});

  useEffect(() => {
    const updateStats = () => {
      const newStats = {
        messages: messageCache.getStats(),
        threads: threadCache.getStats(),
        participants: participantCache.getStats(),
        presence: presenceCache.getStats()
      };

      setStats(newStats);

      // Calculate metrics
      const newMetrics: Record<string, CacheMetrics> = {};
      Object.entries(newStats).forEach(([name, cacheStats]) => {
        const total = cacheStats.hits + cacheStats.misses;
        newMetrics[name] = {
          hitRate: total ? (cacheStats.hits / total) * 100 : 0,
          missRate: total ? (cacheStats.misses / total) * 100 : 0,
          invalidationRate: total ? (cacheStats.invalidations / total) * 100 : 0,
          utilizationRate: name === 'messages' ? (cacheStats.size / 1000) * 100 :
                          name === 'threads' ? (cacheStats.size / 50) * 100 :
                          (cacheStats.size / 100) * 100
        };
      });

      setMetrics(newMetrics);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Cache Monitor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(stats).map(([name, cacheStats]) => (
          <div key={name} className="p-4 border rounded-lg">
            <h3 className="text-lg font-medium capitalize mb-2">{name}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Size:</span>
                <span>{cacheStats.size}</span>
              </div>
              <div className="flex justify-between">
                <span>Hit Rate:</span>
                <span>{metrics[name]?.hitRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Miss Rate:</span>
                <span>{metrics[name]?.missRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Invalidations:</span>
                <span>{cacheStats.invalidations}</span>
              </div>
              <div className="flex justify-between">
                <span>Utilization:</span>
                <span>{metrics[name]?.utilizationRate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="mt-3 h-2 bg-gray-200 rounded">
              <div
                className="h-full bg-blue-500 rounded"
                style={{ width: `${metrics[name]?.utilizationRate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 