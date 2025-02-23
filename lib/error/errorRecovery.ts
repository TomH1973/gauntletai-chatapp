import { Redis } from 'ioredis';
import { metrics } from '../metrics';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

interface RetryConfig {
  maxAttempts: number;
  backoffMs: number[];
  timeout: number;
  priority: 'high' | 'medium' | 'low';
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
  };
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  status: 'closed' | 'open' | 'half-open';
}

interface RecoveryTask {
  id: string;
  type: string;
  data: any;
  attempts: number;
  lastAttempt: number;
  error?: string;
  priority: 'high' | 'medium' | 'low';
  context?: {
    userId?: string;
    threadId?: string;
    messageId?: string;
    correlationId?: string;
  };
}

interface RecoveryStrategy {
  validate?: (data: any) => Promise<boolean>;
  transform?: (data: any) => Promise<any>;
  fallback?: (data: any) => Promise<any>;
  cleanup?: (data: any) => Promise<void>;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffMs: [1000, 5000, 15000], // 1s, 5s, 15s
  timeout: 30000, // 30s
  priority: 'medium',
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000 // 1 minute
  }
};

class ErrorRecovery extends EventEmitter {
  private redis: Redis;
  private retryConfigs: Map<string, RetryConfig>;
  private processing: boolean;
  private handlers: Map<string, (data: any) => Promise<void>>;
  private strategies: Map<string, RecoveryStrategy>;
  private circuitBreakers: Map<string, CircuitBreakerState>;
  private readonly RECOVERY_QUEUE = 'error:recovery:queue';
  private readonly DEAD_LETTER_QUEUE = 'error:dead:queue';
  private readonly RETENTION_DAYS = 7;
  private healthCheck: NodeJS.Timeout;

  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
    this.retryConfigs = new Map();
    this.handlers = new Map();
    this.strategies = new Map();
    this.circuitBreakers = new Map();
    this.processing = false;

    // Start processing loop
    this.startProcessing();

    // Cleanup old dead letter entries periodically
    setInterval(() => this.cleanupDeadLetters(), 24 * 60 * 60 * 1000);

    // Health check
    this.healthCheck = setInterval(() => this.checkHealth(), 60000);

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      await this.stop();
    });
  }

  registerHandler(
    type: string, 
    handler: (data: any) => Promise<void>, 
    config?: Partial<RetryConfig>,
    strategy?: RecoveryStrategy
  ) {
    this.handlers.set(type, handler);
    this.retryConfigs.set(type, {
      ...DEFAULT_RETRY_CONFIG,
      ...config
    });
    if (strategy) {
      this.strategies.set(type, strategy);
    }
    this.circuitBreakers.set(type, {
      failures: 0,
      lastFailure: 0,
      status: 'closed'
    });
  }

  private async checkCircuitBreaker(type: string): Promise<boolean> {
    const breaker = this.circuitBreakers.get(type);
    const config = this.retryConfigs.get(type);
    
    if (!breaker || !config?.circuitBreaker) return true;

    const now = Date.now();

    switch (breaker.status) {
      case 'open':
        if (now - breaker.lastFailure >= config.circuitBreaker.resetTimeout) {
          breaker.status = 'half-open';
          return true;
        }
        return false;

      case 'half-open':
        return true;

      case 'closed':
        return true;
    }
  }

  private async updateCircuitBreaker(type: string, success: boolean): Promise<void> {
    const breaker = this.circuitBreakers.get(type);
    const config = this.retryConfigs.get(type);
    
    if (!breaker || !config?.circuitBreaker) return;

    if (success) {
      if (breaker.status === 'half-open') {
        breaker.status = 'closed';
      }
      breaker.failures = 0;
    } else {
      breaker.failures++;
      breaker.lastFailure = Date.now();
      
      if (breaker.failures >= config.circuitBreaker.failureThreshold) {
        breaker.status = 'open';
        this.emit('circuitBreakerOpen', { type, failures: breaker.failures });
      }
    }
  }

  async enqueueForRetry(
    type: string, 
    data: any, 
    error?: Error,
    context?: RecoveryTask['context']
  ): Promise<void> {
    const config = this.retryConfigs.get(type) || DEFAULT_RETRY_CONFIG;
    
    const task: RecoveryTask = {
      id: uuidv4(),
      type,
      data,
      attempts: 0,
      lastAttempt: Date.now(),
      error: error?.message,
      priority: config.priority,
      context
    };

    // Use Redis transaction for atomic operations
    const multi = this.redis.multi();
    multi.rpush(this.RECOVERY_QUEUE, JSON.stringify(task));
    multi.publish('recovery:new-task', JSON.stringify({ type, id: task.id }));
    
    await multi.exec();
    
    metrics.recoveryQueueLength.inc();
    this.emit('taskEnqueued', task);
  }

  private async processTask(task: RecoveryTask): Promise<boolean> {
    const handler = this.handlers.get(task.type);
    const config = this.retryConfigs.get(task.type) || DEFAULT_RETRY_CONFIG;
    const strategy = this.strategies.get(task.type);

    if (!handler) {
      console.error(`No handler registered for task type: ${task.type}`);
      return false;
    }

    // Check circuit breaker
    if (!await this.checkCircuitBreaker(task.type)) {
      console.warn(`Circuit breaker open for task type: ${task.type}`);
      return false;
    }

    const startTime = Date.now();
    try {
      // Validate data if strategy exists
      if (strategy?.validate) {
        const isValid = await strategy.validate(task.data);
        if (!isValid) {
          throw new Error('Data validation failed');
        }
      }

      // Transform data if needed
      if (strategy?.transform) {
        task.data = await strategy.transform(task.data);
      }

      // Execute handler with timeout
      await Promise.race([
        handler(task.data),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Task timeout')), config.timeout)
        )
      ]);

      await this.updateCircuitBreaker(task.type, true);
      metrics.recoveryAttempts.inc({ 
        success: '1', 
        type: task.type 
      });
      metrics.recoveryDuration.observe({ type: task.type }, (Date.now() - startTime) / 1000);
      return true;
    } catch (error) {
      console.error(`Recovery attempt failed for task ${task.id}:`, error);
      
      // Try fallback if available
      if (strategy?.fallback) {
        try {
          await strategy.fallback(task.data);
          return true;
        } catch (fallbackError) {
          console.error(`Fallback failed for task ${task.id}:`, fallbackError);
        }
      }

      await this.updateCircuitBreaker(task.type, false);
      metrics.recoveryAttempts.inc({ 
        success: '0', 
        type: task.type 
      });
      return false;
    } finally {
      // Always run cleanup if defined
      if (strategy?.cleanup) {
        try {
          await strategy.cleanup(task.data);
        } catch (cleanupError) {
          console.error(`Cleanup failed for task ${task.id}:`, cleanupError);
        }
      }
    }
  }

  private async moveToDeadLetter(task: RecoveryTask): Promise<void> {
    const deadTask = {
      ...task,
      movedAt: Date.now()
    };

    const multi = this.redis.multi();
    multi.rpush(this.DEAD_LETTER_QUEUE, JSON.stringify(deadTask));
    multi.publish('recovery:dead-letter', JSON.stringify({ type: task.type, id: task.id }));
    
    await multi.exec();
    
    metrics.deadLetterQueueLength.inc();
    this.emit('taskDeadLettered', deadTask);
  }

  private async startProcessing(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.processing) {
      try {
        // Process high priority tasks first
        for (const priority of ['high', 'medium', 'low'] as const) {
          const tasks = await this.redis.lrange(this.RECOVERY_QUEUE, 0, -1);
          const priorityTasks = tasks
            .map(t => JSON.parse(t))
            .filter((t: RecoveryTask) => t.priority === priority);

          for (const task of priorityTasks) {
            const config = this.retryConfigs.get(task.type) || DEFAULT_RETRY_CONFIG;

            // Check if we should retry
            if (task.attempts >= config.maxAttempts) {
              await this.moveToDeadLetter(task);
              await this.redis.lrem(this.RECOVERY_QUEUE, 1, JSON.stringify(task));
              metrics.recoveryQueueLength.dec();
              continue;
            }

            // Wait for backoff time
            const backoffTime = config.backoffMs[task.attempts] || config.backoffMs[config.backoffMs.length - 1];
            await new Promise(resolve => setTimeout(resolve, backoffTime));

            // Attempt recovery
            task.attempts++;
            task.lastAttempt = Date.now();

            const success = await this.processTask(task);
            if (!success) {
              // Re-enqueue for retry
              await this.redis.lrem(this.RECOVERY_QUEUE, 1, JSON.stringify(task));
              await this.redis.rpush(this.RECOVERY_QUEUE, JSON.stringify(task));
            } else {
              await this.redis.lrem(this.RECOVERY_QUEUE, 1, JSON.stringify(task));
              metrics.recoveryQueueLength.dec();
            }
          }
        }

        // Brief pause before next iteration
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error in recovery processing loop:', error);
        metrics.recoveryErrors.inc({ type: 'processing_loop' });
        // Brief pause before continuing
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async checkHealth(): Promise<void> {
    try {
      const queueLength = await this.getQueueLength();
      const deadLetterLength = await this.getDeadLetterLength();
      const circuitBreakerStates = Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([type, state]) => [type, state.status])
      );

      metrics.recoveryHealth.set({
        queue_length: queueLength,
        dead_letter_length: deadLetterLength,
        circuit_breakers: JSON.stringify(circuitBreakerStates)
      }, 1);

      this.emit('healthCheck', {
        status: 'healthy',
        queueLength,
        deadLetterLength,
        circuitBreakerStates
      });
    } catch (error) {
      console.error('Health check failed:', error);
      metrics.recoveryHealth.set({ status: 'unhealthy' }, 0);
      this.emit('healthCheck', { status: 'unhealthy', error });
    }
  }

  private async cleanupDeadLetters(): Promise<void> {
    try {
      const cutoff = Date.now() - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const tasks = await this.redis.lrange(this.DEAD_LETTER_QUEUE, 0, -1);
      
      const tasksToKeep = tasks.filter(taskJson => {
        const task = JSON.parse(taskJson);
        return task.movedAt > cutoff;
      });

      if (tasksToKeep.length !== tasks.length) {
        await this.redis.del(this.DEAD_LETTER_QUEUE);
        if (tasksToKeep.length > 0) {
          await this.redis.rpush(this.DEAD_LETTER_QUEUE, ...tasksToKeep);
        }
        metrics.deadLetterQueueLength.set(tasksToKeep.length);
      }
    } catch (error) {
      console.error('Dead letter cleanup failed:', error);
    }
  }

  async stop(): Promise<void> {
    this.processing = false;
    await this.redis.quit();
  }

  // Utility methods for monitoring and management
  async getQueueLength(): Promise<number> {
    return this.redis.llen(this.RECOVERY_QUEUE);
  }

  async getDeadLetterLength(): Promise<number> {
    return this.redis.llen(this.DEAD_LETTER_QUEUE);
  }

  async retryDeadLettered(type?: string): Promise<number> {
    const tasks = await this.redis.lrange(this.DEAD_LETTER_QUEUE, 0, -1);
    let retriedCount = 0;

    for (const taskJson of tasks) {
      const task: RecoveryTask = JSON.parse(taskJson);
      if (!type || task.type === type) {
        task.attempts = 0;
        task.lastAttempt = Date.now();
        await this.redis.rpush(this.RECOVERY_QUEUE, JSON.stringify(task));
        retriedCount++;
      }
    }

    if (retriedCount > 0) {
      if (type) {
        // Remove only tasks of specified type
        const remainingTasks = tasks.filter(taskJson => {
          const task = JSON.parse(taskJson);
          return task.type !== type;
        });
        await this.redis.del(this.DEAD_LETTER_QUEUE);
        if (remainingTasks.length > 0) {
          await this.redis.rpush(this.DEAD_LETTER_QUEUE, ...remainingTasks);
        }
      } else {
        // Clear entire queue
        await this.redis.del(this.DEAD_LETTER_QUEUE);
      }
      
      metrics.deadLetterQueueLength.dec(retriedCount);
      metrics.recoveryQueueLength.inc(retriedCount);
    }

    return retriedCount;
  }
}

export const errorRecovery = new ErrorRecovery(); 