/**
 * Page audit: visits every screen, exercises the safe controls, and fails on
 * any console error or page exception.
 */
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const studio = 'C:/Users/dell/QuoteLock/studio';
const exe = path.join(studio, 'node_modules', 'electron', 'dist', 'electron.exe');
const out = path.join(studio, 'shots');
const logFile = path.join(out, 'pages-audit.log');
fs.writeFileSync(logFile, '');
const log = (line) => {
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`);
};

const app = await electron.launch({
  executablePath: exe,
  args: ['--user-data-dir=' + path.join(studio, 'shots', 'profile'), '.'],
  cwd: studio,
  env: { ...process.env },
});

const page = await app.firstWindow();
const errors = [];
page.on('pageerror', (err) => errors.push(`${page.url()} :: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console :: ${msg.text()}`);
});

await page.getByText('A quiet moment, on lock.').waitFor({ timeout: 60000 });
log('home ready');

const nav = async (name) => {
  const before = errors.length;
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/page-${name.toLowerCase()}.png` });
  log(`${errors.length === before ? 'PASS' : 'FAIL'} ${name} opened${errors.length === before ? '' : ` (${errors.slice(before).join(' | ')})`}`);
};

for (const name of ['Studio', 'Library', 'Schedule', 'Activity', 'Settings', 'Home']) {
  await nav(name);
}

// Settings: theme switching must repaint without errors.
await nav('Settings');
for (const mode of ['Dark', 'Light', 'System']) {
  const before = errors.length;
  await page.getByRole('radio', { name: mode, exact: true }).click();
  await page.waitForTimeout(350);
  const bg = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--bg').trim());
  log(`${errors.length === before ? 'PASS' : 'FAIL'} theme ${mode} (${bg || 'n/a'})`);
}
await page.screenshot({ path: `${out}/page-settings-theme.png` });

// Settings: API key field must stay masked and never echo the saved key.
const keyInput = page.locator('input[type="password"]');
const placeholder = await keyInput.getAttribute('placeholder');
const value = await keyInput.inputValue();
log(`${value === '' && /•/.test(placeholder) ? 'PASS' : 'FAIL'} saved key masked (${placeholder})`);

// Schedule: task refresh + category toggle round trip.
await nav('Schedule');
const refresh = page.getByRole('button', { name: /Refresh/ }).first();
const before = errors.length;
await refresh.click();
await page.waitForTimeout(2500);
log(`${errors.length === before ? 'PASS' : 'FAIL'} task refresh`);
const category = page.getByRole('button', { name: 'Stoicism', exact: true });
await category.click();
await page.waitForTimeout(700);
await category.click();
await page.waitForTimeout(700);
log('category toggle round trip done');

// Activity: manual refresh.
await nav('Activity');
await page.getByRole('button', { name: /Refresh/ }).first().click();
await page.waitForTimeout(1200);
log('activity refresh done');

log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`);
await app.close();
process.exit(errors.length === 0 ? 0 : 1);
