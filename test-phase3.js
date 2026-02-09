#!/usr/bin/env node

/**
 * Phase 3 Automated Test Suite
 * Tests user authentication, profile management, portfolio operations
 */

const API_BASE = 'http://localhost:5000';
let testCount = 0;
let passCount = 0;
let failCount = 0;
const cookies = [];
const results = [];

async function request(method, path, body = null, sessionId = null) {
  const url = new URL(path, API_BASE);
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (sessionId) {
    options.headers.Cookie = `connect.sid=${sessionId}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    let bodyData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      bodyData = await response.json();
    } else {
      bodyData = await response.text();
    }
    
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers),
      body: bodyData,
    };
  } catch (error) {
    throw error;
  }
}

function logTest(name, passed) {
  testCount++;
  if (passed) {
    passCount++;
    console.log(`[${testCount}] ${name}: ✅ PASS`);
  } else {
    failCount++;
    console.log(`[${testCount}] ${name}: ❌ FAIL`);
  }
}

async function runTests() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           Phase 3: 实时虚拟交易与用户系统 - 测试执行           ║
║                     Test Execution Started                           ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  // Section 1: Authentication Tests
  console.log('\n📋 Section 1: User Registration & Authentication Tests\n');

  const testUsername = `testuser_${Math.random().toString(36).substr(2, 9)}`;
  const testPassword = 'TestPass123';

  // Test 1: Registration
  try {
    const res = await request('POST', '/api/auth/register', {
      username: testUsername,
      password: testPassword,
    });
    logTest('User Registration (Valid)', res.statusCode === 201);
  } catch (e) {
    logTest('User Registration (Valid)', false);
    console.error(e.message);
  }

  // Test 2: Duplicate registration
  try {
    const res = await request('POST', '/api/auth/register', {
      username: testUsername,
      password: testPassword,
    });
    logTest('User Registration (Duplicate)', res.statusCode === 409);
  } catch (e) {
    logTest('User Registration (Duplicate)', false);
  }

  // Test 3: Login
  let sessionId = null;
  try {
    const res = await request('POST', '/api/auth/login', {
      username: testUsername,
      password: testPassword,
    });
    logTest('User Login (Valid)', res.statusCode === 200);
    if (res.headers['set-cookie']) {
      const setCookie = res.headers['set-cookie'][0];
      const match = setCookie.match(/connect\.sid=([^;]+)/);
      if (match) {
        sessionId = match[1];
      }
    }
  } catch (e) {
    logTest('User Login (Valid)', false);
  }

  // Test 4: Invalid login
  try {
    const res = await request('POST', '/api/auth/login', {
      username: testUsername,
      password: 'WrongPassword',
    });
    logTest('User Login (Invalid Password)', res.statusCode === 401);
  } catch (e) {
    logTest('User Login (Invalid Password)', false);
  }

  // Test 5: Get current user
  try {
    const res = await request('GET', '/api/auth/me', null, sessionId);
    logTest('Get Current User (Authenticated)', res.statusCode === 200);
  } catch (e) {
    logTest('Get Current User (Authenticated)', false);
  }

  // Test 6: Get current user without auth
  try {
    const res = await request('GET', '/api/auth/me');
    logTest('Get Current User (Unauthenticated)', res.statusCode === 401);
  } catch (e) {
    logTest('Get Current User (Unauthenticated)', false);
  }

  // Section 2: Profile Management
  console.log('\n📋 Section 2: User Profile Management Tests\n');

  // Test 7: Get profile
  try {
    const res = await request('GET', '/api/profile', null, sessionId);
    logTest('Get User Profile', res.statusCode === 200);
  } catch (e) {
    logTest('Get User Profile', false);
  }

  // Test 8: Update profile
  try {
    const res = await request('PUT', '/api/profile', {
      displayName: 'Test User',
      riskTolerance: 'moderate',
      theme: 'dark',
    }, sessionId);
    logTest('Update User Profile', res.statusCode === 200);
  } catch (e) {
    logTest('Update User Profile', false);
  }

  // Test 9: Update profile with invalid risk tolerance
  try {
    const res = await request('PUT', '/api/profile', {
      displayName: 'Test',
      riskTolerance: 'invalid_level',
    }, sessionId);
    logTest('Update Profile (Invalid Risk Tolerance)', res.statusCode === 400);
  } catch (e) {
    logTest('Update Profile (Invalid Risk Tolerance)', false);
  }

  // Section 3: Portfolio Management
  console.log('\n📋 Section 3: Portfolio CRUD Tests\n');

  let portfolioId = null;

  // Test 10: Create portfolio
  try {
    const res = await request('POST', '/api/portfolios', {
      name: 'Test Portfolio 1',
      initialCash: 100000,
      type: 'live',
    }, sessionId);
    logTest('Create Portfolio', res.statusCode === 201);
    if (res.statusCode === 201 && res.body && res.body.id) {
      portfolioId = res.body.id;
    }
  } catch (e) {
    logTest('Create Portfolio', false);
  }

  // Test 11: Get portfolios list
  try {
    const res = await request('GET', '/api/portfolios', null, sessionId);
    logTest('Get Portfolios List', res.statusCode === 200 && Array.isArray(res.body));
  } catch (e) {
    logTest('Get Portfolios List', false);
  }

  // Test 12: Get portfolio details
  if (portfolioId) {
    try {
      const res = await request('GET', `/api/portfolios/${portfolioId}`, null, sessionId);
      logTest('Get Portfolio Details', res.statusCode === 200);
    } catch (e) {
      logTest('Get Portfolio Details', false);
    }

    // Test 13: Delete portfolio (create a second one first)
    try {
      const createRes = await request('POST', '/api/portfolios', {
        name: 'Test Portfolio 2',
        initialCash: 50000,
        type: 'live',
      }, sessionId);

      if (createRes.statusCode === 201 && createRes.body && createRes.body.id) {
        const deleteRes = await request('DELETE', `/api/portfolios/${createRes.body.id}`, null, sessionId);
        logTest('Delete Portfolio', deleteRes.statusCode === 200);
      } else {
        logTest('Delete Portfolio', false);
      }
    } catch (e) {
      logTest('Delete Portfolio', false);
    }
  }

  // Test 14: Get portfolios unauthenticated
  try {
    const res = await request('GET', '/api/portfolios');
    logTest('Get Portfolios (Unauthenticated)', res.statusCode === 401);
  } catch (e) {
    logTest('Get Portfolios (Unauthenticated)', false);
  }

  // Section 4: Data Isolation
  console.log('\n📋 Section 4: Data Isolation Tests\n');

  const user2Username = `testuser2_${Math.random().toString(36).substr(2, 9)}`;
  const user2Password = 'TestPass456';
  let session2Id = null;

  // Test 15: Register user 2
  try {
    const res = await request('POST', '/api/auth/register', {
      username: user2Username,
      password: user2Password,
    });
    logTest('User 2 Registration', res.statusCode === 201);
  } catch (e) {
    logTest('User 2 Registration', false);
  }

  // Test 16: Login user 2
  try {
    const res = await request('POST', '/api/auth/login', {
      username: user2Username,
      password: user2Password,
    });
    logTest('User 2 Login', res.statusCode === 200);
    if (res.headers['set-cookie']) {
      const setCookie = res.headers['set-cookie'][0];
      const match = setCookie.match(/connect\.sid=([^;]+)/);
      if (match) {
        session2Id = match[1];
      }
    }
  } catch (e) {
    logTest('User 2 Login', false);
  }

  // Test 17: Cross-user portfolio access (data isolation)
  if (portfolioId && session2Id) {
    try {
      const res = await request('GET', `/api/portfolios/${portfolioId}`, null, session2Id);
      logTest('Data Isolation (Cross-User Access)', res.statusCode === 404);
    } catch (e) {
      logTest('Data Isolation (Cross-User Access)', false);
    }
  }

  // Section 5: Logout
  console.log('\n📋 Section 5: Logout Test\n');

  // Test 18: Logout
  try {
    const res = await request('POST', '/api/auth/logout', null, sessionId);
    logTest('User Logout', res.statusCode === 200);
  } catch (e) {
    logTest('User Logout', false);
  }

  // Test 19: Access after logout
  try {
    const res = await request('GET', '/api/auth/me', null, sessionId);
    logTest('Access After Logout (Should Fail)', res.statusCode === 401);
  } catch (e) {
    logTest('Access After Logout (Should Fail)', true);
  }

  // Print summary
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                        Test Summary Report                           ║
╚══════════════════════════════════════════════════════════════════════╝
`);

  console.log(`📊 Total Tests: ${testCount}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📈 Pass Rate: ${((passCount / testCount) * 100).toFixed(2)}%\n`);

  if (failCount === 0) {
    console.log('✅ ALL TESTS PASSED!' );
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Review output above.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
