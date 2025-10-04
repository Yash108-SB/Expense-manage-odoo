# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\backend"

# Check if MongoDB is running
$mongoRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "expense-mongodb"
if (-not $mongoRunning) {
    Write-Host "MongoDB is not running. Starting MongoDB..." -ForegroundColor Yellow
    docker start expense-mongodb
    Start-Sleep -Seconds 3
}

Write-Host "✓ MongoDB is ready" -ForegroundColor Green
Write-Host "✓ Starting backend on http://localhost:5000" -ForegroundColor Green
Write-Host ""

npm run dev
