const fs = require('fs');

// Read test results
const messageLoadResults = JSON.parse(fs.readFileSync('message-load.json', 'utf8'));
const realtimeStressResults = JSON.parse(fs.readFileSync('realtime-stress.json', 'utf8'));
const connectionStressResults = JSON.parse(fs.readFileSync('connection-stress.json', 'utf8'));

// Generate HTML report
const report = `
<!DOCTYPE html>
<html>
<head>
    <title>Chat App Performance Test Results</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
        .chart { height: 400px; }
        .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Chat App Performance Test Results</h1>
    
    <div class="summary">
        <h2>Test Summary</h2>
        <ul>
            <li>Message Delivery Rate (95th percentile): ${messageLoadResults.metrics.message_delivery_rate.p95}ms</li>
            <li>Socket Connection Rate (95th percentile): ${connectionStressResults.metrics.socket_connection_rate.p95}ms</li>
            <li>Message Processing Time (95th percentile): ${messageLoadResults.metrics.message_processing_time.p95}ms</li>
        </ul>
    </div>

    <div class="metric">
        <h2>Message Load Test Results</h2>
        <div id="messageLoadChart" class="chart"></div>
    </div>

    <div class="metric">
        <h2>Real-time Messaging Stress Test Results</h2>
        <div id="realtimeStressChart" class="chart"></div>
    </div>

    <div class="metric">
        <h2>Connection Handling Test Results</h2>
        <div id="connectionStressChart" class="chart"></div>
    </div>

    <script>
        // Message Load Chart
        const messageLoadData = {
            x: ${JSON.stringify(messageLoadResults.timestamps)},
            y: ${JSON.stringify(messageLoadResults.metrics.message_delivery_rate.values)},
            type: 'scatter',
            name: 'Message Delivery Rate'
        };
        Plotly.newPlot('messageLoadChart', [messageLoadData], {
            title: 'Message Delivery Rate Over Time',
            xaxis: { title: 'Time' },
            yaxis: { title: 'Delivery Rate (ms)' }
        });

        // Real-time Stress Chart
        const realtimeData = {
            x: ${JSON.stringify(realtimeStressResults.timestamps)},
            y: ${JSON.stringify(realtimeStressResults.metrics.message_processing_time.values)},
            type: 'scatter',
            name: 'Processing Time'
        };
        Plotly.newPlot('realtimeStressChart', [realtimeData], {
            title: 'Message Processing Time Under Load',
            xaxis: { title: 'Time' },
            yaxis: { title: 'Processing Time (ms)' }
        });

        // Connection Stress Chart
        const connectionData = {
            x: ${JSON.stringify(connectionStressResults.timestamps)},
            y: ${JSON.stringify(connectionStressResults.metrics.socket_connection_rate.values)},
            type: 'scatter',
            name: 'Connection Rate'
        };
        Plotly.newPlot('connectionStressChart', [connectionData], {
            title: 'Socket Connection Rate Under Load',
            xaxis: { title: 'Time' },
            yaxis: { title: 'Connection Rate (ms)' }
        });
    </script>
</body>
</html>
`;

// Write report to file
fs.writeFileSync('performance-report.html', report);
console.log('Performance report generated: performance-report.html'); 