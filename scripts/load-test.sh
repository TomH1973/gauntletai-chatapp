#!/bin/bash
set -e

# Export test environment variables
export TEST_THREAD_ID=$(node scripts/create-test-thread.js)
export TEST_AUTH_TOKEN=$(node scripts/create-test-user.js)

# Run load tests
echo "Running WebSocket load tests..."
npx artillery run __tests__/load/websocket.yml --output reports/load-test-results.json

# Generate HTML report
echo "Generating HTML report..."
npx artillery report reports/load-test-results.json --output reports/load-test-report.html

# Cleanup test data
echo "Cleaning up test data..."
node scripts/cleanup-test-data.js

echo "Load testing complete! Report available at reports/load-test-report.html" 