import { NextResponse } from 'next/server';
import { register, Gauge, Counter } from 'prom-client';

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

const httpRequestDuration = new Gauge({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const databaseQueryDuration = new Gauge({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation']
});

// Initialize the metrics
register.setDefaultLabels({
  app: 'chat_application'
});

// Enable the collection of default metrics
register.collectDefaultMetrics();

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
    return new NextResponse('Error generating metrics', { status: 500 });
  }
}

// Export the metrics objects to be used in other parts of the application
export const metrics = {
  activeConnections,
  messagesSent,
  httpRequestDuration,
  databaseQueryDuration
}; 