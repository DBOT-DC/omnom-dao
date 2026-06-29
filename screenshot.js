const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/tmp/omnom-screenshots';
fs.mkdirSync(OUT_DIR, { recursive: true });
const URL = 'http://127.0.0.1:3099';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  
  // Capture all 3 viewports - desktop, tablet, mobile
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ];
  
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`  [${vp.name}] ${msg.text()}`);
    });
    
    console.log(`Navigating ${vp.name}...`);
    await page.goto(URL, { waitUntil: 'commit', timeout: 15000 });
    
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch(e) {}
    
    // Wait for hydration animations to complete
    console.log(`  Waiting 12s for hydration + animations...`);
    await page.waitForTimeout(12000);
    
    const title = await page.title();
    console.log(`  Title: "${title}"`);
    
    // Full page screenshot
    console.log(`  Taking ${vp.name} full page...`);
    await page.screenshot({ 
      path: path.join(OUT_DIR, `${vp.name}-full.png`), 
      timeout: 60000,
      fullPage: true 
    });
    console.log(`✅ ${vp.name}-full`);
    
    // Viewport-only screenshot
    await page.screenshot({ 
      path: path.join(OUT_DIR, `${vp.name}.png`), 
      timeout: 60000 
    });
    console.log(`✅ ${vp.name}`);
    
    await context.close();
  }

  await browser.close();
  
  console.log('\nOutput files:');
  fs.readdirSync(OUT_DIR).forEach(f => {
    const stat = fs.statSync(path.join(OUT_DIR, f));
    console.log(`  ${f}: ${(stat.size / 1024).toFixed(0)}KB`);
  });
  console.log('Done!');
})();
