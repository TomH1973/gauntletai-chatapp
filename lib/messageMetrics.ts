import { Counter, Histogram, Registry } from 'prom-client';

const register = new Registry();

// Message delivery metrics
export const messageDeliveryTime = new Histogram({
  name: 'message_delivery_seconds',
  help: 'Time taken to deliver messages',
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 2, 5],
  registers: [register]
});

export const messagesSent = new Counter({
  name: 'messages_sent_total',
  help: 'Total number of messages sent',
  registers: [register]
});

export const missedEvents = new Counter({
  name: 'missed_events_total',
  help: 'Total number of events missed during disconnection',
  labelNames: ['type'],
  registers: [register]
});

// Batch metrics
export const batchSize = new Histogram({
  name: 'message_batch_size',
  help: 'Size of message batches',
  buckets: [10, 20, 50, 100, 200, 500],
  registers: [register]
});

export const batchProcessingTime = new Histogram({
  name: 'batch_processing_seconds',
  help: 'Time taken to process message batches',
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 2, 5],
  registers: [register]
});

export const messageQueueLength = new Histogram({
  name: 'message_queue_length',
  help: 'Number of messages in the queue',
  buckets: [10, 20, 50, 100, 200, 500],
  registers: [register]
});

// Message processing metrics
export const messageProcessingTime = new Histogram({
  name: 'message_processing_seconds',
  help: 'Time taken to process messages',
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 2, 5],
  registers: [register]
});

export const messageErrors = new Counter({
  name: 'message_errors_total',
  help: 'Total number of message processing errors',
  labelNames: ['type'],
  registers: [register]
});

// Utility methods
export const getMessageDeliveryLatency = async (): Promise<number> => {
  const value = await messageDeliveryTime.get();
  return value.values[0].value;
};

export const getMessageQueueSize = async (): Promise<number> => {
  const value = await messageQueueLength.get();
  return value.values[0].value;
};

export const messageMetrics = {
  // Metric instances
  messageDeliveryTime,
  messagesSent,
  missedEvents,
  batchSize,
  batchProcessingTime,
  messageQueueLength,
  messageProcessingTime,
  messageErrors,

  // Utility methods
  getMessageDeliveryLatency,
  getMessageQueueSize
};

export default register; 