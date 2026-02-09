#!/usr/bin/env node

/**
 * Get Actual Runtime Errors from Vite Runtime Error Modal
 */

async function getRuntimeError(path) {
  console.log(`\n🔍 ${path}...\n`);

  try {
    const response = await fetch(`http://localhost:5000${path}`);
    const html = await response.text();
    
    // Look for the actual error data sent to the modal
    // Pattern: hot.send("custom:runtime-error"...)
    const match = html.match(/hot\.send\("custom:runtime-error",\s*({[^}]*?"message":"[^"]+"[^}]*})/);
    
    if (match && match[1]) {
      try {
        const errorData = JSON.parse(match[1]);
        console.log('✗ Runtime Error Found:');
        console.log(`  Message: ${errorData.message}`);
        if (errorData.stack) {
          const stack = errorData.stack.split('\n').slice(0, 3);
          console.log(`  Stack: ${stack.join('\n    ')}`);
        }
      } catch (e) {
        console.log('Could not parse error data');
      }
    } else {
      // Try another pattern - window.__INIT_ERROR__
      if (html.includes('__INIT_ERROR__') || html.includes('__ERROR__')) {
        console.log('Error object found');
        const errorMatch = html.match(/__[A-Z_]+__\s*=\s*({[^}]*})/);
        if (errorMatch) {
          console.log(errorMatch[1].substring(0, 200));
        }
      } else {
        console.log('✓ No runtime errors detected');
      }
    }
    
  } catch (error) {
    console.log(`✗ Connection failed: ${error.message}`);
  }
}

// Check all pages
(async () => {
  await getRuntimeError('/');
  await getRuntimeError('/login');  
  await getRuntimeError('/register');
  console.log('\n');
})();
