import { PrismaClient } from '@prisma/client';

interface ReplicaConfig {
  url: string;
  weight?: number; // For weighted load balancing
}

export class DatabaseClientManager {
  private writeClient: PrismaClient;
  private readClients: PrismaClient[];
  private currentReplicaIndex: number = 0;

  constructor(writeUrl: string, replicaUrls: ReplicaConfig[]) {
    // Initialize write client
    this.writeClient = new PrismaClient({
      datasources: { db: { url: writeUrl } }
    });

    // Initialize read replicas
    this.readClients = replicaUrls.map(replica => new PrismaClient({
      datasources: { db: { url: replica.url } }
    }));
  }

  // Get client for write operations
  get write(): PrismaClient {
    return this.writeClient;
  }

  // Get client for read operations using round-robin
  get read(): PrismaClient {
    if (this.readClients.length === 0) {
      return this.writeClient; // Fallback to write client if no replicas
    }

    const client = this.readClients[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.readClients.length;
    return client;
  }

  // Health check for all connections
  async checkHealth(): Promise<boolean> {
    try {
      // Check write client
      await this.writeClient.$queryRaw`SELECT 1`;

      // Check read clients
      for (const client of this.readClients) {
        await client.$queryRaw`SELECT 1`;
      }

      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Disconnect all clients
  async disconnect(): Promise<void> {
    await Promise.all([
      this.writeClient.$disconnect(),
      ...this.readClients.map(client => client.$disconnect())
    ]);
  }
} 