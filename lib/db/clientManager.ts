import { PrismaClient } from '@prisma/client';
import { metrics } from '@/app/api/metrics/route';
import { Redis } from '@upstash/redis';

interface ReplicaConfig {
  url: string;
  weight?: number;
}

interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMs: number;
}

export class DatabaseClientManager {
  private writeClient: PrismaClient;
  private readClients: PrismaClient[];
  private currentReplicaIndex: number = 0;
  private queryCache: Redis;

  constructor(
    writeUrl: string, 
    replicaUrls: ReplicaConfig[],
    poolConfig: PoolConfig = { min: 2, max: 10, idleTimeoutMs: 30000 }
  ) {
    // Initialize write client with connection pooling
    this.writeClient = new PrismaClient({
      datasources: { db: { url: writeUrl } },
      log: ['query', 'error', 'warn'],
      // Configure connection pool
      connection: {
        pool: {
          min: poolConfig.min,
          max: poolConfig.max,
          idleTimeoutMillis: poolConfig.idleTimeoutMs,
        }
      }
    }).$extends({
      query: {
        async $allOperations({ operation, model, args, query }) {
          const start = performance.now();
          
          try {
            const result = await query(args);
            const duration = performance.now() - start;
            
            // Record metrics
            metrics.databaseQueryDuration.observe({
              operation,
              model,
              success: 'true'
            }, duration);
            
            return result;
          } catch (error) {
            const duration = performance.now() - start;
            
            // Record error metrics
            metrics.databaseQueryDuration.observe({
              operation,
              model,
              success: 'false'
            }, duration);
            
            throw error;
          }
        }
      }
    });

    // Initialize read replicas with connection pooling
    this.readClients = replicaUrls.map(replica => 
      new PrismaClient({
        datasources: { db: { url: replica.url } },
        log: ['query', 'error', 'warn'],
        connection: {
          pool: {
            min: Math.max(1, Math.floor(poolConfig.min / 2)),
            max: Math.max(2, Math.floor(poolConfig.max / 2)),
            idleTimeoutMillis: poolConfig.idleTimeoutMs,
          }
        }
      })
    );

    // Initialize query cache
    this.queryCache = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!,
    });
  }

  // Get client for write operations
  get write(): PrismaClient {
    return this.writeClient;
  }

  // Get client for read operations using round-robin
  get read(): PrismaClient {
    if (this.readClients.length === 0) {
      return this.writeClient;
    }

    const client = this.readClients[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.readClients.length;
    return client;
  }

  // Cache wrapper for read operations
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttlSeconds: number = 60
  ): Promise<T> {
    const cached = await this.queryCache.get<T>(key);
    if (cached) {
      metrics.cacheHits.inc({ type: 'query' });
      return cached;
    }

    metrics.cacheMisses.inc({ type: 'query' });
    const result = await queryFn();
    await this.queryCache.set(key, result, { ex: ttlSeconds });
    return result;
  }

  // Health check for all connections
  async checkHealth(): Promise<{
    write: boolean;
    read: boolean[];
    cache: boolean;
  }> {
    try {
      const writeHealth = await this.writeClient.$queryRaw`SELECT 1`
        .then(() => true)
        .catch(() => false);

      const readHealth = await Promise.all(
        this.readClients.map(client =>
          client.$queryRaw`SELECT 1`
            .then(() => true)
            .catch(() => false)
        )
      );

      const cacheHealth = await this.queryCache.ping()
        .then(() => true)
        .catch(() => false);

      return {
        write: writeHealth,
        read: readHealth,
        cache: cacheHealth
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        write: false,
        read: this.readClients.map(() => false),
        cache: false
      };
    }
  }

  // Close all connections
  async disconnect(): Promise<void> {
    await Promise.all([
      this.writeClient.$disconnect(),
      ...this.readClients.map(client => client.$disconnect())
    ]);
  }
} 