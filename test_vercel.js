const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating to production site...");
  await page.goto('https://ilash-studio-oficial.vercel.app/', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
