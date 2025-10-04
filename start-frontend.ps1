# Start Frontend Server
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\frontend"

Write-Host "✓ Starting frontend on http://localhost:3000" -ForegroundColor Green
Write-Host ""

npm run dev
