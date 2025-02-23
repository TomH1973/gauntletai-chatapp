import { Registry, Metric } from 'prom-client';
import { metrics } from './metrics';
import { messageMetrics } from './messageMetrics';
import { threadMetrics } from './threadMetrics';
import { searchMetrics } from './searchMetrics';
import { recoveryMetrics } from './recoveryMetrics';

// Create a new registry that will contain all metrics
const globalRegistry = new Registry();

// Helper function to check if an object is a metric
const isMetric = (obj: any): obj is Metric<any> => {
  return obj && typeof obj === 'object' && 'get' in obj;
};

// Get all metrics from each registry and register them
const registerAllMetrics = () => {
  // Base metrics
  Object.values(metrics).forEach(metric => {
    if (isMetric(metric)) {
      globalRegistry.registerMetric(metric);
    }
  });

  // Message metrics
  Object.values(messageMetrics).forEach(metric => {
    if (isMetric(metric)) {
      globalRegistry.registerMetric(metric);
    }
  });

  // Thread metrics
  Object.values(threadMetrics).forEach(metric => {
    if (isMetric(metric)) {
      globalRegistry.registerMetric(metric);
    }
  });

  // Search metrics
  Object.values(searchMetrics).forEach(metric => {
    if (isMetric(metric)) {
      globalRegistry.registerMetric(metric);
    }
  });

  // Recovery metrics
  Object.values(recoveryMetrics).forEach(metric => {
    if (isMetric(metric)) {
      globalRegistry.registerMetric(metric);
    }
  });
};

// Register all metrics
registerAllMetrics();

// Export all metric groups for direct access
export {
  metrics,
  messageMetrics,
  threadMetrics,
  searchMetrics,
  recoveryMetrics
};

// Export the combined registry as default
export default globalRegistry; 