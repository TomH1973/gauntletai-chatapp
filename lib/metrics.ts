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
  name: 'websocket_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['action'],
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

export const metrics = {
  threadCreationDuration,
  threadUpdateDuration,
  threadRetrievalDuration,
  threadErrors,
  threadCacheHits,
  threadCacheMisses,
  activeConnections,
  messagesSent,
  socketErrors,
  rateLimitHits,
  threadParticipants,
  messageDeliveryLatency,
  messageReactions,
  messageAttachments,
  tokenRefreshDuration,
  tokenRefreshSuccess,
  tokenRefreshErrors
}

export default register 

export interface MetricsClient {
  recordSocketConnection(): void;
  recordSocketDisconnection(): void;
  recordMessageSent(): void;
  recordMessageDelivered(): void;
  recordMessageRead(): void;
  recordError(type: string): void;
}

export function createMetricsClient(): MetricsClient {
  return {
    recordSocketConnection() {
      // TODO: Implement socket connection metrics
    },
    recordSocketDisconnection() {
      // TODO: Implement socket disconnection metrics
    },
    recordMessageSent() {
      // TODO: Implement message sent metrics
    },
    recordMessageDelivered() {
      // TODO: Implement message delivered metrics
    },
    recordMessageRead() {
      // TODO: Implement message read metrics
    },
    recordError(type: string) {
      // TODO: Implement error metrics
    }
  };
} 