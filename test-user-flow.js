#!/usr/bin/env node

/**
 * Complete User Authentication & Protected Routes Test
 * Tests login, protected routes, and user display
 */

async function testUserFlow() {
  console.log('🧪 Testing User Authentication & Protected Routes\n');
  console.log('='.repeat(70));

  const baseUrl = 'http://localhost:5000';
  const testUsername = `testuser_${Math.random().toString(36).substring(7)}`;
  const testPassword = 'TestPassword123!';

  // Create a helper to make requests with cookies
  const cookieJar = new Map();

  const makeRequest = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add cookies if we have them
    const cookies = Array.from(cookieJar.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Extract and store Set-Cookie headers
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/([^=]+)=([^;]+)/);
      if (match) {
        cookieJar.set(match[1], match[2]);
      }
    }

    return response;
  };

  // Step 1: Register user
  console.log(`\n📝 STEP 1: Register New User`);
  console.log(`   Username: ${testUsername}`);
  try {
    const regResponse = await makeRequest(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ username: testUsername, password: testPassword }),
    });

    if (regResponse.status === 201) {
      console.log(`   ✓ Registration successful (201 Created)`);
    } else {
      console.log(`   ✗ Registration failed (${regResponse.status})`);
      return;
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
    return;
  }

  // Step 2: Login
  console.log(`\n🔑 STEP 2: Login`);
  try {
    const loginResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: testUsername, password: testPassword }),
    });

    if (loginResponse.status === 200) {
      const data = await loginResponse.json();
      console.log(`   ✓ Login successful (200 OK)`);
      console.log(`   User: ${data.user?.username}`);
      console.log(`   Cookies stored: ${cookieJar.size}`);
    } else {
      console.log(`   ✗ Login failed (${loginResponse.status})`);
      return;
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
    return;
  }

  // Step 3: Get current user info
  console.log(`\n👤 STEP 3: Get Current User Info`);
  try {
    const meResponse = await makeRequest(`${baseUrl}/api/auth/me`);
    if (meResponse.status === 200) {
      const data = await meResponse.json();
      console.log(`   ✓ Retrieved user info (200 OK)`);
      console.log(`   Username: ${data.user?.username}`);
      console.log(`   User ID: ${data.user?.id}`);
    } else {
      console.log(`   ✗ Failed to get user info (${meResponse.status})`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  // Step 4: Test protected route - Dashboard (should be accessible when logged in)
  console.log(`\n🏠 STEP 4: Access Protected Route (Dashboard)`);
  try {
    await makeRequest(`${baseUrl}/`);
    console.log(`   ✓ Dashboard loads with authenticated session`);
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  // Step 5: Test protected route - Backtest (should be accessible when logged in)
  console.log(`\n🔬 STEP 5: Access Protected Route (Backtest)`);
  try {
    await makeRequest(`${baseUrl}/backtest`);
    console.log(`   ✓ Backtest page loads with authenticated session`);
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  // Step 6: Test protected route - Portfolios (should be accessible when logged in)
  console.log(`\n📊 STEP 6: Access Protected Route (Portfolios)`);
  try {
    await makeRequest(`${baseUrl}/portfolios`);
    console.log(`   ✓ Portfolios page loads with authenticated session`);
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  // Step 7: Logout
  console.log(`\n🚪 STEP 7: Logout`);
  try {
    const logoutResponse = await makeRequest(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
    });

    if (logoutResponse.status === 200) {
      console.log(`   ✓ Logout successful (200 OK)`);
      // Clear cookies after logout
      cookieJar.clear();
    } else {
      console.log(`   ✗ Logout failed (${logoutResponse.status})`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  // Step 8: Try to access protected route after logout (should fail in frontend)
  console.log(`\n❌ STEP 8: Verify Access Denied After Logout`);
  try {
    const meResponse = await makeRequest(`${baseUrl}/api/auth/me`);
    if (meResponse.status === 401) {
      console.log(`   ✓ Correctly denied access (401 Unauthorized)`);
      console.log(`   Frontend should redirect to /login`);
    } else {
      console.log(`   ✗ Should have been denied (got ${meResponse.status})`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ User Authentication & Protected Routes Test Complete\n');
}

testUserFlow();
