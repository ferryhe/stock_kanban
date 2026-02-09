# Phase 3 Test Execution Script
# Tests user authentication, profile management, portfolio operations, and risk management

param(
    [string]$ApiBaseUrl = "http://localhost:5000",
    [string]$TestOutputFile = "./test-results.log"
)

# Initialize test results
$testResults = @()
$testCount = 0
$passCount = 0
$failCount = 0

function Test-Endpoint {
    param(
        [string]$TestName,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int]$ExpectedStatus = 200,
        [string]$CookieJar = ""
    )
    
    $testCount++
    $url = "$ApiBaseUrl$Endpoint"
    
    try {
        $splat = @{
            Uri = $url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $splat.Body = ($Body | ConvertTo-Json)
        }
        
        if ($CookieJar) {
            $splat.WebSession = $CookieJar
        }
        
        $response = Invoke-WebRequest @splat
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            $passCount++
            $result = "✅ PASS"
            $resultObj = @{
                Number = $testCount
                Name = $TestName
                Status = "PASS"
                StatusCode = $response.StatusCode
                Message = "Status code matches expected value"
            }
        } else {
            $failCount++
            $result = "❌ FAIL"
            $resultObj = @{
                Number = $testCount
                Name = $TestName
                Status = "FAIL"
                StatusCode = $response.StatusCode
                ExpectedCode = $ExpectedStatus
                Message = "Status code mismatch"
            }
        }
        
        Write-Host "[$testCount] $TestName: $result" -ForegroundColor (if ($result -like "*PASS*") { "Green" } else { "Red" })
    }
    catch {
        $failCount++
        $result = "❌ FAIL"
        $resultObj = @{
            Number = $testCount
            Name = $TestName
            Status = "FAIL"
            Error = $_.Exception.Message
        }
        Write-Host "[$testCount] $TestName: $result - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    $testResults += $resultObj
    return $resultObj
}

Write-Host "
╔══════════════════════════════════════════════════════════════════════╗
║           Phase 3: 实时虚拟交易与用户系统 - 测试执行           ║
║                     Test Execution Started                           ║
╚══════════════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "`n📋 Section 1: User Registration & Authentication Tests`n" -ForegroundColor Yellow

# Test 1: User Registration
$registerBody = @{
    username = "testuser_$(Get-Random)"
    password = "TestPass123"
}
$regTestResult = Test-Endpoint -TestName "User Registration (Valid)" `
    -Method "POST" `
    -Endpoint "/api/auth/register" `
    -Body $registerBody `
    -ExpectedStatus 201

$testUsername = $registerBody.username
$testPassword = $registerBody.password

# Test 2: Duplicate Registration (should fail)
Test-Endpoint -TestName "User Registration (Duplicate Username)" `
    -Method "POST" `
    -Endpoint "/api/auth/register" `
    -Body $registerBody `
    -ExpectedStatus 409

# Test 3: Invalid Password (too short)
Test-Endpoint -TestName "User Registration (Password Too Short)" `
    -Method "POST" `
    -Endpoint "/api/auth/register" `
    -Body @{
        username = "testuser_short_$(Get-Random)"
        password = "short"
    } `
    -ExpectedStatus 400

# Test 4: User Login
$loginBody = @{
    username = $testUsername
    password = $testPassword
}
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
    $loginResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body ($loginBody | ConvertTo-Json) `
        -WebSession $session `
        -ErrorAction Stop
    
    if ($loginResponse.StatusCode -eq 200) {
        $passCount++
        Write-Host "[5] User Login (Valid Credentials): ✅ PASS" -ForegroundColor Green
    }
    else {
        $failCount++
        Write-Host "[5] User Login (Valid Credentials): ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    $failCount++
    Write-Host "[5] User Login (Valid Credentials): ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
$testCount++

# Test 5: Invalid Login
Test-Endpoint -TestName "User Login (Invalid Password)" `
    -Method "POST" `
    -Endpoint "/api/auth/login" `
    -Body @{
        username = $testUsername
        password = "WrongPassword123"
    } `
    -ExpectedStatus 401

# Test 6: Get Current User
try {
    $currentUserResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/auth/me" `
        -Method GET `
        -WebSession $session `
        -ErrorAction Stop
    
    if ($currentUserResponse.StatusCode -eq 200) {
        $passCount++
        Write-Host "[7] Get Current User (Authenticated): ✅ PASS" -ForegroundColor Green
    }
    else {
        $failCount++
        Write-Host "[7] Get Current User (Authenticated): ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    $failCount++
    Write-Host "[7] Get Current User (Authenticated): ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
$testCount++

# Test 7: Get Current User (Unauthenticated)
Test-Endpoint -TestName "Get Current User (Unauthenticated)" `
    -Method "GET" `
    -Endpoint "/api/auth/me" `
    -ExpectedStatus 401

Write-Host "`n📋 Section 2: User Profile Management Tests`n" -ForegroundColor Yellow

# Test 8: Get User Profile
try {
    $profileResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/profile" `
        -Method GET `
        -WebSession $session `
        -ErrorAction Stop
    
    if ($profileResponse.StatusCode -eq 200) {
        $passCount++
        Write-Host "[9] Get User Profile: ✅ PASS" -ForegroundColor Green
    }
    else {
        $failCount++
        Write-Host "[9] Get User Profile: ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    $failCount++
    Write-Host "[9] Get User Profile: ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
$testCount++

# Test 9: Update User Profile
try {
    $updateProfileBody = @{
        displayName = "Test User Full Name"
        riskTolerance = "moderate"
        theme = "dark"
    }
    $updateProfileResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/profile" `
        -Method PUT `
        -ContentType "application/json" `
        -Body ($updateProfileBody | ConvertTo-Json) `
        -WebSession $session `
        -ErrorAction Stop
    
    if ($updateProfileResponse.StatusCode -eq 200) {
        $passCount++
        Write-Host "[10] Update User Profile: ✅ PASS" -ForegroundColor Green
    }
    else {
        $failCount++
        Write-Host "[10] Update User Profile: ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    $failCount++
    Write-Host "[10] Update User Profile: ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
$testCount++

# Test 10: Update Profile with Invalid Risk Tolerance
Test-Endpoint -TestName "Update User Profile (Invalid Risk Tolerance)" `
    -Method "PUT" `
    -Endpoint "/api/profile" `
    -Body @{
        displayName = "Test"
        riskTolerance = "invalid_risk_level"
    } `
    -ExpectedStatus 400

Write-Host "`n📋 Section 3: Portfolio Management Tests`n" -ForegroundColor Yellow

# Test 11: Get Empty Portfolios List
try {
    $portfoliosResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/portfolios" `
        -Method GET `
        -WebSession $session `
        -ErrorAction Stop
    
    if ($portfoliosResponse.StatusCode -eq 200) {
        $passCount++
        Write-Host "[12] Get Portfolios (Empty List): ✅ PASS" -ForegroundColor Green
    }
    else {
        $failCount++
        Write-Host "[12] Get Portfolios (Empty List): ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    $failCount++
    Write-Host "[12] Get Portfolios (Empty List): ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
$testCount++

# Test 12: Create Portfolio
try {
    $createPortfolioBody = @{
        name = "Test Portfolio 1"
        initialCash = 100000
        type = "live"
    }
    $createPortfolioResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/portfolios" `
        -Method POST `
        -ContentType "application/json" `
        -Body ($createPortfolioBody | ConvertTo-Json) `
        -WebSession $session `
        -ErrorAction Stop
    
    if ($createPortfolioResponse.StatusCode -eq 201) {
        $passCount++
        Write-Host "[13] Create Portfolio: ✅ PASS" -ForegroundColor Green
        # Extract portfolio ID from response
        $portfolioData = $createPortfolioResponse.Content | ConvertFrom-Json
        $portfolioId = $portfolioData.id
    }
    else {
        $failCount++
        Write-Host "[13] Create Portfolio: ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    $failCount++
    Write-Host "[13] Create Portfolio: ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
$testCount++

# Test 13: Get Portfolios List (Should have one)
try {
    $portfoliosListResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/portfolios" `
        -Method GET `
        -WebSession $session `
        -ErrorAction Stop
    
    if ($portfoliosListResponse.StatusCode -eq 200) {
        $passCount++
        Write-Host "[14] Get Portfolios (After Creation): ✅ PASS" -ForegroundColor Green
    }
    else {
        $failCount++
        Write-Host "[14] Get Portfolios (After Creation): ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    $failCount++
    Write-Host "[14] Get Portfolios (After Creation): ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
$testCount++

# Test 14: Get Portfolio Details
if ($portfolioId) {
    try {
        $portfolioDetailsResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/portfolios/$portfolioId" `
            -Method GET `
            -WebSession $session `
            -ErrorAction Stop
        
        if ($portfolioDetailsResponse.StatusCode -eq 200) {
            $passCount++
            Write-Host "[15] Get Portfolio Details: ✅ PASS" -ForegroundColor Green
        }
        else {
            $failCount++
            Write-Host "[15] Get Portfolio Details: ❌ FAIL" -ForegroundColor Red
        }
    }
    catch {
        $failCount++
        Write-Host "[15] Get Portfolio Details: ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    }
    $testCount++

    # Test 15: Create Second Portfolio
    try {
        $createPortfolio2Body = @{
            name = "Test Portfolio 2"
            initialCash = 50000
            type = "live"
        }
        $createPortfolio2Response = Invoke-WebRequest -Uri "$ApiBaseUrl/api/portfolios" `
            -Method POST `
            -ContentType "application/json" `
            -Body ($createPortfolio2Body | ConvertTo-Json) `
            -WebSession $session `
            -ErrorAction Stop
        
        if ($createPortfolio2Response.StatusCode -eq 201) {
            $passCount++
            Write-Host "[16] Create Second Portfolio: ✅ PASS" -ForegroundColor Green
            $portfolio2Data = $createPortfolio2Response.Content | ConvertFrom-Json
            $portfolioId2 = $portfolio2Data.id
        }
        else {
            $failCount++
            Write-Host "[16] Create Second Portfolio: ❌ FAIL" -ForegroundColor Red
        }
    }
    catch {
        $failCount++
        Write-Host "[16] Create Second Portfolio: ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    }
    $testCount++

    # Test 16: Delete Portfolio
    try {
        $deletePortfolioResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/portfolios/$portfolioId2" `
            -Method DELETE `
            -WebSession $session `
            -ErrorAction Stop
        
        if ($deletePortfolioResponse.StatusCode -eq 200) {
            $passCount++
            Write-Host "[17] Delete Portfolio: ✅ PASS" -ForegroundColor Green
        }
        else {
            $failCount++
            Write-Host "[17] Delete Portfolio: ❌ FAIL" -ForegroundColor Red
        }
    }
    catch {
        $failCount++
        Write-Host "[17] Delete Portfolio: ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    }
    $testCount++
}

# Test 17: Unauthenticated Portfolio Access
Test-Endpoint -TestName "Get Portfolios (Unauthenticated)" `
    -Method "GET" `
    -Endpoint "/api/portfolios" `
    -ExpectedStatus 401

Write-Host "`n📋 Section 4: Data Isolation Tests`n" -ForegroundColor Yellow

# Create a second user for isolation tests
$user2Username = "testuser2_$(Get-Random)"
$user2Password = "TestPass123"

try {
    $registerUser2Response = Invoke-WebRequest -Uri "$ApiBaseUrl/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body (@{
            username = $user2Username
            password = $user2Password
        } | ConvertTo-Json) `
        -ErrorAction Stop
    
    Write-Host "[19] User 2 Registration: ✅ PASS" -ForegroundColor Green
    $passCount++
    
    # Login as User 2
    $user2Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $loginUser2Response = Invoke-WebRequest -Uri "$ApiBaseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body (@{
            username = $user2Username
            password = $user2Password
        } | ConvertTo-Json) `
        -WebSession $user2Session `
        -ErrorAction Stop
    
    Write-Host "[20] User 2 Login: ✅ PASS" -ForegroundColor Green
    $passCount++
    
    # Try to access User 1's portfolio with User 2 session
    if ($portfolioId) {
        try {
            $crossUserResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/portfolios/$portfolioId" `
                -Method GET `
                -WebSession $user2Session `
                -ErrorAction Stop
            
            # Should return 404 or 403
            if ($crossUserResponse.StatusCode -in @(404, 403)) {
                $passCount++
                Write-Host "[21] Cross-User Portfolio Access (Isolation): ✅ PASS" -ForegroundColor Green
            }
            else {
                $failCount++
                Write-Host "[21] Cross-User Portfolio Access (Isolation): ❌ FAIL - Returned $($crossUserResponse.StatusCode), expected 404 or 403" -ForegroundColor Red
            }
        }
        catch {
            # Expected to fail with 404
            if ($_.Exception.Response.StatusCode -in @(404, 403)) {
                $passCount++
                Write-Host "[21] Cross-User Portfolio Access (Isolation): ✅ PASS" -ForegroundColor Green
            }
            else {
                $failCount++
                Write-Host "[21] Cross-User Portfolio Access (Isolation): ❌ FAIL - Unexpected error" -ForegroundColor Red
            }
        }
        $testCount++
    }
    
}
catch {
    $failCount += 2
    Write-Host "[19] User 2 Registration: ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "[20] User 2 Login: ❌ FAIL" -ForegroundColor Red
    $testCount += 2
}

Write-Host "`n📋 Section 5: User Logout Test`n" -ForegroundColor Yellow

# Test 18: User Logout
try {
    $logoutResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/auth/logout" `
        -Method POST `
        -WebSession $session `
        -ErrorAction Stop
    
    if ($logoutResponse.StatusCode -eq 200) {
        $passCount++
        Write-Host "[22] User Logout: ✅ PASS" -ForegroundColor Green
    }
    else {
        $failCount++
        Write-Host "[22] User Logout: ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    $failCount++
    Write-Host "[22] User Logout: ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
$testCount++

# Test 19: Access after Logout (should fail)
try {
    $afterLogoutResponse = Invoke-WebRequest -Uri "$ApiBaseUrl/api/auth/me" `
        -Method GET `
        -WebSession $session `
        -ErrorAction Stop
    
    if ($afterLogoutResponse.StatusCode -eq 401) {
        $passCount++
        Write-Host "[23] Access After Logout (Should Fail): ✅ PASS" -ForegroundColor Green
    }
    else {
        $failCount++
        Write-Host "[23] Access After Logout (Should Fail): ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    $passCount++
    Write-Host "[23] Access After Logout (Should Fail): ✅ PASS" -ForegroundColor Green
}
$testCount++

Write-Host "`n
╔══════════════════════════════════════════════════════════════════════╗
║                        Test Summary Report                           ║
╚══════════════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "📊 Total Tests: $testCount" -ForegroundColor White
Write-Host "✅ Passed: $passCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red
Write-Host "📈 Pass Rate: $(([math]::Round(($passCount / $testCount) * 100, 2)))%" -ForegroundColor Yellow

# Save results to file
$reportContent = @"
# Phase 3 Automated Test Report
Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Environment: PostgreSQL Test Container (Port 55432)
Application: Stock Kanban Development Server (Port 5000)

## Summary
- Total Tests: $testCount
- Passed: $passCount
- Failed: $failCount
- Pass Rate: $(([math]::Round(($passCount / $testCount) * 100, 2)))%

## Test Details
$($testResults | ConvertTo-Json -Depth 3)

## Test Status
$(if ($failCount -eq 0) { "✅ ALL TESTS PASSED" } else { "⚠️ Some tests failed - review details above" })
"@

$reportContent | Out-File -FilePath $TestOutputFile -Encoding UTF8
Write-Host "`n📄 Test results saved to: $TestOutputFile" -ForegroundColor Yellow

exit (if ($failCount -eq 0) { 0 } else { 1 })
