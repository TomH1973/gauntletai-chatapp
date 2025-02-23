import { Counter, Histogram, Registry } from 'prom-client';

const register = new Registry();

// Thread operation metrics
const threadCreationTime = new Histogram({
  name: 'thread_creation_duration_seconds',
  help: 'Time taken to create a thread',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const threadUpdateTime = new Histogram({
  name: 'thread_update_duration_seconds',
  help: 'Time taken to update a thread',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const threadErrors = new Counter({
  name: 'thread_errors_total',
  help: 'Total number of thread operation errors',
  labelNames: ['type'],
  registers: [register]
});

// Thread state metrics
const stateVerificationTime = new Histogram({
  name: 'thread_state_verification_duration_seconds',
  help: 'Time taken to verify thread state',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const stateRestoreTime = new Histogram({
  name: 'thread_state_restore_duration_seconds',
  help: 'Time taken to restore thread state',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const stateSaveTime = new Histogram({
  name: 'thread_state_save_duration_seconds',
  help: 'Time taken to save thread state',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const stateSize = new Histogram({
  name: 'thread_state_size_bytes',
  help: 'Size of thread state in bytes',
  buckets: [1000, 5000, 10000, 50000, 100000],
  registers: [register]
});

const stateErrors = new Counter({
  name: 'thread_state_errors_total',
  help: 'Total number of state management errors',
  labelNames: ['type'],
  registers: [register]
});

// Thread locking metrics
const lockExtensions = new Counter({
  name: 'thread_lock_extensions_total',
  help: 'Total number of thread lock extensions',
  labelNames: ['threadId'],
  registers: [register]
});

const lockErrors = new Counter({
  name: 'thread_lock_errors_total',
  help: 'Total number of thread lock errors',
  labelNames: ['operation'],
  registers: [register]
});

// Utility methods
const getThreadCreationLatency = async (): Promise<number> => {
  const value = await threadCreationTime.get();
  return value.values[0].value;
};

const getThreadStateSize = async (): Promise<number> => {
  const value = await stateSize.get();
  return value.values[0].value;
};

export const threadMetrics = {
  // Thread operation metrics
  threadCreationTime,
  threadUpdateTime,
  threadErrors,

  // Thread state metrics
  stateVerificationTime,
  stateRestoreTime,
  stateSaveTime,
  stateSize,
  stateErrors,

  // Thread locking metrics
  lockExtensions,
  lockErrors,

  // Utility methods
  getThreadCreationLatency,
  getThreadStateSize
};

export default register; 