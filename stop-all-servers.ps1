# Stop all development servers (Frontend + Backend)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Stopping All Development Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to kill process on a specific port
function Stop-PortProcess {
    param (
        [int]$Port,
        [string]$Name
    )
    
    Write-Host "Checking $Name on port $Port..." -ForegroundColor Yellow
    
    $connections = netstat -ano | findstr ":$Port"
    if ($connections) {
        Write-Host "  Found active process" -ForegroundColor Cyan
        
        # Extract PIDs
        $pids = $connections | ForEach-Object {
            if ($_ -match '\s+(\d+)\s*$') {
                $matches[1]
            }
        } | Select-Object -Unique
        
        foreach ($pid in $pids) {
            Write-Host "  Stopping PID: $pid" -ForegroundColor Red
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
        
        Write-Host "  ✓ $Name stopped" -ForegroundColor Green
    } else {
        Write-Host "  ✓ No process running" -ForegroundColor Gray
    }
    Write-Host ""
}

# Stop Frontend (port 3000)
Stop-PortProcess -Port 3000 -Name "Frontend (Vite)"

# Stop Backend (port 5000)
Stop-PortProcess -Port 5000 -Name "Backend (Express)"

# Stop MongoDB (if needed)
Write-Host "MongoDB Docker Container:" -ForegroundColor Yellow
try {
    $mongoContainer = docker ps --filter "name=expense-mongodb" --format "{{.Names}}"
    if ($mongoContainer) {
        Write-Host "  Container is running" -ForegroundColor Cyan
        Write-Host "  To stop: docker stop expense-mongodb" -ForegroundColor Gray
    } else {
        Write-Host "  ✓ Container not running" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Docker not available" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All servers stopped!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
