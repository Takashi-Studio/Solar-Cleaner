const puppeteer = require('puppeteer');
const fs = require('fs');
const path = 'C:\\Users\\Takashi Sensei\\.gemini\\antigravity\\brain\\a021412b-bcc2-416b-8f89-6bbd5a3e93dd\\';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport for desktop
  await page.setViewport({ width: 1280, height: 800 });
  
  // 1. Capture Login Page
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path + 'screenshot_login.png' });
  console.log('Saved screenshot_login.png');

  // Inject fake auth to access dashboard
  await page.evaluate(() => {
    localStorage.setItem('solar_clean_token', 'fake-token');
    localStorage.setItem('solar_clean_user', JSON.stringify({id: 1, name: 'Admin User', username: 'admin', role: 'ADMIN'}));
  });

  // Force a full page reload so React mounts again and reads localStorage
  await page.evaluate(() => { location.reload(); });
  await new Promise(r => setTimeout(r, 3000));

  // Capture Admin Overview (since role is ADMIN, it auto-redirects here on login)
  await page.screenshot({ path: path + 'screenshot_admin_overview.png' });
  console.log('Saved screenshot_admin_overview.png');

  // Now go to Dashboard
  await page.evaluate(() => { window.location.hash = '#/dashboard'; });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path + 'screenshot_dashboard.png' });
  console.log('Saved screenshot_dashboard.png');
  
  // 4. Capture Mobile View for Dashboard
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path + 'screenshot_dashboard_mobile.png' });
  console.log('Saved screenshot_dashboard_mobile.png');

  await browser.close();
})();
