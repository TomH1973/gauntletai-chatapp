# Error Monitoring Implementation

## Logging Implementation

### 1. Error Logger Setup
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

export const errorLogger = logger.child({ component: 'error' });
```

### 2. Error Context Collection
```typescript
interface ErrorContext {
  userId?: string;
  requestId: string;
  path: string;
  method: string;
  timestamp: string;
  input?: unknown;
  errorCode: string;
}

export function logError(error: Error, context: ErrorContext) {
  errorLogger.error({
    err: error,
    ...context,
  });
}
```

## Monitoring Integration

### 1. API Middleware
```typescript
// middleware/error-handler.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { logError } from '@/lib/logger';

export function errorHandler(
  error: Error,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = req.headers['x-request-id'] as string;
  
  logError(error, {
    requestId,
    path: req.url!,
    method: req.method!,
    userId: req.auth?.userId,
    timestamp: new Date().toISOString(),
    input: req.body,
    errorCode: getErrorCode(error),
  });

  // Send appropriate response
  const { status, body } = formatErrorResponse(error);
  res.status(status).json(body);
}
```

### 2. WebSocket Error Handling
```typescript
// lib/socket.ts
socket.on('error', (error) => {
  logError(error, {
    requestId: generateRequestId(),
    path: 'websocket',
    method: 'WS',
    userId: socket.auth?.userId,
    timestamp: new Date().toISOString(),
    errorCode: 'ws_error',
  });
});
```

## Alerting Configuration

### 1. Error Thresholds
```typescript
// config/monitoring.ts
export const alertThresholds = {
  errors: {
    critical: {
      count: 10,
      timeWindow: '5m',
    },
    warning: {
      count: 5,
      timeWindow: '5m',
    },
  },
  performance: {
    responseTime: {
      p95: 1000, // ms
      p99: 2000, // ms
    },
  },
};
```

### 2. Health Checks
```typescript
// pages/api/health.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Basic health check
    const health = {
      uptime: process.uptime(),
      timestamp: Date.now(),
      status: 'healthy',
    };

    // Database check
    const dbHealth = await checkDatabaseConnection();
    
    // WebSocket check
    const wsHealth = await checkWebSocketServer();

    res.status(200).json({
      ...health,
      checks: {
        database: dbHealth,
        websocket: wsHealth,
      },
    });
  } catch (error) {
    logError(error, {
      requestId: req.headers['x-request-id'] as string,
      path: '/api/health',
      method: 'GET',
      timestamp: new Date().toISOString(),
      errorCode: 'health_check_failed',
    });

    res.status(503).json({
      status: 'unhealthy',
      error: formatErrorResponse(error),
    });
  }
}
```

## Metrics Collection

### 1. Performance Metrics
```typescript
// lib/metrics.ts
import { Gauge, Counter } from 'prom-client';

export const responseTimeHistogram = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in ms',
  labelNames: ['method', 'path', 'status'],
});

export const errorCounter = new Counter({
  name: 'error_total',
  help: 'Total number of errors',
  labelNames: ['code', 'path'],
});
```

### 2. Resource Monitoring
```typescript
// lib/metrics.ts
export const activeConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
});

export const databaseConnectionPool = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
});
```

## Dashboard Configuration

### 1. Error Dashboard
```typescript
// monitoring/dashboards/errors.ts
export const errorDashboard = {
  panels: [
    {
      title: 'Error Rate',
      metric: 'error_total',
      type: 'graph',
      interval: '1m',
    },
    {
      title: 'Error Distribution',
      metric: 'error_total',
      type: 'pie',
      dimension: 'code',
    },
    {
      title: 'Response Time',
      metric: 'http_request_duration_ms',
      type: 'heatmap',
    },
  ],
};
```

### 2. Resource Dashboard
```typescript
// monitoring/dashboards/resources.ts
export const resourceDashboard = {
  panels: [
    {
      title: 'WebSocket Connections',
      metric: 'websocket_connections_active',
      type: 'gauge',
    },
    {
      title: 'Database Connections',
      metric: 'database_connections_active',
      type: 'gauge',
    },
    {
      title: 'Memory Usage',
      metric: 'process_resident_memory_bytes',
      type: 'graph',
    },
  ],
}; 