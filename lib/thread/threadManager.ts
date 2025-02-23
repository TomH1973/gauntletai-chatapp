import { PrismaClient } from '@prisma/client';
import { metrics } from '../metrics';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

interface VectorClock {
  [nodeId: string]: number;
}

interface ThreadOperation {
  id: string;
  threadId: string;
  operation: 'update' | 'message' | 'merge';
  timestamp: VectorClock;
  data: any;
  parentTimestamp?: VectorClock;
}

interface ThreadLock {
  nodeId: string;
  acquiredAt: number;
  operationId: string;
  expiresAt: number;
}

interface ThreadState {
  operations: ThreadOperation[];
  lastMerged: number;
}

class ThreadManager {
  private prisma: PrismaClient;
  private redis: Redis;
  private nodeId: string;
  private vectorClock: VectorClock;
  private readonly LOCK_TTL = 30; // seconds
  private readonly LOCK_EXTENSION_INTERVAL = 10; // seconds
  private readonly MAX_LOCK_DURATION = 90; // seconds
  private activeLocks: Map<string, NodeJS.Timeout>;
  private readonly MERGE_INTERVAL = 5000; // 5 seconds
  private readonly MAX_OPERATIONS = 1000;
  private mergeJobs: Map<string, NodeJS.Timeout>;
  private threadStates: Map<string, ThreadState>;

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
    this.nodeId = uuidv4();
    this.vectorClock = { [this.nodeId]: 0 };
    this.activeLocks = new Map();
    this.mergeJobs = new Map();
    this.threadStates = new Map();

    // Start background merge process
    setInterval(() => this.cleanupMergeJobs(), 60000);
  }

  private async getVectorClock(threadId: string): Promise<VectorClock> {
    const clockKey = `thread:${threadId}:vclock`;
    const clock = await this.redis.get(clockKey);
    return clock ? JSON.parse(clock) : { [this.nodeId]: 0 };
  }

  private async updateVectorClock(threadId: string, clock: VectorClock): Promise<void> {
    const clockKey = `thread:${threadId}:vclock`;
    await this.redis.set(clockKey, JSON.stringify(clock));
  }

  private async incrementVectorClock(threadId: string): Promise<VectorClock> {
    const clock = await this.getVectorClock(threadId);
    clock[this.nodeId] = (clock[this.nodeId] || 0) + 1;
    await this.updateVectorClock(threadId, clock);
    return clock;
  }

  private async acquireLock(threadId: string, operationId: string): Promise<boolean> {
    const lockKey = `thread:${threadId}:lock`;
    const now = Date.now();
    const lockData: ThreadLock = {
      nodeId: this.nodeId,
      acquiredAt: now,
      operationId,
      expiresAt: now + (this.LOCK_TTL * 1000)
    };
    
    // Use Redis transaction for atomic lock acquisition
    const result = await this.redis
      .multi()
      .get(lockKey)
      .set(lockKey, JSON.stringify(lockData), 'PX', this.LOCK_TTL * 1000)
      .exec();

    const [getErr, currentLock] = result![0];
    const [setErr, acquired] = result![1];

    if (getErr || setErr) {
      console.error('Lock operation failed:', { getErr, setErr });
      return false;
    }

    if (currentLock) {
      const existing = JSON.parse(currentLock as string) as ThreadLock;
      if (existing.expiresAt < now) {
        // Force release expired lock
        await this.releaseLock(threadId, existing.operationId);
        return this.acquireLock(threadId, operationId);
      }
      return false;
    }

    if (acquired === 'OK') {
      // Set up lock extension
      const extensionInterval = setInterval(async () => {
        try {
          const currentLock = await this.redis.get(lockKey);
          if (!currentLock) return;
          
          const lockInfo = JSON.parse(currentLock) as ThreadLock;
          if (lockInfo.nodeId !== this.nodeId || lockInfo.operationId !== operationId) {
            clearInterval(extensionInterval);
            return;
          }

          if (Date.now() - lockInfo.acquiredAt >= this.MAX_LOCK_DURATION * 1000) {
            clearInterval(extensionInterval);
            await this.releaseLock(threadId, operationId);
            return;
          }

          // Extend lock with updated expiration
          const extended = await this.redis
            .multi()
            .get(lockKey)
            .set(
              lockKey,
              JSON.stringify({ ...lockInfo, expiresAt: Date.now() + (this.LOCK_TTL * 1000) }),
              'PX',
              this.LOCK_TTL * 1000
            )
            .exec();

          if (extended![1][1] === 'OK') {
            metrics.lockExtensions.inc({ threadId });
          }
        } catch (error) {
          console.error('Lock extension failed:', error);
          metrics.lockErrors.inc({ operation: 'extend' });
        }
      }, this.LOCK_EXTENSION_INTERVAL * 1000);

      this.activeLocks.set(`${threadId}:${operationId}`, extensionInterval);
      return true;
    }

    return false;
  }

  private async releaseLock(threadId: string, operationId: string): Promise<void> {
    const lockKey = `thread:${threadId}:lock`;
    const script = `
      local current = redis.call("get", KEYS[1])
      if current then
        local lock = cjson.decode(current)
        if lock.nodeId == ARGV[1] and lock.operationId == ARGV[2] then
          return redis.call("del", KEYS[1])
        end
      end
      return 0
    `;
    
    try {
      await this.redis.eval(script, 1, lockKey, this.nodeId, operationId);
    } finally {
      const interval = this.activeLocks.get(`${threadId}:${operationId}`);
      if (interval) {
        clearInterval(interval);
        this.activeLocks.delete(`${threadId}:${operationId}`);
      }
    }
  }

  private async getOperationLog(threadId: string): Promise<ThreadOperation[]> {
    const logKey = `thread:${threadId}:oplog`;
    const log = await this.redis.lrange(logKey, 0, -1);
    return log.map(entry => JSON.parse(entry));
  }

  private async appendOperation(operation: ThreadOperation): Promise<void> {
    const logKey = `thread:${operation.threadId}:oplog`;
    await this.redis.rpush(logKey, JSON.stringify(operation));
    // Keep last 1000 operations
    await this.redis.ltrim(logKey, -1000, -1);
  }

  private async resolveConflicts(operations: ThreadOperation[]): Promise<ThreadOperation[]> {
    // Sort by timestamp using vector clock comparison
    return operations.sort((a, b) => {
      for (const nodeId of Object.keys({ ...a.timestamp, ...b.timestamp })) {
        const aTime = a.timestamp[nodeId] || 0;
        const bTime = b.timestamp[nodeId] || 0;
        if (aTime !== bTime) {
          return aTime - bTime;
        }
      }
      return 0;
    });
  }

  private async scheduleMerge(threadId: string): Promise<void> {
    if (this.mergeJobs.has(threadId)) return;

    const timeout = setTimeout(async () => {
      try {
        await this.mergeOperations(threadId);
      } finally {
        this.mergeJobs.delete(threadId);
      }
    }, this.MERGE_INTERVAL);

    this.mergeJobs.set(threadId, timeout);
  }

  private async mergeOperations(threadId: string): Promise<void> {
    const operationId = uuidv4();
    const hasLock = await this.acquireLock(threadId, operationId);
    if (!hasLock) return;

    try {
      const operations = await this.getOperationLog(threadId);
      if (operations.length < 2) return;

      const state = this.threadStates.get(threadId) || { operations: [], lastMerged: 0 };
      const newOperations = operations.filter(op => op.timestamp[this.nodeId] > state.lastMerged);
      
      if (newOperations.length < 2) return;

      const resolvedOperations = await this.resolveConflicts(newOperations);
      const mergedOperation: ThreadOperation = {
        id: uuidv4(),
        threadId,
        operation: 'merge',
        timestamp: await this.incrementVectorClock(threadId),
        data: resolvedOperations[resolvedOperations.length - 1].data,
        parentTimestamp: resolvedOperations.reduce((acc, op) => ({ ...acc, ...op.timestamp }), {})
      };

      // Atomic operation to update thread and operation log
      await this.redis
        .multi()
        .del(`thread:${threadId}:oplog`)
        .rpush(`thread:${threadId}:oplog`, JSON.stringify(mergedOperation))
        .exec();

      state.operations = [mergedOperation];
      state.lastMerged = mergedOperation.timestamp[this.nodeId];
      this.threadStates.set(threadId, state);

      // Update thread state in database
      await this.prisma.thread.update({
        where: { id: threadId },
        data: mergedOperation.data
      });
    } finally {
      await this.releaseLock(threadId, operationId);
    }
  }

  private async cleanupMergeJobs(): Promise<void> {
    for (const [threadId, timeout] of this.mergeJobs.entries()) {
      clearTimeout(timeout);
      this.mergeJobs.delete(threadId);
      await this.mergeOperations(threadId);
    }
  }

  async updateThread(threadId: string, data: any): Promise<void> {
    const startTime = Date.now();
    let success = false;
    const operationId = uuidv4();
    
    try {
      const hasLock = await this.acquireLock(threadId, operationId);
      if (!hasLock) {
        throw new Error('Failed to acquire lock');
      }

      const operation: ThreadOperation = {
        id: uuidv4(),
        threadId,
        operation: 'update',
        timestamp: await this.incrementVectorClock(threadId),
        data
      };

      await this.appendOperation(operation);
      await this.scheduleMerge(threadId);

      // Optimistically update thread
      await this.prisma.thread.update({
        where: { id: threadId },
        data
      });

      success = true;
    } catch (error) {
      console.error('Thread update failed:', error);
      metrics.threadErrors.inc({ operation: 'update' });
      throw error;
    } finally {
      await this.releaseLock(threadId, operationId);
      const duration = (Date.now() - startTime) / 1000;
      metrics.threadUpdateDuration.observe({ success: success ? 1 : 0 }, duration);
    }
  }

  async addMessage(threadId: string, message: any): Promise<void> {
    const startTime = Date.now();
    let success = false;
    const operationId = uuidv4();

    try {
      const hasLock = await this.acquireLock(threadId, operationId);
      if (!hasLock) {
        throw new Error('Failed to acquire lock');
      }

      const operation: ThreadOperation = {
        id: uuidv4(),
        threadId,
        operation: 'message',
        timestamp: await this.incrementVectorClock(threadId),
        data: message
      };

      await this.appendOperation(operation);

      // Update thread's last message timestamp
      await this.prisma.thread.update({
        where: { id: threadId },
        data: { lastMessageAt: new Date() }
      });

      success = true;
    } catch (error) {
      console.error('Message add failed:', error);
      metrics.threadErrors.inc({ operation: 'message' });
      throw error;
    } finally {
      await this.releaseLock(threadId, operationId);
      const duration = (Date.now() - startTime) / 1000;
      metrics.messageDeliveryLatency.observe(duration);
    }
  }

  async getThread(threadId: string): Promise<any> {
    const startTime = Date.now();
    let success = false;

    try {
      const thread = await this.prisma.thread.findUnique({
        where: { id: threadId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!thread) {
        throw new Error('Thread not found');
      }

      success = true;
      return thread;
    } catch (error) {
      console.error('Thread retrieval failed:', error);
      metrics.threadErrors.inc({ operation: 'get' });
      throw error;
    } finally {
      const duration = (Date.now() - startTime) / 1000;
      metrics.threadRetrievalDuration.observe({ success: success ? 1 : 0 }, duration);
    }
  }
}

export const threadManager = new ThreadManager(); 