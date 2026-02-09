#!/usr/bin/env node

/**
 * Frontend Deep Inspection
 * Checks for runtime errors in the HTML
 */

async function inspectPage(path) {
  console.log(`\n📄 Inspecting ${path}...\n`);

  try {
    const response = await fetch(`http://localhost:5000${path}`);
    const html = await response.text();
    
    // Look for runtime error modal
    if (html.includes('RUNTIME_ERROR') || html.includes('runtime-error')) {
      console.log('⚠️  Found runtime error indicator in HTML');
      
      // Extract error modal content
      const errorMatch = html.match(/RUNTIME_ERROR[^}]*\}/);
      if (errorMatch) {
        console.log('Error details:', errorMatch[0].substring(0, 300));
      }
    } else {
      console.log('✓ No runtime error indicators found in HTML');
    }
    
    // Check for React App mount
    if (html.includes('id="root"')) {
      console.log('✓ Found root element for React');
    } else {
      console.log('⚠️  Missing root element');
    }
    
    // Check for app initialization script
    if (html.includes('index') && html.includes('js')) {
      console.log('✓ Found main JavaScript bundle reference');
    }
    
    // Look for key page identifiers
    if (path === '/login') {
      if (html.includes('password') || html.includes('Login')) {
        console.log('✓ Login page content appears present');
      }
    } else if (path === '/register') {
      if (html.includes('password') || html.includes('Register') || html.includes('register')) {
        console.log('✓ Register page content appears present');
      } else {
        console.log('⚠️  Register page content might be missing');
      }
    }
    
  } catch (error) {
    console.log(`✗ Connection failed: ${error.message}`);
  }
}

// Inspect all three pages
(async () => {
  await inspectPage('/');
  await inspectPage('/login');
  await inspectPage('/register');
})();
