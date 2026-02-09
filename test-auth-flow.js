#!/usr/bin/env node

/**
 * Complete Frontend Authentication Flow Test
 * Tests registration, login, and navigation
 */

async function testAuthFlow() {
  console.log('🧪 Testing Complete Authentication Flow\n');
  console.log('=' .repeat(60));
  
  const baseUrl = 'http://localhost:5000';
  const testUsername = `testuser_${Math.random().toString(36).substring(7)}`;
  const testPassword = 'TestPassword123!';
  
  console.log(`\n📝 Test Credentials:`);
  console.log(`   Username: ${testUsername}`);
  console.log(`   Password: ${testPassword}`);
  
  // Test 1: Register via API
  console.log(`\n\n🔐 STEP 1: Registration (API POST /api/auth/register)`);
  try {
    const regResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword
      }),
      credentials: 'include'
    });
    
    const regData = await regResponse.json();
    console.log(`   Status: ${regResponse.status}`);
    if (regResponse.status === 201) {
      console.log(`   ✓ Registration successful`);
      console.log(`   User ID: ${regData.user?.id}`);
    } else {
      console.log(`   ✗ Registration failed: ${regData.error || regData.message}`);
      return;
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
    return;
  }
  
  // Test 2: Login via API
  console.log(`\n\n🔐 STEP 2: Login (API POST /api/auth/login)`);
  try {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword
      }),
      credentials: 'include'
    });
    
    const loginData = await loginResponse.json();
    console.log(`   Status: ${loginResponse.status}`);
    if (loginResponse.status === 200) {
      console.log(`   ✓ Login successful`);
      console.log(`   User: ${loginData.user?.username}`);
    } else {
      console.log(`   ✗ Login failed: ${loginData.error || loginData.message}`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
  }
  
  // Test 3: Verify pages load
  console.log(`\n\n📄 STEP 3: Verify Frontend Pages Load`);
  const pages = [
    { path: '/login', name: 'Login Page' },
    { path: '/register', name: 'Register Page' },
    { path: '/', name: 'Dashboard' }
  ];
  
  for (const {path, name} of pages) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      const html = await response.text();
      
      const hasNoError = !html.includes('Cannot read properties of null') && 
                        !html.includes('userRouter') &&
                        !html.includes('__ERROR__');
      
      const status = response.status === 200 && hasNoError ? '✓' : '✗';
      console.log(`   ${status} ${name} (${path})`);
      
      if (response.status === 200 && hasNoError) {
        console.log(`     HTML loaded successfully (${html.length} bytes)`);
      } else if (!hasNoError) {
        console.log(`     Contains error text`);
      }
    } catch (error) {
      console.log(`   ✗ ${name} - ${error.message}`);
    }
  }
  
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('✅ Frontend Authentication Flow Test Complete\n');
}

testAuthFlow();
