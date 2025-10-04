# Kill process on port 3000
Write-Host "Checking for processes on port 3000..." -ForegroundColor Yellow

$connections = netstat -ano | findstr :3000
if ($connections) {
    Write-Host "Found process(es) on port 3000:" -ForegroundColor Cyan
    Write-Host $connections
    
    # Extract PID (last column)
    $pids = $connections | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            $matches[1]
        }
    } | Select-Object -Unique
    
    foreach ($pid in $pids) {
        Write-Host "Killing process with PID: $pid" -ForegroundColor Red
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "✓ Port 3000 is now free" -ForegroundColor Green
} else {
    Write-Host "✓ No process found on port 3000" -ForegroundColor Green
}
