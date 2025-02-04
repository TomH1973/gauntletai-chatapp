import { NextResponse } from 'next/server';
import { register, Gauge, Counter, Histogram } from 'prom-client';

const isEdgeRuntime = typeof process.env.NEXT_RUNTIME === 'string' && process.env.NEXT_RUNTIME === 'edge';

// Initialize metrics
const activeConnections = new Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections'
});

const messagesSent = new Counter({
  name: 'messages_total',
  help: 'Total number of messages sent',
  labelNames: ['status']
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Error tracking
const errorCounter = new Counter({
  name: 'error_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code', 'path']
});

// Cache metrics
const cacheOperations = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status']
});

const cacheHitRatio = new Gauge({
  name: 'cache_hit_ratio',
  help: 'Cache hit ratio',
  labelNames: ['cache']
});

// Message metrics
const messageProcessingDuration = new Histogram({
  name: 'message_processing_duration_seconds',
  help: 'Duration of message processing in seconds',
  labelNames: ['type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const messageQueueSize = new Gauge({
  name: 'message_queue_size',
  help: 'Size of message processing queue'
});

// Initialize the metrics
register.setDefaultLabels({
  app: 'chat_application'
});

// Only collect resource usage metrics in Node.js environment
if (!isEdgeRuntime) {
  // Resource usage metrics
  const memoryUsage = new Gauge({
    name: 'app_memory_usage_bytes',
    help: 'Application memory usage in bytes',
    labelNames: ['type']
  });

  const cpuUsage = new Gauge({
    name: 'app_cpu_usage_percent',
    help: 'Application CPU usage percentage'
  });

  // Update resource metrics periodically
  setInterval(() => {
    const usage = process.memoryUsage();
    memoryUsage.set({ type: 'rss' }, usage.rss);
    memoryUsage.set({ type: 'heapTotal' }, usage.heapTotal);
    memoryUsage.set({ type: 'heapUsed' }, usage.heapUsed);
    memoryUsage.set({ type: 'external' }, usage.external);

    const startUsage = process.cpuUsage();
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const userPercent = (endUsage.user / 1000000) * 100;
      const systemPercent = (endUsage.system / 1000000) * 100;
      cpuUsage.set(userPercent + systemPercent);
    }, 100);
  }, 5000);
}

export async function GET() {
  try {
    const metrics = await register.metrics();
    
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': register.contentType
      }
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    errorCounter.inc({ type: 'metrics_generation', code: '500', path: '/api/metrics' });
    return new NextResponse('Error generating metrics', { status: 500 });
  }
}

// Export the metrics objects to be used in other parts of the application
export const metrics = {
  activeConnections,
  messagesSent,
  httpRequestDuration,
  databaseQueryDuration,
  errorCounter,
  cacheOperations,
  cacheHitRatio,
  messageProcessingDuration,
  messageQueueSize
}; 