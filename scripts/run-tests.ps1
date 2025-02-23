Write-Host "Starting load tests..."

# Run messaging load tests
Write-Host "Running messaging load tests..."
Get-Content tests/performance/messaging.k6.js | docker run --rm -i grafana/k6 run -

# Run rate limit tests with different scenarios
Write-Host "Running rate limit tests..."
$env:WS_URL = "ws://localhost:3000/ws"
$env:API_URL = "http://localhost:3000/api"

Write-Host "1. Running normal usage scenario..."
Get-Content tests/performance/rate-limit.k6.js | docker run --rm -i -e WS_URL=$env:WS_URL -e API_URL=$env:API_URL grafana/k6 run --tag testType=normal -

Write-Host "2. Running burst protection tests..."
Get-Content tests/performance/rate-limit.k6.js | docker run --rm -i -e WS_URL=$env:WS_URL -e API_URL=$env:API_URL grafana/k6 run --tag testType=burst -

Write-Host "3. Running anomaly detection tests..."
Get-Content tests/performance/rate-limit.k6.js | docker run --rm -i -e WS_URL=$env:WS_URL -e API_URL=$env:API_URL grafana/k6 run --tag testType=anomaly -

Write-Host "4. Running adaptive limit tests..."
Get-Content tests/performance/rate-limit.k6.js | docker run --rm -i -e WS_URL=$env:WS_URL -e API_URL=$env:API_URL grafana/k6 run --tag testType=adaptive -

Write-Host "All load tests completed!"

# Export results if needed
Write-Host "Exporting test results..."
if (-not (Test-Path "test-results")) {
    New-Item -ItemType Directory -Path "test-results"
}

Get-Date -Format "yyyy-MM-dd_HH-mm" | Out-File "test-results/last-run.txt" 