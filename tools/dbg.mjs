import { chromium, devices } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('PAGEERR', e.message));
await page.goto('http://localhost:4317/?level=1&bot=1&speed=2&seed=3');
await page.waitForTimeout(9000);
console.log(await page.evaluate(() => { const s = window.__kevspire.session.state; return JSON.stringify({ slots: s.slots.map((t,i)=>t?i+':'+t.kind:null).filter(Boolean), floors: s.floors, phase: s.phase, cam: window.__kevspire.session.renderer.cam.y }); }));
await browser.close();
