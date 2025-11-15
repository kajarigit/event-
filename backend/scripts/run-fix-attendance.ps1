# PowerShell Script to Fix Attendance Duplicate Constraint
# This connects to your production database and removes the unique constraint

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Attendance Duplicate Constraint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if psql is installed
$psqlExists = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlExists) {
    Write-Host "❌ ERROR: PostgreSQL client (psql) is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "2. Or use the Aiven Console method (see FIX_ATTENDANCE_DUPLICATE.md)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ PostgreSQL client found" -ForegroundColor Green
Write-Host ""

# Prompt for database credentials
Write-Host "Enter your Aiven PostgreSQL credentials:" -ForegroundColor Yellow
Write-Host "(Find these in Render Environment Variables or Aiven Console)" -ForegroundColor Gray
Write-Host ""

$DB_HOST = Read-Host "Database Host (e.g., xxx-xxx.aivencloud.com)"
$DB_PORT = Read-Host "Database Port (default: 19044)" 
$DB_NAME = Read-Host "Database Name (default: defaultdb)"
$DB_USER = Read-Host "Database User (default: avnadmin)"
$DB_PASSWORD = Read-Host "Database Password" -AsSecureString

# Set defaults
if ([string]::IsNullOrWhiteSpace($DB_PORT)) { $DB_PORT = "19044" }
if ([string]::IsNullOrWhiteSpace($DB_NAME)) { $DB_NAME = "defaultdb" }
if ([string]::IsNullOrWhiteSpace($DB_USER)) { $DB_USER = "avnadmin" }

# Convert SecureString to plain text for connection string
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
$PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Connecting to database..." -ForegroundColor Cyan
Write-Host "Host: $DB_HOST" -ForegroundColor Gray
Write-Host "Port: $DB_PORT" -ForegroundColor Gray
Write-Host "Database: $DB_NAME" -ForegroundColor Gray
Write-Host "User: $DB_USER" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Build connection string
$CONNECTION_STRING = "postgresql://${DB_USER}:${PlainPassword}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

# Get the SQL file path
$SQL_FILE = Join-Path $PSScriptRoot "fix-attendance-constraint.sql"

if (-not (Test-Path $SQL_FILE)) {
    Write-Host "❌ ERROR: SQL file not found at: $SQL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "📄 SQL file: $SQL_FILE" -ForegroundColor Gray
Write-Host ""

# Run the migration
Write-Host "🔄 Running migration..." -ForegroundColor Yellow
Write-Host ""

try {
    # Execute the SQL file
    $env:PGPASSWORD = $PlainPassword
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_FILE --set=sslmode=require
    
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✅ SUCCESS! Migration completed!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Changes applied:" -ForegroundColor Yellow
        Write-Host "  ✅ Removed unique constraint on (eventId, studentId)" -ForegroundColor Green
        Write-Host "  ✅ Created performance indexes" -ForegroundColor Green
        Write-Host "  ✅ Students can now check-in/check-out multiple times" -ForegroundColor Green
        Write-Host ""
        Write-Host "🧪 Next Steps:" -ForegroundColor Cyan
        Write-Host "1. Test scanning the same student QR code twice" -ForegroundColor White
        Write-Host "2. Verify no 'duplicate' errors occur" -ForegroundColor White
        Write-Host "3. Add REDIS_URL environment variable for performance boost" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ ERROR: Migration failed with exit code: $exitCode" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "  - Wrong database credentials" -ForegroundColor Gray
        Write-Host "  - Database connection timeout" -ForegroundColor Gray
        Write-Host "  - SSL/TLS connection issue" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Try using Aiven Console instead (see FIX_ATTENDANCE_DUPLICATE.md)" -ForegroundColor Yellow
        exit $exitCode
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
