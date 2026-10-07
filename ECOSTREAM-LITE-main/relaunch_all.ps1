# relaunch_all.ps1 (v2) - Ultra-Stable Multi-Store Orchestrator

Write-Host "Killing existing Node processes..." -ForegroundColor Cyan
Get-Process -Name 'node' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

Write-Host "Starting All EcoStream Services in background terminals..." -ForegroundColor Yellow

$services = @(
    @{ Name = "Universal Admin (5173)"; Path = "./ecostream-mvp00001/admin-dashboard"; Cmd = "npm run dev" },
    @{ Name = "EcoFinds (3000)"; Path = "./ecostream-mvp00001"; Cmd = "npm run dev" },
    @{ Name = "TechBazaar (3001)"; Path = "./tech-bazaar"; Cmd = "npm run dev" },
    @{ Name = "StyleAvenue (3002)"; Path = "./style-avenue"; Cmd = "npm run dev" },
    @{ Name = "HomeHarmony (3003)"; Path = "./home-harmony"; Cmd = "npm run dev" }
)

foreach ($service in $services) {
    Write-Host "Launching $($service.Name)..." -ForegroundColor Gray
    # Using cmd /c start /min to ensure persistence and separate process life
    Start-Process cmd.exe -ArgumentList "/c $($service.Cmd)" -WorkingDirectory $service.Path -WindowStyle Hidden
}

Write-Host "`nAll services launched." -ForegroundColor Green
Write-Host "Waiting 15 seconds for servers to fully initialize..." -ForegroundColor Yellow
$spinner = "/|-\|"
for ($i = 0; $i -lt 15; $i++) {
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 1
}

Write-Host "`n`nChecking Connectivity Status:" -ForegroundColor Cyan
foreach ($port in @(5173, 3000, 3001, 3002, 3003)) {
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $connection.BeginConnect("localhost", $port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne(1000, $false)
        if ($connection.Connected) {
            Write-Host "[OK] Port $port is LISTENING" -ForegroundColor Green
            $connection.Close()
        } else {
            Write-Host "[FAIL] Port $port is NOT responding" -ForegroundColor Red
        }
    } catch {
        Write-Host "[ERROR] Could not check Port $port" -ForegroundColor Red
    }
}

Write-Host "`nFinal URLs:" -ForegroundColor Yellow
Write-Host "Admin Hub:   http://localhost:5173"
Write-Host "EcoFinds:    http://localhost:3000"
Write-Host "TechBazaar:  http://localhost:3001"
Write-Host "StyleAvenue: http://localhost:3002"
Write-Host "HomeHarmony: http://localhost:3003"
