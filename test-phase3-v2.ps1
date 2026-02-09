#!/usr/bin/env pwsh
# Phase 3 Test Execution Script
# Tests user authentication, profile management, portfolio operations, and risk management

param(
    [string]${Api} = "http://localhost:5000",
    [string]${TestOutputFile} = "./test-results.log"
)

# Initialize test results
${testResults} = @()
${testCount} = 0
${passCount} = 0
${failCount} = 0
${portfolioId} = ""
${portfolioId2} = ""

function Test-Endpoint {
    param(
        [string]${TestName},
        [string]${Method},
        [string]${Endpoint},
        [hashtable]${Headers} = @{},
        [object]${Body} = $null,
        [int]${ExpectedStatus} = 200,
        [object]${WebSession} = $null
    )
    
    ${global:testCount}++
    ${url} = "${Api}${Endpoint}"
    
    try {
        ${splat} = @{
            Uri = ${url}
            Method = ${Method}
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        
        if (${Body}) {
            if (${Body} -is [string]) {
                ${splat}.Body = ${Body}
            } else {
                ${splat}.Body = (${Body} | ConvertTo-Json)
            }
        }
        
        if (${WebSession}) {
            ${splat}.WebSession = ${WebSession}
        }
        
        ${response} = Invoke-WebRequest @splat
        
        if (${response}.StatusCode -eq ${ExpectedStatus}) {
            ${global:passCount}++
            ${result} = "✅ PASS"
            Write-Host "[${testCount}] ${TestName}: ${result}" -ForegroundColor Green
            return $true
        } else {
            ${global:failCount}++
            ${result} = "❌ FAIL"
            Write-Host "[${testCount}] ${TestName}: ${result} (Got ${response.StatusCode}, expected ${ExpectedStatus})" -ForegroundColor Red
            return $false
        }
    }
    catch {
        ${global:failCount}++
        ${result} = "❌ FAIL"
        Write-Host "[${testCount}] ${TestName}: ${result} - ${$_.Exception.Message}" -ForegroundColor Red
        return $false
    }
}

Write-Host "
╔══════════════════════════════════════════════════════════════════════╗
║           Phase 3: 实时虚拟交易与用户系统 - 测试执行           ║
║                     Test Execution Started                           ║
╚══════════════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "`n📋 Section 1: User Registration & Authentication Tests`n" -ForegroundColor Yellow

# Test 1: User Registration
${registerBody} = @{
    username = "testuser_$(Get-Random)"
    password = "TestPass123"
}

try {
    ${regResponse} = Invoke-WebRequest -Uri "${Api}/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body (${registerBody} | ConvertTo-Json) `
        -ErrorAction Stop
    
    if (${regResponse}.StatusCode -eq 201) {
        ${global:passCount}++
        Write-Host "[1] User Registration (Valid): ✅ PASS" -ForegroundColor Green
        ${global:testUsername} = ${registerBody}.username
        ${global:testPassword} = ${registerBody}.password
    } else {
        ${global:failCount}++
        Write-Host "[1] User Registration (Valid): ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    ${global:failCount}++
    Write-Host "[1] User Registration (Valid): ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
}
${global:testCount}++

# Test 2: Duplicate Registration (should fail)
Test-Endpoint -TestName "User Registration (Duplicate)" `
    -Method "POST" `
    -Endpoint "/api/auth/register" `
    -Body ${registerBody} `
    -ExpectedStatus 409

# Test 3: User Login
${global:session} = New-Object Microsoft.PowerShell.Commands.WebRequestSession
${loginBody} = @{
    username = ${global:testUsername}
    password = ${global:testPassword}
} | ConvertTo-Json

try {
    ${loginResponse} = Invoke-WebRequest -Uri "${Api}/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body ${loginBody} `
        -WebSession ${global:session} `
        -ErrorAction Stop
    
    if (${loginResponse}.StatusCode -eq 200) {
        ${global:passCount}++
        Write-Host "[3] User Login (Valid Credentials): ✅ PASS" -ForegroundColor Green
    } else {
        ${global:failCount}++
        Write-Host "[3] User Login (Valid Credentials): ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    ${global:failCount}++
    Write-Host "[3] User Login (Valid Credentials): ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
}
${global:testCount}++

# Test 4: Get Current User
try {
    ${meResponse} = Invoke-WebRequest -Uri "${Api}/api/auth/me" `
        -Method GET `
        -WebSession ${global:session} `
        -ErrorAction Stop
    
    if (${meResponse}.StatusCode -eq 200) {
        ${global:passCount}++
        Write-Host "[4] Get Current User (Authenticated): ✅ PASS" -ForegroundColor Green
    } else {
        ${global:failCount}++
        Write-Host "[4] Get Current User (Authenticated): ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    ${global:failCount}++
    Write-Host "[4] Get Current User (Authenticated): ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
}
${global:testCount}++

# Test 5: Invalid Login
Test-Endpoint -TestName "User Login (Invalid Password)" `
    -Method "POST" `
    -Endpoint "/api/auth/login" `
    -Body (@{username = ${global:testUsername}; password = "WrongPassword"} | ConvertTo-Json) `
    -ExpectedStatus 401

Write-Host "`n📋 Section 2: User Profile Management Tests`n" -ForegroundColor Yellow

# Test 6: Get User Profile
try {
    ${profileResponse} = Invoke-WebRequest -Uri "${Api}/api/profile" `
        -Method GET `
        -WebSession ${global:session} `
        -ErrorAction Stop
    
    if (${profileResponse}.StatusCode -eq 200) {
        ${global:passCount}++
        Write-Host "[6] Get User Profile: ✅ PASS" -ForegroundColor Green
    } else {
        ${global:failCount}++
        Write-Host "[6] Get User Profile: ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    ${global:failCount}++
    Write-Host "[6] Get User Profile: ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
}
${global:testCount}++

# Test 7: Update User Profile
try {
    ${updateProfileBody} = @{
        displayName = "Test User"
        riskTolerance = "moderate"
        theme = "dark"
    } | ConvertTo-Json
    
    ${updateResponse} = Invoke-WebRequest -Uri "${Api}/api/profile" `
        -Method PUT `
        -ContentType "application/json" `
        -Body ${updateProfileBody} `
        -WebSession ${global:session} `
        -ErrorAction Stop
    
    if (${updateResponse}.StatusCode -eq 200) {
        ${global:passCount}++
        Write-Host "[7] Update User Profile: ✅ PASS" -ForegroundColor Green
    } else {
        ${global:failCount}++
        Write-Host "[7] Update User Profile: ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    ${global:failCount}++
    Write-Host "[7] Update User Profile: ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
}
${global:testCount}++

Write-Host "`n📋 Section 3: Portfolio CRUD Tests`n" -ForegroundColor Yellow

# Test 8: Create Portfolio
try {
    ${createPortfolioBody} = @{
        name = "Test Portfolio 1"
        initialCash = 100000
        type = "live"
    } | ConvertTo-Json
    
    ${createResponse} = Invoke-WebRequest -Uri "${Api}/api/portfolios" `
        -Method POST `
        -ContentType "application/json" `
        -Body ${createPortfolioBody} `
        -WebSession ${global:session} `
        -ErrorAction Stop
    
    if (${createResponse}.StatusCode -eq 201) {
        ${global:passCount}++
        Write-Host "[8] Create Portfolio: ✅ PASS" -ForegroundColor Green
        ${portfolioData} = ${createResponse}.Content | ConvertFrom-Json
        ${global:portfolioId} = ${portfolioData}.id
    } else {
        ${global:failCount}++
        Write-Host "[8] Create Portfolio: ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    ${global:failCount}++
    Write-Host "[8] Create Portfolio: ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
}
${global:testCount}++

# Test 9: Get Portfolios List
try {
    ${listResponse} = Invoke-WebRequest -Uri "${Api}/api/portfolios" `
        -Method GET `
        -WebSession ${global:session} `
        -ErrorAction Stop
    
    if (${listResponse}.StatusCode -eq 200) {
        ${global:passCount}++
        Write-Host "[9] Get Portfolios List: ✅ PASS" -ForegroundColor Green
    } else {
        ${global:failCount}++
        Write-Host "[9] Get Portfolios List: ❌ FAIL" -ForegroundColor Red
    }
}
catch {
    ${global:failCount}++
    Write-Host "[9] Get Portfolios List: ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
}
${global:testCount}++

# Test 10: Get Portfolio Details
if (${global:portfolioId}) {
    try {
        ${detailResponse} = Invoke-WebRequest -Uri "${Api}/api/portfolios/${global:portfolioId}" `
            -Method GET `
            -WebSession ${global:session} `
            -ErrorAction Stop
        
        if (${detailResponse}.StatusCode -eq 200) {
            ${global:passCount}++
            Write-Host "[10] Get Portfolio Details: ✅ PASS" -ForegroundColor Green
        } else {
            ${global:failCount}++
            Write-Host "[10] Get Portfolio Details: ❌ FAIL" -ForegroundColor Red
        }
    }
    catch {
        ${global:failCount}++
        Write-Host "[10] Get Portfolio Details: ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
    }
    ${global:testCount}++

    # Test 11: Delete Portfolio (create and delete a second one)
    try {
        ${create2Body} = @{
            name = "Test Portfolio 2"
            initialCash = 50000
            type = "live"
        } | ConvertTo-Json
        
        ${create2Response} = Invoke-WebRequest -Uri "${Api}/api/portfolios" `
            -Method POST `
            -ContentType "application/json" `
            -Body ${create2Body} `
            -WebSession ${global:session} `
            -ErrorAction Stop
        
        if (${create2Response}.StatusCode -eq 201) {
            ${portfolio2Data} = ${create2Response}.Content | ConvertFrom-Json
            ${global:portfolioId2} = ${portfolio2Data}.id
            
            ${deleteResponse} = Invoke-WebRequest -Uri "${Api}/api/portfolios/${global:portfolioId2}" `
                -Method DELETE `
                -WebSession ${global:session} `
                -ErrorAction Stop
            
            if (${deleteResponse}.StatusCode -eq 200) {
                ${global:passCount}++
                Write-Host "[11] Delete Portfolio: ✅ PASS" -ForegroundColor Green
            } else {
                ${global:failCount}++
                Write-Host "[11] Delete Portfolio: ❌ FAIL" -ForegroundColor Red
            }
        } else {
            ${global:failCount}++
            Write-Host "[11] Create Portfolio 2 Failed: ❌ FAIL" -ForegroundColor Red
        }
    }
    catch {
        ${global:failCount}++
        Write-Host "[11] Delete Portfolio: ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
    }
    ${global:testCount}++
}

Write-Host "`n📋 Section 4: Data Isolation Tests`n" -ForegroundColor Yellow

# Create second user
${user2Username} = "testuser2_$(Get-Random)"
${user2Password} = "TestPass456"

try {
    ${reg2Body} = @{
        username = ${user2Username}
        password = ${user2Password}
    } | ConvertTo-Json
    
    ${reg2Response} = Invoke-WebRequest -Uri "${Api}/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body ${reg2Body} `
        -ErrorAction Stop
    
    Write-Host "[12] User 2 Registration: ✅ PASS" -ForegroundColor Green
    ${global:passCount}++
    
    # Login as User 2
    ${global:session2} = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    ${login2Body} = @{
        username = ${user2Username}
        password = ${user2Password}
    } | ConvertTo-Json
    
    ${login2Response} = Invoke-WebRequest -Uri "${Api}/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body ${login2Body} `
        -WebSession ${global:session2} `
        -ErrorAction Stop
    
    Write-Host "[13] User 2 Login: ✅ PASS" -ForegroundColor Green
    ${global:passCount}++
    
    # Try to access User 1's portfolio with User 2 session  
    if (${global:portfolioId}) {
        try {
            ${crossAccessResponse} = Invoke-WebRequest -Uri "${Api}/api/portfolios/${global:portfolioId}" `
                -Method GET `
                -WebSession ${global:session2} `
                -ErrorAction Stop
            
            # Should return 404 (not 200)
            if (${crossAccessResponse}.StatusCode -eq 404) {
                ${global:passCount}++
                Write-Host "[14] Data Isolation (Cross-User Access): ✅ PASS" -ForegroundColor Green
            } else {
                ${global:failCount}++
                Write-Host "[14] Data Isolation (Cross-User Access): ❌ FAIL - Got ${crossAccessResponse.StatusCode}" -ForegroundColor Red
            }
        }
        catch {
            # Expected to fail
            if (${$_.Exception.Response.StatusCode} -eq 404) {
                ${global:passCount}++
                Write-Host "[14] Data Isolation (Cross-User Access): ✅ PASS" -ForegroundColor Green
            } else {
                ${global:failCount}++
                Write-Host "[14] Data Isolation (Cross-User Access): ❌ FAIL" -ForegroundColor Red
            }
        }
        ${global:testCount}++
    }
}
catch {
    ${global:failCount} += 2
    Write-Host "[12] User 2 Registration: ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
    Write-Host "[13] User 2 Login: ❌ FAIL" -ForegroundColor Red
    ${global:testCount} += 2
}

Write-Host "`n📋 Section 5: Logout Test`n" -ForegroundColor Yellow

# Test Logout
try {
    ${logoutResponse} = Invoke-WebRequest -Uri "${Api}/api/auth/logout" `
        -Method POST `
        -WebSession ${global:session} `
        -ErrorAction Stop
    
    Write-Host "[15] User Logout: ✅ PASS" -ForegroundColor Green
    ${global:passCount}++
}
catch {
    ${global:failCount}++
    Write-Host "[15] User Logout: ❌ FAIL - ${$_.Exception.Message}" -ForegroundColor Red
}
${global:testCount}++

Write-Host "`n
╔══════════════════════════════════════════════════════════════════════╗
║                        Test Summary Report                           ║
╚══════════════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "📊 Total Tests: ${testCount}" -ForegroundColor White
Write-Host "✅ Passed: ${passCount}" -ForegroundColor Green
Write-Host "❌ Failed: ${failCount}" -ForegroundColor Red
Write-Host "📈 Pass Rate: $([math]::Round((${passCount}/${testCount})*100, 2))%" -ForegroundColor Yellow

# Display result
if (${failCount} -eq 0) {
    Write-Host "`n✅ ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Some tests failed. Review output above." -ForegroundColor Yellow
}
