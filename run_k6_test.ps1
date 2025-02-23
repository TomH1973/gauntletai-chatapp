# Run messaging tests
Write-Host "Running messaging load tests..."
$messagingContent = Get-Content -Raw tests/performance/messaging.k6.js
$messagingContent | docker run --rm -i --network chatapp_default grafana/k6 run - `
    -e API_URL=http://chatapp-app-1:3000 `
    -e WS_URL=ws://chatapp-websocket-1:3001 `
    --vus 10 `
    --duration 30s

# Run rate limit tests
Write-Host "`nRunning rate limit load tests..."
$rateLimitContent = Get-Content -Raw tests/performance/rate-limit.k6.js
$rateLimitContent | docker run --rm -i --network chatapp_default grafana/k6 run - `
    -e API_URL=http://chatapp-app-1:3000 `
    --vus 20 `
    --duration 2m

Write-Host "`nLoad tests completed!" 