import { Registry, Counter, Histogram, Gauge } from 'prom-client'

// Create a Registry
const register = new Registry()

// HTTP request counter
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
})

// WebSocket connection counter
export const wsConnectionCounter = new Counter({
  name: 'websocket_connections_total',
  help: 'Total number of WebSocket connections',
  labelNames: ['status'],
  registers: [register]
})

// Request duration histogram
export const requestDurationHistogram = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
})

// Message processing counter
export const messageCounter = new Counter({
  name: 'messages_processed_total',
  help: 'Total number of messages processed',
  labelNames: ['type', 'status'],
  registers: [register]
})

// Thread metrics
export const threadCreationDuration = new Histogram({
  name: 'thread_creation_duration_seconds',
  help: 'Thread creation duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
})

export const threadUpdateDuration = new Histogram({
  name: 'thread_update_duration_seconds',
  help: 'Thread update duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
})

export const threadRetrievalDuration = new Histogram({
  name: 'thread_retrieval_duration_seconds',
  help: 'Thread retrieval duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
})

export const threadErrors = new Counter({
  name: 'thread_errors_total',
  help: 'Total number of thread operation errors',
  labelNames: ['operation'],
  registers: [register]
})

export const threadCacheHits = new Counter({
  name: 'thread_cache_hits_total',
  help: 'Total number of thread cache hits',
  registers: [register]
})

export const threadCacheMisses = new Counter({
  name: 'thread_cache_misses_total',
  help: 'Total number of thread cache misses',
  registers: [register]
})

// WebSocket metrics
export const activeConnections = new Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register]
})

export const messagesSent = new Counter({
  name: 'websocket_messages_sent_total',
  help: 'Total number of messages sent',
  labelNames: ['status'],
  registers: [register]
})

export const socketErrors = new Counter({
  name: 'websocket_errors_total',
  help: 'Total number of WebSocket errors',
  labelNames: ['code'],
  registers: [register]
})

export const rateLimitHits = new Counter({
  name: 'rate_limit_hits',
  help: 'Number of rate limit hits',
  labelNames: ['allowed'],
  registers: [register]
})

export const rateLimitCleanup = new Histogram({
  name: 'rate_limit_cleanup_duration_seconds',
  help: 'Duration of rate limit cleanup operations',
  labelNames: ['success'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
})

export const rateLimitExpiredKeys = new Gauge({
  name: 'rate_limit_expired_keys',
  help: 'Number of expired rate limit keys cleaned up',
  registers: [register]
})

export const threadParticipants = new Gauge({
  name: 'websocket_thread_participants',
  help: 'Number of participants per thread',
  labelNames: ['threadId'],
  registers: [register]
})

export const messageDeliveryLatency = new Histogram({
  name: 'message_delivery_latency_seconds',
  help: 'Message delivery latency in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
})

export const messageReactions = new Counter({
  name: 'websocket_message_reactions_total',
  help: 'Total number of message reactions',
  labelNames: ['type'],
  registers: [register]
})

export const messageAttachments = new Counter({
  name: 'websocket_message_attachments_total',
  help: 'Total number of message attachments',
  labelNames: ['type', 'count'],
  registers: [register]
})

// Session metrics
export const tokenRefreshDuration = new Histogram({
  name: 'token_refresh_duration_seconds',
  help: 'Token refresh duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
})

export const tokenRefreshSuccess = new Counter({
  name: 'token_refresh_success_total',
  help: 'Total number of successful token refreshes',
  registers: [register]
})

export const tokenRefreshErrors = new Counter({
  name: 'token_refresh_errors_total',
  help: 'Total number of token refresh errors',
  registers: [register]
})

export const recoveryQueueLength = new Gauge({
  name: 'recovery_queue_length',
  help: 'Number of tasks in recovery queue',
  registers: [register]
})

export const deadLetterQueueLength = new Gauge({
  name: 'dead_letter_queue_length',
  help: 'Number of tasks in dead letter queue',
  registers: [register]
})

export const recoveryAttempts = new Counter({
  name: 'recovery_attempts_total',
  help: 'Number of recovery attempts',
  labelNames: ['success', 'type'],
  registers: [register]
})

export const recoveryDuration = new Histogram({
  name: 'recovery_duration_seconds',
  help: 'Duration of recovery attempts',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5]
})

export const encryptionOperations = new Histogram({
  name: 'encryption_operation_duration_seconds',
  help: 'Duration of encryption operations',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
})

export const encryptionErrors = new Counter({
  name: 'encryption_errors_total',
  help: 'Number of encryption errors',
  labelNames: ['operation'],
  registers: [register]
})

// Rate limit cache metrics
export const rateLimitCacheHits = new Counter({
  name: 'rate_limit_cache_hits_total',
  help: 'Total number of rate limit cache hits',
  labelNames: ['action'],
  registers: [register]
});

export const rateLimitCacheMisses = new Counter({
  name: 'rate_limit_cache_misses_total',
  help: 'Total number of rate limit cache misses',
  labelNames: ['action'],
  registers: [register]
});

export const rateLimitCacheSize = new Gauge({
  name: 'rate_limit_cache_size',
  help: 'Current number of entries in rate limit cache',
  registers: [register]
});

export const rateLimitCacheOperationDuration = new Histogram({
  name: 'rate_limit_cache_operation_duration_seconds',
  help: 'Duration of rate limit cache operations',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
  registers: [register]
});

// CDN metrics
export const cdnMetrics = {
  cdnOperationDuration: new Histogram({
    name: 'cdn_operation_duration_seconds',
    help: 'Duration of CDN operations',
    labelNames: ['operation'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register]
  }),

  cdnUpdates: new Counter({
    name: 'cdn_updates_total',
    help: 'Number of CDN updates',
    labelNames: ['type'],
    registers: [register]
  }),

  cdnErrors: new Counter({
    name: 'cdn_errors_total',
    help: 'Number of CDN operation errors',
    registers: [register]
  }),

  cdnInvalidations: new Counter({
    name: 'cdn_invalidations_total',
    help: 'Number of CDN cache invalidations',
    labelNames: ['count'],
  }),

  cdnBandwidth: new Counter({
    name: 'cdn_bandwidth_bytes',
    help: 'CDN bandwidth usage in bytes',
    labelNames: ['type'],
  }),

  cdnRequests: new Counter({
    name: 'cdn_requests_total',
    help: 'Number of CDN requests',
    labelNames: ['type', 'status'],
  }),

  cdnCacheHits: new Counter({
    name: 'cdn_cache_hits_total',
    help: 'Number of CDN cache hits',
    labelNames: ['type'],
  }),

  cdnCacheMisses: new Counter({
    name: 'cdn_cache_misses_total',
    help: 'Number of CDN cache misses',
    labelNames: ['type'],
  }),
};

// Upload metrics
export const uploadMetrics = {
  uploadDuration: new Histogram({
    name: 'upload_duration_seconds',
    help: 'Duration of file uploads in seconds',
    labelNames: ['status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),

  uploadSize: new Histogram({
    name: 'upload_size_bytes',
    help: 'Size of uploaded files in bytes',
    labelNames: ['type'],
    buckets: [1024, 1024 * 1024, 5 * 1024 * 1024, 10 * 1024 * 1024],
  }),

  uploadCount: new Counter({
    name: 'upload_total',
    help: 'Total number of file uploads',
    labelNames: ['status'],
  }),

  uploadErrors: new Counter({
    name: 'upload_errors_total',
    help: 'Total number of upload errors',
    labelNames: ['type'],
  }),
};

export const recoveryErrors = new Counter({
  name: 'recovery_errors_total',
  help: 'Total number of recovery processing errors',
  labelNames: ['type'],
  registers: [register]
});

export const recoveryHealth = new Gauge({
  name: 'recovery_health',
  help: 'Health status of the recovery system',
  labelNames: ['status', 'queue_length', 'dead_letter_length', 'circuit_breakers'],
  registers: [register]
});

export const rateLimitSkipped = new Counter({
  name: 'rate_limit_skipped_total',
  help: 'Number of rate limit checks skipped due to probabilistic filtering',
  labelNames: ['action'],
  registers: [register]
});

export const rateLimitErrors = new Counter({
  name: 'rate_limit_errors',
  help: 'Number of rate limit check errors',
  registers: [register]
});

// Search metrics
export const searchDuration = new Histogram({
  name: 'search_duration_seconds',
  help: 'Duration of search operations',
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 1],
  registers: [register]
});

export const searchCacheHits = new Counter({
  name: 'search_cache_hits_total',
  help: 'Number of search cache hits',
  registers: [register]
});

export const searchCacheMisses = new Counter({
  name: 'search_cache_misses_total',
  help: 'Number of search cache misses',
  registers: [register]
});

export const searchErrors = new Counter({
  name: 'search_errors_total',
  help: 'Number of search operation errors',
  registers: [register]
});

// Rate Limiting Metrics
export const rateLimitAnomalies = new Counter({
  name: 'rate_limit_anomalies_total',
  help: 'Total number of rate limit anomalies detected',
  labelNames: ['action', 'userId']
});

// System metrics
export const processCPU = new Gauge({
  name: 'process_cpu_usage',
  help: 'Process CPU usage percentage',
  registers: [register]
});

export const processMemory = new Gauge({
  name: 'process_memory_bytes',
  help: 'Process memory usage in bytes',
  registers: [register]
});

// Error metrics
export const errors = new Counter({
  name: 'error_total',
  help: 'Total number of errors',
  labelNames: ['type'],
  registers: [register]
});

// Request metrics
export const requests = new Counter({
  name: 'request_total',
  help: 'Total number of requests',
  registers: [register]
});

// Connection metrics
export const connections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register]
});

export const connectionDrops = new Counter({
  name: 'connection_drops_total',
  help: 'Total number of connection drops',
  registers: [register]
});

// Database metrics
export const dbQueries = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  registers: [register]
});

export const dbQueryTime = new Gauge({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  registers: [register]
});

// Utility functions
export const getCPUUsage = async (): Promise<number> => {
  const value = await processCPU.get();
  return value.values[0].value;
};

export const getMemoryUsage = async (): Promise<number> => {
  const value = await processMemory.get();
  return value.values[0].value;
};

export const getErrorRate = async (): Promise<number> => {
  const errorValue = await errors.get();
  const requestValue = await requests.get();
  const totalErrors = errorValue.values[0].value;
  const totalRequests = requestValue.values[0].value;
  return totalRequests > 0 ? totalErrors / totalRequests : 0;
};

export const getConnectionDropRate = async (): Promise<number> => {
  const dropValue = await connectionDrops.get();
  const connValue = await connections.get();
  const drops = dropValue.values[0].value;
  const total = connValue.values[0].value;
  return total > 0 ? drops / total : 0;
};

// Export metrics
export const metrics = {
  processCPU,
  processMemory,
  errors,
  requests,
  connections,
  connectionDrops,
  dbQueries,
  dbQueryTime,
  getCPUUsage,
  getMemoryUsage,
  getErrorRate,
  getConnectionDropRate,
  redisReconnects: new Counter({
    name: 'redis_reconnects_total',
    help: 'Total number of Redis reconnection attempts'
  }),
  failedBatches: new Counter({
    name: 'failed_batches_total',
    help: 'Total number of failed message batches'
  }),
  serverStatus: new Gauge({
    name: 'server_status',
    help: 'Server operational status (1 = running, 0 = shutting down)'
  }),
  redisHealth: new Gauge({
    name: 'redis_health',
    help: 'Redis connection health status (1 = healthy, 0 = unhealthy)'
  })
};

// Initialize metrics and return registry
export function initializeMetrics() {
  // Reset all metrics
  register.resetMetrics();
  
  // Return the registry for use
  return register;
}

export default register;

export interface MetricsClient {
  recordSocketConnection(): void;
  recordSocketDisconnection(): void;
  recordMessageSent(): void;
  recordMessageDelivered(): void;
  recordMessageRead(): void;
  recordError(type: string): void;
}

export function createMetricsClient() {
  return {
    register,
    httpRequestCounter,
    wsConnectionCounter,
    requestDurationHistogram,
    messageCounter,
    threadCreationDuration,
    threadUpdateDuration,
    threadRetrievalDuration,
    threadErrors,
    threadCacheHits,
    threadCacheMisses,
    activeConnections,
    messagesSent,
    socketErrors
  }
} 