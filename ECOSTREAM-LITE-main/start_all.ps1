# start_all.ps1 - EcoStream Unified Orchestrator

Write-Host "Starting EcoStream Unified Admin (Port 5173)..."
Start-Process npm -ArgumentList "run dev" -WorkingDirectory ".\ecostream-mvp00001\admin-dashboard"

Write-Host "Starting All Backend Servers..."
Start-Process npm -ArgumentList "run dev" -WorkingDirectory ".\ecostream-mvp00001"
Start-Process npm -ArgumentList "run dev" -WorkingDirectory ".\tech-bazaar"
Start-Process npm -ArgumentList "run dev" -WorkingDirectory ".\style-avenue"
Start-Process npm -ArgumentList "run dev" -WorkingDirectory ".\home-harmony"

Write-Host "==========================="
Write-Host "EcoStream Unified Admin:  http://localhost:5173"
Write-Host "==========================="
Write-Host "Connected Stores:"
Write-Host "1. EcoFinds:    Port 3000"
Write-Host "2. TechBazaar:  Port 3001"
Write-Host "3. StyleAvenue: Port 3002"
Write-Host "4. HomeHarmony: Port 3003"
Write-Host "==========================="
Write-Host "All services started in background windows."
