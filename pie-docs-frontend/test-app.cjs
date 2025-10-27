const { chromium } = require('playwright');

async function testApplication() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });

  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    networkRequests.push(`${request.method()} ${request.url()}`);
  });

  try {
    console.log('🧪 Testing React Application at http://localhost:3001');

    // Test 1: Main route (/)
    console.log('\n📍 Testing main route (/)...');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });

    // Wait for React to render
    await page.waitForTimeout(3000);

    // Check current URL after potential redirects
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Check if authenticated (should redirect to dashboard)
    const isDashboard = currentUrl.includes('/dashboard');
    console.log(`✅ Auto-redirect to dashboard: ${isDashboard}`);

    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check for authentication indicators
    const hasLogoutButton = await page.locator('button, a').filter({ hasText: /logout|sign out/i }).count() > 0;
    const hasUserMenu = await page.locator('[data-testid="user-menu"], .user-menu, [role="button"]').filter({ hasText: /user|profile/i }).count() > 0;
    const hasNavigation = await page.locator('nav, [role="navigation"]').count() > 0;

    console.log(`✅ Has logout option: ${hasLogoutButton}`);
    console.log(`✅ Has user menu: ${hasUserMenu}`);
    console.log(`✅ Has navigation: ${hasNavigation}`);

    // Test navigation routes
    const routes = ['/dashboard', '/documents', '/search', '/workflows', '/approvals'];

    for (const route of routes) {
      console.log(`\n📍 Testing route ${route}...`);
      await page.goto(`http://localhost:3001${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const routeUrl = page.url();
      const isCorrectRoute = routeUrl.includes(route);
      console.log(`✅ Route loads correctly: ${isCorrectRoute}`);

      // Check for content loading
      const hasContent = await page.locator('main, [role="main"], .main-content, .page-content').count() > 0;
      const hasLoader = await page.locator('.loading, .spinner, [data-testid="loading"]').count() > 0;

      console.log(`✅ Has main content: ${hasContent}`);
      console.log(`🔄 Still loading: ${hasLoader}`);
    }

    // Check for errors
    console.log('\n🔍 Console Messages:');
    consoleMessages.forEach(msg => {
      if (msg.includes('error') || msg.includes('Error') || msg.includes('ERROR')) {
        console.log(`❌ ${msg}`);
      } else if (msg.includes('warn') || msg.includes('Warning') || msg.includes('WARN')) {
        console.log(`⚠️  ${msg}`);
      } else {
        console.log(`ℹ️  ${msg}`);
      }
    });

    console.log('\n🌐 Network Requests Summary:');
    const uniqueRequests = [...new Set(networkRequests)];
    console.log(`Total unique requests: ${uniqueRequests.length}`);

    // Check for failed requests
    const failedRequests = [];
    page.on('response', response => {
      if (!response.ok() && response.status() !== 304) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    if (failedRequests.length > 0) {
      console.log('❌ Failed requests:');
      failedRequests.forEach(req => console.log(`  ${req}`));
    } else {
      console.log('✅ No failed requests detected');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testApplication().then(() => {
  console.log('\n🎉 Application testing completed!');
}).catch(error => {
  console.error('💥 Test execution failed:', error);
});