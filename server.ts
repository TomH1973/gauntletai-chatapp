import express from 'express';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { WebSocketHandlers } from './lib/handlers/websocket';
import { logger } from './lib/logger';
import { metrics } from './lib/metrics';

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Give time for logs to flush
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  // Give time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();
const port = parseInt(process.env.PORT || '3002');

// Initialize Socket.IO
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

// Initialize WebSocket handlers
const handlers = new WebSocketHandlers(io);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const status = {
      status: 'healthy',
      connections: io.engine.clientsCount,
      mode: 'demo',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
    res.status(200).json(status);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Start listening
httpServer.listen(port, () => {
  logger.info(`WebSocket server running on port ${port}`);
});

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

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