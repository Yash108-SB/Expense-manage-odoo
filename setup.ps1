# Expense Management System - Automated Setup Script
# Run this in PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Expense Management System - Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Setting up MongoDB..." -ForegroundColor Cyan

# Check if MongoDB container already exists
$containerExists = docker ps -a --format "{{.Names}}" | Select-String -Pattern "expense-mongodb"

if ($containerExists) {
    Write-Host "MongoDB container already exists. Starting it..." -ForegroundColor Yellow
    docker start expense-mongodb
} else {
    Write-Host "Creating new MongoDB container..." -ForegroundColor Yellow
    docker run -d -p 27017:27017 --name expense-mongodb mongo:latest
}

Start-Sleep -Seconds 3

# Verify MongoDB is running
$mongoRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "expense-mongodb"
if ($mongoRunning) {
    Write-Host "✓ MongoDB is running on port 27017" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to start MongoDB" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Setting up Backend..." -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\backend"

if (Test-Path "node_modules") {
    Write-Host "Backend dependencies already installed" -ForegroundColor Yellow
} else {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "✓ Backend setup complete" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Setting up Frontend..." -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\frontend"

if (Test-Path "node_modules") {
    Write-Host "Frontend dependencies already installed" -ForegroundColor Yellow
} else {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "✓ Frontend setup complete" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup Complete! 🎉" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open TWO PowerShell windows" -ForegroundColor White
Write-Host ""
Write-Host "   Window 1 - Backend:" -ForegroundColor Yellow
Write-Host "   cd $PSScriptRoot\backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   Window 2 - Frontend:" -ForegroundColor Yellow
Write-Host "   cd $PSScriptRoot\frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Open browser: http://localhost:3000" -ForegroundColor Cyan
Write-Host "3. Click 'Sign up' to create your admin account" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick Reference:" -ForegroundColor Cyan
Write-Host "- README.md: Full documentation" -ForegroundColor Gray
Write-Host "- QUICK_START.md: 15-minute guide" -ForegroundColor Gray
Write-Host "- IMPLEMENTATION_GUIDE.md: Technical details" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
