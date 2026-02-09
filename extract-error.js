#!/usr/bin/env node

/**
 * Extract Runtime Error from Vite Runtime Error Modal
 */

async function extractError(path) {
  console.log(`\n🔍 Checking ${path}...\n`);

  try {
    const response = await fetch(`http://localhost:5000${path}`);
    const html = await response.text();
    
    // Look for the JSON error object
    const jsonMatch = html.match(/\{"type":"runtime-error"[^}]*"message":"[^"]*"[^}]*\}/);
    
    if (jsonMatch) {
      const errorJson = JSON.parse(jsonMatch[0]);
      console.log('Error found:');
      console.log('  Message:', errorJson.message);
      console.log('  File:', errorJson.loc?.file);
      console.log('  Line:', errorJson.loc?.line);
      console.log('  Column:', errorJson.loc?.column);
      console.log('  Stack:', errorJson.stack?.substring(0, 200));
    } else {
      // Try broader search
      if (html.includes('runtime-error')) {
        console.log('Runtime error modal detected but could not parse JSON');
        // Show raw snippet
        const start = html.indexOf('runtime-error');
        console.log('Snippet:', html.substring(start, start + 200));
      } else {
        console.log('✓ No runtime errors detected');
      }
    }
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

// Check all pages
(async () => {
  await extractError('/');
  await extractError('/login');
  await extractError('/register');
  console.log('\n');
})();
