# PowerShell script to create test stall with owner credentials
Write-Host "🚀 Creating test stall with owner credentials..." -ForegroundColor Green

$baseURL = "http://localhost:5000/api"

# Test stall data
$stallData = @{
    stallNumber = "TEST-001"
    stallName = "Test Electronics Stall"
    category = "Electronics"
    description = "Test stall for electronics items"
    location = "Ground Floor, Section A"
    ownerName = "John Doe"
    ownerEmail = "john.doe@test.com"
    ownerPhone = "9876543210"
    ownerDepartment = "Computer Science"
    ownerDesignation = "Professor"
} | ConvertTo-Json

Write-Host "`n📝 Stall Data:" -ForegroundColor Yellow
Write-Host $stallData

try {
    # Create the stall
    $response = Invoke-RestMethod -Uri "$baseURL/admin/stalls" -Method POST -Body $stallData -ContentType "application/json"
    
    if ($response.success) {
        $stall = $response.data.stall
        $ownerCredentials = $response.data.ownerCredentials
        
        Write-Host "`n✅ Stall created successfully!" -ForegroundColor Green
        Write-Host "`n📋 Stall Details:" -ForegroundColor Cyan
        Write-Host "- Stall ID: $($stall.id)"
        Write-Host "- Stall Number: $($stall.stallNumber)"
        Write-Host "- Stall Name: $($stall.stallName)"
        Write-Host "- QR Code: $($stall.qrCode -or 'Generated')"
        
        Write-Host "`n🔑 Owner Credentials:" -ForegroundColor Yellow
        Write-Host "- Email: $($ownerCredentials.email)" -ForegroundColor White
        Write-Host "- Password: $($ownerCredentials.password)" -ForegroundColor White
        Write-Host "- Login URL: http://localhost:3000/stall-owner-login" -ForegroundColor Blue
        
        Write-Host "`n📧 Email Status:" -ForegroundColor Magenta
        Write-Host "- Credentials email sent: $(if($response.data.emailSent) {'Yes'} else {'No'})"
        
        if ($response.data.emailError) {
            Write-Host "- Email error: $($response.data.emailError)" -ForegroundColor Red
        }
        
        Write-Host "`n🎯 Next Steps:" -ForegroundColor Green
        Write-Host "1. Visit: http://localhost:3000/stall-owner-login" -ForegroundColor White
        Write-Host "2. Login with email: $($ownerCredentials.email)" -ForegroundColor White
        Write-Host "3. Login with password: $($ownerCredentials.password)" -ForegroundColor White
        Write-Host "4. Check the owner dashboard functionality" -ForegroundColor White
        
    } else {
        Write-Host "`n❌ Failed to create stall: $($response.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "`n❌ Error creating stall:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    Write-Host "`n💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure the backend server is running on port 5000" -ForegroundColor White
    Write-Host "2. Check if PostgreSQL database is connected" -ForegroundColor White
    Write-Host "3. Verify the admin routes are properly configured" -ForegroundColor White
    Write-Host "4. Run: cd backend; npm run dev" -ForegroundColor Cyan
}

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")