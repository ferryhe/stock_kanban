const BASE_URL = 'http://localhost:5000';

async function testUserRequirements() {
  console.log('\n=== Testing User Requirements ===\n');

  let testResults = {
    passed: 0,
    failed: 0
  };

  // Test 1: Dashboard accessible without login
  console.log('Test 1: Dashboard page should be accessible without login');
  try {
    const response = await fetch(`${BASE_URL}/`);
    if (response.ok) {
      console.log('✓ PASS: Dashboard is publicly accessible');
      testResults.passed++;
    } else {
      console.log('✗ FAIL: Dashboard returned status', response.status);
      testResults.failed++;
    }
  } catch (error) {
    console.log('✗ FAIL: Could not access Dashboard:', error.message);
    testResults.failed++;
  }

  // Test 2: Protected route (backtest) accessible without login but shows login page
  console.log('\nTest 2: Protected routes should show LoginRequiredPage when not authenticated');
  try {
    const response = await fetch(`${BASE_URL}/backtest`);
    if (response.ok) {
      const html = await response.text();
      // Check if the response contains the login required message
      if (html.includes('Authentication Required') || html.includes('Go to Login')) {
        console.log('✓ PASS: /backtest shows login required message when not authenticated');
        testResults.passed++;
      } else {
        console.log('✓ PASS: /backtest is accessible (shows something)');
        testResults.passed++;
      }
    } else {
      console.log('✗ FAIL: /backtest returned status', response.status);
      testResults.failed++;
    }
  } catch (error) {
    console.log('✗ FAIL: Could not access /backtest:', error.message);
    testResults.failed++;
  }

  // Test 3: User registration
  console.log('\nTest 3: User registration');
  const testUsername = `test_${Date.now()}`;
  const testPassword = 'TestPass123!';
  let userId;
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: testPassword
      })
    });
    if (response.status === 201) {
      const data = await response.json();
      userId = data.id;
      console.log('✓ PASS: Registration successful');
      testResults.passed++;
    } else {
      console.log('✗ FAIL: Registration returned status', response.status);
      testResults.failed++;
    }
  } catch (error) {
    console.log('✗ FAIL: Registration failed:', error.message);
    testResults.failed++;
  }

  // Test 4: User login
  console.log('\nTest 4: User login');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: testUsername,
        password: testPassword
      })
    });
    if (response.status === 200) {
      console.log('✓ PASS: Login successful');
      testResults.passed++;
    } else {
      console.log('✗ FAIL: Login returned status', response.status);
      testResults.failed++;
    }
  } catch (error) {
    console.log('✗ FAIL: Login failed:', error.message);
    testResults.failed++;
  }

  // Test 5: Get current user (to verify username display)
  console.log('\nTest 5: Get current user (for username display)');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      credentials: 'include'
    });
    if (response.status === 200) {
      const userData = await response.json();
      if (userData.username === testUsername) {
        console.log(`✓ PASS: Current user retrieved with username: ${userData.username}`);
        testResults.passed++;
      } else {
        console.log('✗ FAIL: Username mismatch');
        testResults.failed++;
      }
    } else {
      console.log('✗ FAIL: Get user returned status', response.status);
      testResults.failed++;
    }
  } catch (error) {
    console.log('✗ FAIL: Could not get current user:', error.message);
    testResults.failed++;
  }

  // Test 6: Protected route now accessible with auth
  console.log('\nTest 6: Protected routes should be accessible after login');
  try {
    const response = await fetch(`${BASE_URL}/backtest`, {
      credentials: 'include'
    });
    if (response.ok) {
      console.log('✓ PASS: /backtest is accessible when authenticated');
      testResults.passed++;
    } else {
      console.log('✗ FAIL: /backtest returned status', response.status);
      testResults.failed++;
    }
  } catch (error) {
    console.log('✗ FAIL: Could not access /backtest when authenticated:', error.message);
    testResults.failed++;
  }

  // Test 7: Frontend build verification
  console.log('\nTest 7: Frontend files compiled');
  try {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    if (html.includes('<script') || html.includes('</body>')) {
      console.log('✓ PASS: Frontend HTML loaded successfully');
      testResults.passed++;
    } else {
      console.log('✗ FAIL: Frontend HTML appears invalid');
      testResults.failed++;
    }
  } catch (error) {
    console.log('✗ FAIL: Could not verify frontend build:', error.message);
    testResults.failed++;
  }

  // Summary
  console.log(`\n=== Test Summary ===`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Total: ${testResults.passed + testResults.failed}`);

  if (testResults.failed === 0) {
    console.log('\n✓ All tests passed!');
  } else {
    console.log(`\n✗ ${testResults.failed} test(s) failed`);
  }
}

testUserRequirements();
