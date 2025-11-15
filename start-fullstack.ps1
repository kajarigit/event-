# Start Full Stack - Event Management System
# This script starts both backend and frontend servers
# Run as Administrator for best results

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Event Management System - Full Stack" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get IP Address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*'}).IPAddress | Select-Object -First 1

Write-Host "Your Server IP: $ipAddress" -ForegroundColor Green
Write-Host ""

# Project paths
$projectRoot = "C:\Users\Administrator\Desktop\test\new-try\try1\event"
$backendPath = "$projectRoot\backend"
$frontendPath = "$projectRoot\frontend"

# Check and open Windows Firewall for port 5000 (Backend)
Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
$firewallRuleBackend = Get-NetFirewallRule -DisplayName "Node.js Backend - Event Management" -ErrorAction SilentlyContinue
if (-not $firewallRuleBackend) {
    New-NetFirewallRule -DisplayName "Node.js Backend - Event Management" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -Profile Any | Out-Null
    Write-Host "✓ Backend firewall rule created (port 5000)" -ForegroundColor Green
} else {
    Write-Host "✓ Backend firewall rule already exists" -ForegroundColor Green
}

# Check and open Windows Firewall for port 3000 (Frontend)
$firewallRuleFrontend = Get-NetFirewallRule -DisplayName "React Frontend - Event Management" -ErrorAction SilentlyContinue
if (-not $firewallRuleFrontend) {
    New-NetFirewallRule -DisplayName "React Frontend - Event Management" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any | Out-Null
    Write-Host "✓ Frontend firewall rule created (port 3000)" -ForegroundColor Green
} else {
    Write-Host "✓ Frontend firewall rule already exists" -ForegroundColor Green
}

# Check and open Windows Firewall for port 80 (Nginx)
$firewallRuleNginx = Get-NetFirewallRule -DisplayName "Nginx - Event Management" -ErrorAction SilentlyContinue
if (-not $firewallRuleNginx) {
    New-NetFirewallRule -DisplayName "Nginx - Event Management" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -Profile Any | Out-Null
    Write-Host "✓ Nginx firewall rule created (port 80)" -ForegroundColor Green
} else {
    Write-Host "✓ Nginx firewall rule already exists" -ForegroundColor Green
}

Write-Host ""

# Start Backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (Test-Path $backendPath) {
    # Check if backend is already running
    $backendRunning = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
    
    if ($backendRunning) {
        Write-Host "✓ Backend is already running on port 5000" -ForegroundColor Green
    } else {
        Write-Host "Starting backend server..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend Server Starting...' -ForegroundColor Cyan; npm start"
        Start-Sleep -Seconds 3
        Write-Host "✓ Backend server started in new window" -ForegroundColor Green
    }
} else {
    Write-Host "✗ Backend directory not found!" -ForegroundColor Red
}

Write-Host ""

# Start Frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (Test-Path $frontendPath) {
    # Check if frontend is already running
    $frontendRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    
    if ($frontendRunning) {
        Write-Host "✓ Frontend is already running on port 3000" -ForegroundColor Green
    } else {
        Write-Host "Starting frontend server..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Frontend Server Starting...' -ForegroundColor Cyan; npm run dev"
        Start-Sleep -Seconds 3
        Write-Host "✓ Frontend server started in new window" -ForegroundColor Green
    }
} else {
    Write-Host "✗ Frontend directory not found!" -ForegroundColor Red
}

Write-Host ""

# Check for Nginx
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Nginx..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (Test-Path "C:\nginx\nginx.exe") {
    Write-Host "✓ Nginx is installed" -ForegroundColor Green
    
    # Copy updated nginx config
    $sourceConf = "$projectRoot\nginx-local.conf"
    $destConf = "C:\nginx\conf\nginx.conf"
    
    if (Test-Path $sourceConf) {
        Copy-Item -Path $sourceConf -Destination $destConf -Force
        Write-Host "✓ Nginx configuration updated" -ForegroundColor Green
    }
    
    # Start or reload Nginx
    Write-Host "Starting/Reloading Nginx..." -ForegroundColor Yellow
    Set-Location "C:\nginx"
    
    # Try to reload first
    & .\nginx.exe -s reload 2>$null
    if ($LASTEXITCODE -ne 0) {
        # If reload fails, start nginx
        Start-Process "C:\nginx\nginx.exe" -WindowStyle Hidden
    }
    
    Start-Sleep -Seconds 2
    Write-Host "✓ Nginx started/reloaded" -ForegroundColor Green
} else {
    Write-Host "⚠ Nginx is NOT installed (optional)" -ForegroundColor Yellow
    Write-Host "  You can still access via direct URLs below" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Wait for servers to fully start
Write-Host "Waiting for servers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📱 Access URLs (Phone/Computer)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "C:\nginx\nginx.exe") {
    Write-Host "🌐 Via Nginx (RECOMMENDED):" -ForegroundColor Green
    Write-Host "   Full App:  http://${ipAddress}" -ForegroundColor White
    Write-Host "   API Only:  http://${ipAddress}/api" -ForegroundColor White
    Write-Host ""
}

Write-Host "🔗 Direct Access:" -ForegroundColor Yellow
Write-Host "   Frontend:  http://${ipAddress}:3000" -ForegroundColor White
Write-Host "   Backend:   http://${ipAddress}:5000/api" -ForegroundColor White
Write-Host ""

Write-Host "💻 Localhost (This PC Only):" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:   http://localhost:5000/api" -ForegroundColor White

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 Quick Info" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Network IP: $ipAddress" -ForegroundColor White
Write-Host "Backend Port: 5000" -ForegroundColor White
Write-Host "Frontend Port: 3000" -ForegroundColor White
Write-Host "Nginx Port: 80 (if installed)" -ForegroundColor White
Write-Host ""

Write-Host "Test Login:" -ForegroundColor Yellow
Write-Host "  Email: admin@event.com" -ForegroundColor White
Write-Host "  Password: Password@123" -ForegroundColor White

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📱 Using on Your Phone" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Make sure your phone is on the SAME Wi-Fi network" -ForegroundColor White
Write-Host "2. Open browser on your phone" -ForegroundColor White

if (Test-Path "C:\nginx\nginx.exe") {
    Write-Host "3. Visit: http://${ipAddress}" -ForegroundColor Green
} else {
    Write-Host "3. Visit: http://${ipAddress}:3000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🛑 To Stop Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Close the PowerShell windows or run:" -ForegroundColor White
Write-Host "  - Close backend/frontend terminal windows" -ForegroundColor Gray
Write-Host "  - For Nginx: cd C:\nginx; .\nginx.exe -s stop" -ForegroundColor Gray

Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
