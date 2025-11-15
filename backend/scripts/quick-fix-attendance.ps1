# Quick Fix Script - Runs SQL directly without file
# This is the fastest way if you have psql installed

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quick Fix: Attendance Duplicate Constraint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for database URL or credentials
Write-Host "Choose connection method:" -ForegroundColor Yellow
Write-Host "1. Use DATABASE_URL (from Render)" -ForegroundColor White
Write-Host "2. Enter credentials manually" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Enter your DATABASE_URL:" -ForegroundColor Yellow
    Write-Host "(Format: postgresql://user:password@host:port/database)" -ForegroundColor Gray
    $DATABASE_URL = Read-Host "DATABASE_URL"
    
    Write-Host ""
    Write-Host "🔄 Running fix..." -ForegroundColor Yellow
    
    # SQL command to run
    $SQL = @"
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_eventId_studentId_key;
DROP INDEX IF EXISTS attendances_event_id_student_id;
CREATE INDEX IF NOT EXISTS idx_attendances_event_student_time ON attendances (\"eventId\", \"studentId\", \"checkInTime\" DESC);
CREATE INDEX IF NOT EXISTS idx_attendances_event_status ON attendances (\"eventId\", status);
SELECT 'Migration completed successfully!' AS result;
"@
    
    # Run the SQL
    $output = $SQL | psql $DATABASE_URL 2>&1
    
} else {
    Write-Host ""
    Write-Host "Enter database credentials:" -ForegroundColor Yellow
    $DB_HOST = Read-Host "Host (e.g., xxx.aivencloud.com)"
    $DB_PORT = Read-Host "Port (default: 19044)"
    $DB_NAME = Read-Host "Database (default: defaultdb)"
    $DB_USER = Read-Host "User (default: avnadmin)"
    $DB_PASSWORD = Read-Host "Password" -AsSecureString
    
    if ([string]::IsNullOrWhiteSpace($DB_PORT)) { $DB_PORT = "19044" }
    if ([string]::IsNullOrWhiteSpace($DB_NAME)) { $DB_NAME = "defaultdb" }
    if ([string]::IsNullOrWhiteSpace($DB_USER)) { $DB_USER = "avnadmin" }
    
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
    $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    Write-Host ""
    Write-Host "🔄 Running fix..." -ForegroundColor Yellow
    
    $SQL = @"
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_eventId_studentId_key;
DROP INDEX IF EXISTS attendances_event_id_student_id;
CREATE INDEX IF NOT EXISTS idx_attendances_event_student_time ON attendances (\"eventId\", \"studentId\", \"checkInTime\" DESC);
CREATE INDEX IF NOT EXISTS idx_attendances_event_status ON attendances (\"eventId\", status);
SELECT 'Migration completed successfully!' AS result;
"@
    
    $env:PGPASSWORD = $PlainPassword
    $output = $SQL | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --set=sslmode=require 2>&1
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Output:" -ForegroundColor Cyan
Write-Host $output
Write-Host ""

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS! Constraint removed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Students can now scan multiple times! 🎉" -ForegroundColor Green
} else {
    Write-Host "❌ ERROR: Migration failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try using Aiven Console method:" -ForegroundColor Yellow
    Write-Host "1. Go to https://console.aiven.io" -ForegroundColor White
    Write-Host "2. Open Query Editor" -ForegroundColor White
    Write-Host "3. Run the SQL from fix-attendance-constraint.sql" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
