import { createServer } from 'http';
import { Server } from 'socket.io';
import { WebSocketHandlers } from './handlers/websocket';
import { logger } from './logger';
import { metrics } from './metrics';

const port = process.env.PORT || 3002;

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      connections: 0, // TODO: Add actual connection count
      metrics: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket'],
  pingTimeout: 10000,
  pingInterval: 5000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8
});

// Initialize handlers in demo mode
const handlers = new WebSocketHandlers(io);

// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    const isHealthy = io.engine.clientsCount >= 0;
    const status = {
      status: isHealthy ? 'healthy' : 'degraded',
      connections: io.engine.clientsCount,
      mode: 'demo',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };

    res.writeHead(isHealthy ? 200 : 503, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify(status));
  }
});

// Start listening
httpServer.listen(port, () => {
  logger.info(`WebSocket server running on port ${port}`);
  metrics.serverStatus.set(1);
});

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  metrics.serverStatus.set(0);

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Give active connections time to disconnect
  const forceShutdownTimeout = setTimeout(() => {
    logger.warn('Force shutting down...');
    process.exit(1);
  }, 30000);

  try {
    // Wait for active connections to close
    const remainingClients = io.engine.clientsCount;
    if (remainingClients > 0) {
      logger.info(`Waiting for ${remainingClients} connections to close...`);
      io.close(() => {
        logger.info('All WebSocket connections closed');
      });
    }

    clearTimeout(forceShutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { httpServer, io }; 