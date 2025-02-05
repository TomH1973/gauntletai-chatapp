import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { initializeSocketServer } from 'lib/socket';
import { createMetricsClient } from 'lib/metrics';

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Give time for logs to flush
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();
const metrics = createMetricsClient();

async function startServer() {
  try {
    // Initialize Socket.IO server with dependencies
    const io = initializeSocketServer(httpServer, { prisma, metrics });

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      await prisma.$disconnect();
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(console.error); 