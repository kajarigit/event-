# Event Management System - Quick Start Script
# Run this script as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Event Management System Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get IP Address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*'}).IPAddress | Select-Object -First 1

Write-Host "Your Server IP: $ipAddress" -ForegroundColor Green
Write-Host ""

# Check if backend is running
Write-Host "Checking Backend Server..." -ForegroundColor Yellow
$backendRunning = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

if ($backendRunning) {
    Write-Host "✓ Backend is running on port 5000" -ForegroundColor Green
} else {
    Write-Host "✗ Backend is NOT running" -ForegroundColor Red
    Write-Host "  Starting backend server..." -ForegroundColor Yellow
    
    $backendPath = "C:\Users\Administrator\Desktop\test\new-try\try1\event\backend"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm start"
    
    Start-Sleep -Seconds 5
    Write-Host "✓ Backend server started" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Direct Backend Access:" -ForegroundColor Yellow
Write-Host "  http://${ipAddress}:5000/api" -ForegroundColor White
Write-Host ""

# Check for Nginx
Write-Host "Checking Nginx..." -ForegroundColor Yellow
if (Test-Path "C:\nginx\nginx.exe") {
    Write-Host "✓ Nginx is installed" -ForegroundColor Green
    
    # Copy nginx.conf
    $sourceConf = "C:\Users\Administrator\Desktop\test\new-try\try1\event\nginx.conf"
    $destConf = "C:\nginx\conf\nginx.conf"
    
    if (Test-Path $sourceConf) {
        Copy-Item -Path $sourceConf -Destination $destConf -Force
        Write-Host "✓ Nginx configuration copied" -ForegroundColor Green
    }
    
    # Start Nginx
    Write-Host "Starting Nginx..." -ForegroundColor Yellow
    Set-Location "C:\nginx"
    .\nginx.exe -s reload 2>$null
    if ($LASTEXITCODE -ne 0) {
        Start-Process "C:\nginx\nginx.exe" -WindowStyle Hidden
    }
    
    Start-Sleep -Seconds 2
    Write-Host "✓ Nginx started" -ForegroundColor Green
    Write-Host ""
    Write-Host "Via Nginx (Recommended):" -ForegroundColor Yellow
    Write-Host "  http://${ipAddress}/api" -ForegroundColor White
} else {
    Write-Host "✗ Nginx is NOT installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install Nginx:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://nginx.org/en/download.html" -ForegroundColor White
    Write-Host "2. Extract to: C:\nginx" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "OR use direct backend access (above)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "For React App Configuration:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "C:\nginx\nginx.exe") {
    Write-Host "Add to your .env file:" -ForegroundColor Yellow
    Write-Host "REACT_APP_API_URL=http://${ipAddress}/api" -ForegroundColor White
} else {
    Write-Host "Add to your .env file:" -ForegroundColor Yellow
    Write-Host "REACT_APP_API_URL=http://${ipAddress}:5000/api" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test API Connection:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test API
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/" -Method GET -ErrorAction Stop
    Write-Host "✓ API is responding" -ForegroundColor Green
} catch {
    Write-Host "✗ API is not responding" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Sample API Endpoints:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "C:\nginx\nginx.exe") {
    Write-Host "POST http://${ipAddress}/api/auth/login" -ForegroundColor White
    Write-Host "GET  http://${ipAddress}/api/auth/me" -ForegroundColor White
    Write-Host "GET  http://${ipAddress}/api/admin/events" -ForegroundColor White
    Write-Host "GET  http://${ipAddress}/api/student/events" -ForegroundColor White
} else {
    Write-Host "POST http://${ipAddress}:5000/api/auth/login" -ForegroundColor White
    Write-Host "GET  http://${ipAddress}:5000/api/auth/me" -ForegroundColor White
    Write-Host "GET  http://${ipAddress}:5000/api/admin/events" -ForegroundColor White
    Write-Host "GET  http://${ipAddress}:5000/api/student/events" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
