const fs = require('fs');
const path = require('path');

// Read test results
const readResults = (filename) => {
  try {
    return JSON.parse(fs.readFileSync(path.join('reports', 'performance', filename)));
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return null;
  }
};

// Generate report
const generateReport = () => {
  const concurrentResults = readResults('concurrent-connections.json');
  const throughputResults = readResults('message-throughput.json');
  const recoveryResults = readResults('recovery.json');

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      status: 'passed',
      totalDuration: 0,
      metrics: {
        connections: {
          max: 0,
          p95Latency: 0,
          errorRate: 0
        },
        messages: {
          throughput: 0,
          p95Latency: 0,
          errorRate: 0
        },
        recovery: {
          p95Duration: 0,
          successRate: 0
        }
      }
    },
    details: {
      concurrent: concurrentResults,
      throughput: throughputResults,
      recovery: recoveryResults
    }
  };

  // Process concurrent connection results
  if (concurrentResults) {
    report.summary.metrics.connections = {
      max: concurrentResults.metrics.active_connections.values.max,
      p95Latency: concurrentResults.metrics.connection_time.values.p95,
      errorRate: 1 - concurrentResults.metrics.connection_success.values.rate
    };
  }

  // Process throughput results
  if (throughputResults) {
    report.summary.metrics.messages = {
      throughput: throughputResults.metrics.message_rate.values.rate,
      p95Latency: throughputResults.metrics.message_latency.values.p95,
      errorRate: throughputResults.metrics.delivery_errors.values.count / 
                throughputResults.metrics.messages_sent_total.values.count
    };
  }

  // Process recovery results
  if (recoveryResults) {
    report.summary.metrics.recovery = {
      p95Duration: recoveryResults.metrics.recovery_duration_seconds.values.p95,
      successRate: recoveryResults.metrics.state_restoration_success.values.rate
    };
  }

  // Calculate total duration
  report.summary.totalDuration = 
    (concurrentResults?.state.testRunDurationMs || 0) +
    (throughputResults?.state.testRunDurationMs || 0) +
    (recoveryResults?.state.testRunDurationMs || 0);

  // Determine overall status
  const slos = {
    connectionLatency: 150,  // ms
    messageLatency: 150,     // ms
    recoveryDuration: 2000,  // ms
    errorRate: 0.01,        // 1%
    successRate: 0.95       // 95%
  };

  report.summary.status = 
    report.summary.metrics.connections.p95Latency <= slos.connectionLatency &&
    report.summary.metrics.messages.p95Latency <= slos.messageLatency &&
    report.summary.metrics.recovery.p95Duration <= slos.recoveryDuration &&
    report.summary.metrics.connections.errorRate <= slos.errorRate &&
    report.summary.metrics.messages.errorRate <= slos.errorRate &&
    report.summary.metrics.recovery.successRate >= slos.successRate
      ? 'passed'
      : 'failed';

  // Write report
  const reportPath = path.join('reports', 'performance', 'final-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate human-readable summary
  const summary = `
Performance Test Results
=======================
Status: ${report.summary.status.toUpperCase()}
Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s

Connection Performance
--------------------
Max Concurrent: ${report.summary.metrics.connections.max}
P95 Latency: ${report.summary.metrics.connections.p95Latency.toFixed(2)}ms
Error Rate: ${(report.summary.metrics.connections.errorRate * 100).toFixed(2)}%

Message Performance
-----------------
Throughput: ${report.summary.metrics.messages.throughput.toFixed(2)} msg/s
P95 Latency: ${report.summary.metrics.messages.p95Latency.toFixed(2)}ms
Error Rate: ${(report.summary.metrics.messages.errorRate * 100).toFixed(2)}%

Recovery Performance
------------------
P95 Duration: ${report.summary.metrics.recovery.p95Duration.toFixed(2)}ms
Success Rate: ${(report.summary.metrics.recovery.successRate * 100).toFixed(2)}%

Generated: ${report.timestamp}
  `;

  fs.writeFileSync(
    path.join('reports', 'performance', 'summary.txt'),
    summary
  );

  console.log(summary);
};

generateReport(); 