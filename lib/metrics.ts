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

// Active connections gauge
export const activeConnections = new Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections'
});

// Messages sent counter
export const messagesSent = new Counter({
  name: 'websocket_messages_sent_total',
  help: 'Total number of messages sent',
  labelNames: ['status']
});

// Socket errors counter
export const socketErrors = new Counter({
  name: 'websocket_errors_total',
  help: 'Total number of WebSocket errors',
  labelNames: ['code']
});

// Rate limit hits counter
export const rateLimitHits = new Counter({
  name: 'websocket_rate_limit_hits_total',
  help: 'Total number of rate limit hits'
});

// Thread participants gauge
export const threadParticipants = new Gauge({
  name: 'websocket_thread_participants',
  help: 'Number of participants per thread',
  labelNames: ['threadId']
});

// Message delivery latency histogram
export const messageDeliveryLatency = new Gauge({
  name: 'websocket_message_delivery_latency_seconds',
  help: 'Message delivery latency in seconds',
  labelNames: ['threadId']
});

// Message reactions counter
export const messageReactions = new Counter({
  name: 'websocket_message_reactions_total',
  help: 'Total number of message reactions',
  labelNames: ['type']
});

// Message attachments counter
export const messageAttachments = new Counter({
  name: 'websocket_message_attachments_total',
  help: 'Total number of message attachments',
  labelNames: ['type', 'count'],
  registers: [register]
});

export const metrics = {
  activeConnections,
  messagesSent,
  socketErrors,
  rateLimitHits,
  threadParticipants,
  messageDeliveryLatency,
  messageReactions,
  messageAttachments
};

export default register 