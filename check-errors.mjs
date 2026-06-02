import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER_CONSOLE_ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('BROWSER_PAGE_ERROR:', error.message);
  });

  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle2', timeout: 5000 });
  } catch (err) {
    console.log('GOTO_ERROR:', err.message);
  }

  await browser.close();
  process.exit(0);
})();
