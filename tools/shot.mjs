import { chromium, devices } from '@playwright/test';
const [, , url, out, wait = '2500', clicks = ''] = process.argv;
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await browser.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('ERR', m.text()); });
page.on('pageerror', (e) => console.log('PAGEERR', e.message));
await page.goto(url);
for (const c of clicks.split(',').filter(Boolean)) { await page.waitForTimeout(600); await page.click(`[data-testid="${c}"]`); }
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
await browser.close();
