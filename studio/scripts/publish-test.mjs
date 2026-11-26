import { _electron as electron } from 'playwright-core';
import path from 'node:path';

const studio = 'C:/Users/dell/QuoteLock/studio';
const exe = path.join(studio, 'node_modules', 'electron', 'dist', 'electron.exe');
const out = path.join(studio, 'shots');

const app = await electron.launch({
  executablePath: exe,
  args: ['--user-data-dir=' + path.join(studio, 'shots', 'profile'), '.'],
  cwd: studio,
  env: { ...process.env },
});

const page = await app.firstWindow();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('console:', msg.text());
});
page.on('pageerror', (err) => {
  errors.push(err.message);
  console.log('pageerror:', err.message);
});

await page.getByText('A quiet moment, on lock.').waitFor({ timeout: 30000 });
await page.getByRole('button', { name: 'Studio', exact: true }).click();
await page.waitForTimeout(800);

const started = Date.now();
await page.getByRole('button', { name: 'Set as lock screen' }).click();
const toast = page.getByText(/Lock screen updated|Could not publish/).first();
await toast.waitFor({ timeout: 120000 });
console.log(`publish in ${Date.now() - started} ms`);
console.log(`toast: ${await toast.innerText()}`);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/31-electron-published.png` });

console.log('errors:', errors.length ? errors : 'none');
await app.close();
