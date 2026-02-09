#!/usr/bin/env node

/**
 * Frontend Test Script
 * Tests if pages load without errors
 */

async function testFrontend() {
  console.log('🧪 Testing Frontend Pages...\n');

  const endpoints = [
    { path: '/', name: 'Dashboard' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
  ];

  for (const {path, name} of endpoints) {
    try {
      const response = await fetch(`http://localhost:5000${path}`);
      const html = await response.text();
      
      // Check for HTML structure
      const isHTML = html.includes('<!DOCTYPE') || html.includes('<html');
      const hasError = html.includes('ERROR') || html.includes('error') || html.includes('Cannot read');
      const hasRouter = html.includes('userRouter');

      const status = response.status === 200 ? '✓' : '✗';
      console.log(`${status} ${name} (${path}) - Status: ${response.status}`);
      
      if (hasError) {
        console.log(`  ⚠️  Contains error text`);
      }
      if (hasRouter) {
        console.log(`  ⚠️  Contains "userRouter" text`);
      }
      if (!isHTML) {
        console.log(`  ⚠️  Not HTML content`);
      }
      
      // Show first 500 chars if there's an error
      if (hasError || hasRouter) {
        const preview = html.substring(0, 500);
        console.log(`  Preview: ${preview.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`✗ ${name} (${path}) - Connection failed: ${error.message}`);
    }
  }
}

testFrontend();
