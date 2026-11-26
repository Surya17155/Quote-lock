import { chromium } from 'playwright-core';

const base = 'http://localhost:5173';
const out = 'C:/Users/dell/QuoteLock/studio/shots';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('quotelock-theme', 'dark'));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('console:', msg.text());
});
page.on('pageerror', (err) => console.log('pageerror:', err.message));

await page.goto(base, { waitUntil: 'networkidle' });
await page.getByText('A quiet moment, on lock.').waitFor();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/01-home-dark.png`, fullPage: false });

await page.getByRole('button', { name: 'Studio', exact: true }).click();
await page.getByText('Make it feel like yours.').waitFor();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/02-studio-presets.png` });

await page.getByRole('tab', { name: 'Colour' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/03-studio-colour.png` });

await page.getByRole('tab', { name: 'Backdrop' }).click();
await page.getByRole('radio', { name: 'Gradient' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/04-studio-backdrop.png` });

await page.getByRole('button', { name: 'Library', exact: true }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/05-library.png` });

await page.getByRole('button', { name: 'Schedule', exact: true }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/06-schedule.png` });

await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/07-settings.png` });

await page.getByRole('button', { name: 'Activity', exact: true }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/08-activity.png` });

const lightContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
});
const lightPage = await lightContext.newPage();
await lightPage.addInitScript(() => localStorage.setItem('quotelock-theme', 'light'));
await lightPage.goto(base, { waitUntil: 'networkidle' });
await lightPage.getByText('A quiet moment, on lock.').waitFor();
await lightPage.waitForTimeout(800);
await lightPage.screenshot({ path: `${out}/09-home-light.png` });
await lightPage.getByRole('button', { name: 'Studio', exact: true }).click();
await lightPage.waitForTimeout(700);
await lightPage.screenshot({ path: `${out}/10-studio-light.png` });

const errors = [];
page.on('pageerror', (err) => errors.push(err.message));
console.log('done', errors.length ? errors : 'no page errors');
await browser.close();
