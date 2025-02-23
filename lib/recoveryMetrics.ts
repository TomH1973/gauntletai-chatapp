import { Counter, Gauge, Histogram, Registry } from 'prom-client';

const register = new Registry();

// Recovery attempt metrics
const recoveryAttempts = new Counter({
  name: 'recovery_attempts_total',
  help: 'Total number of connection recovery attempts',
  labelNames: ['status'],
  registers: [register]
});

const recoveryDuration = new Histogram({
  name: 'recovery_duration_seconds',
  help: 'Time taken for connection recovery',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const recoveryErrors = new Counter({
  name: 'recovery_errors_total',
  help: 'Total number of recovery errors',
  labelNames: ['type'],
  registers: [register]
});

// Queue metrics
const recoveryQueueLength = new Gauge({
  name: 'recovery_queue_length',
  help: 'Number of items in recovery queue',
  registers: [register]
});

const deadLetterQueueLength = new Gauge({
  name: 'dead_letter_queue_length',
  help: 'Number of items in dead letter queue',
  registers: [register]
});

// Health metrics
const recoveryHealth = new Gauge({
  name: 'recovery_health',
  help: 'Health status of recovery system (0-1)',
  labelNames: ['component'],
  registers: [register]
});

const circuitBreakerStatus = new Gauge({
  name: 'circuit_breaker_status',
  help: 'Circuit breaker status (0=open, 1=closed)',
  labelNames: ['breaker'],
  registers: [register]
});

// Token refresh metrics
const tokenRefreshDuration = new Histogram({
  name: 'token_refresh_duration_seconds',
  help: 'Time taken to refresh authentication token',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const tokenRefreshErrors = new Counter({
  name: 'token_refresh_errors_total',
  help: 'Total number of token refresh errors',
  labelNames: ['type'],
  registers: [register]
});

// Encryption metrics
const encryptionOperations = new Counter({
  name: 'encryption_operations_total',
  help: 'Total number of encryption/decryption operations',
  labelNames: ['operation'],
  registers: [register]
});

const encryptionErrors = new Counter({
  name: 'encryption_errors_total',
  help: 'Total number of encryption/decryption errors',
  labelNames: ['type'],
  registers: [register]
});

// Utility methods
const getRecoveryLatency = async (): Promise<number> => {
  const value = await recoveryDuration.get();
  return value.values[0].value;
};

const getQueueSizes = async (): Promise<{ recovery: number; deadLetter: number }> => {
  const recovery = await recoveryQueueLength.get();
  const deadLetter = await deadLetterQueueLength.get();
  
  return {
    recovery: recovery.values[0].value,
    deadLetter: deadLetter.values[0].value
  };
};

const getSystemHealth = async (): Promise<number> => {
  const health = await recoveryHealth.get();
  const values = health.values.map(v => v.value);
  return values.reduce((acc, val) => acc + val, 0) / values.length;
};

export const recoveryMetrics = {
  // Recovery metrics
  recoveryAttempts,
  recoveryDuration,
  recoveryErrors,
  recoveryQueueLength,
  deadLetterQueueLength,
  recoveryHealth,

  // Circuit breaker metrics
  circuitBreakerStatus,

  // Token metrics
  tokenRefreshDuration,
  tokenRefreshErrors,

  // Encryption metrics
  encryptionOperations,
  encryptionErrors,

  // Utility methods
  getRecoveryLatency,
  getQueueSizes,
  getSystemHealth
};

export default register; 