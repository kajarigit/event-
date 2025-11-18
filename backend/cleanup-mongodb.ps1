# Cleanup MongoDB Files and Unnecessary Documentation
# This script removes all MongoDB-related files and consolidates documentation

Write-Host "Starting cleanup..." -ForegroundColor Green

# Delete MongoDB utility scripts from root
$rootScripts = @(
    "seed.js",
    "showCredentials.js",
    "testLogin.js",
    "fixPasswords.js",
    "diagnosePassword.js",
    "fixAllPasswords.js",
    "checkUserRole.js",
    "checkEvent.js",
    "test-bcrypt.js",
    "test-http-login.js",
    "test-login-direct.js",
    "test-login.js"
)

foreach ($file in $rootScripts) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Deleted: $file" -ForegroundColor Yellow
    }
}

# Delete MongoDB models
$mongoModels = @(
    "src\models\User.js",
    "src\models\Event.js",
    "src\models\Stall.js",
    "src\models\Attendance.js",
    "src\models\ScanLog.js",
    "src\models\Feedback.js",
    "src\models\Vote.js"
)

foreach ($file in $mongoModels) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Deleted MongoDB model: $file" -ForegroundColor Yellow
    }
}

# Delete MongoDB controllers if they exist
$mongoControllers = @(
    "src\controllers\adminController.js",
    "src\controllers\studentController.js",
    "src\controllers\scanController.js"
)

foreach ($file in $mongoControllers) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Deleted MongoDB controller: $file" -ForegroundColor Yellow
    }
}

# Delete migration scripts
if (Test-Path "src\scripts\migrate-data.js") {
    Remove-Item "src\scripts\migrate-data.js" -Force
    Write-Host "Deleted: src\scripts\migrate-data.js" -ForegroundColor Yellow
}

if (Test-Path "src\scripts\seed.js") {
    Remove-Item "src\scripts\seed.js" -Force
    Write-Host "Deleted: src\scripts\seed.js" -ForegroundColor Yellow
}

# Delete unnecessary markdown files (keep only essential ones)
$mdFilesToDelete = @(
    "BACKEND_MIGRATION_COMPLETE.md",
    "MIGRATION_COMPLETE.md"
)

foreach ($file in $mdFilesToDelete) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "Deleted: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nCleanup complete!" -ForegroundColor Green
Write-Host "MongoDB files and unnecessary documentation removed." -ForegroundColor Cyan
