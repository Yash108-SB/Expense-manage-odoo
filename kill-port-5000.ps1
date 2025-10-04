# Kill process on port 5000 (Backend)
Write-Host "Checking for processes on port 5000..." -ForegroundColor Yellow

$connections = netstat -ano | findstr :5000
if ($connections) {
    Write-Host "Found process(es) on port 5000:" -ForegroundColor Cyan
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
    
    Write-Host "✓ Port 5000 is now free" -ForegroundColor Green
} else {
    Write-Host "✓ No process found on port 5000" -ForegroundColor Green
}
