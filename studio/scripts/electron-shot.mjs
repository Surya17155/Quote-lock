import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
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

const started = Date.now();
await page.getByText('A quiet moment, on lock.').waitFor({ timeout: 30000 });
const readyMs = Date.now() - started;
console.log(`home ready in ${readyMs} ms`);

await page.evaluate(() => localStorage.setItem('quotelock-theme', 'dark'));
await page.reload();
await page.getByText('A quiet moment, on lock.').waitFor({ timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/20-electron-home.png` });
fs.writeFileSync(`${out}/electron-home.txt`, await page.locator('body').innerText(), 'utf8');

await page.getByRole('button', { name: 'Generate now', exact: true }).click();
await page.getByText(/Fresh cards ready|Everything is up to date/).waitFor({ timeout: 60000 });
const toast = await page
  .getByText(/Fresh cards ready|Everything is up to date/)
  .first()
  .innerText();
console.log(`generate toast: ${toast}`);
await page.screenshot({ path: `${out}/24-electron-after-generate.png` });
fs.writeFileSync(`${out}/electron-after.txt`, await page.locator('body').innerText(), 'utf8');

await page.getByRole('button', { name: 'Studio', exact: true }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/21-electron-studio.png` });

const exportPath = path.join(out, 'qa-export.png');
await app.evaluate(({ dialog }, filePath) => {
  dialog.showSaveDialog = async () => ({ canceled: false, filePath });
}, exportPath);
await page.getByRole('button', { name: 'Export PNG' }).click();
await page.getByText('PNG exported').waitFor({ timeout: 120000 });
console.log(`export bytes: ${fs.statSync(exportPath).size}`);

await page.getByRole('tab', { name: 'Colour' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/27-electron-studio-colour.png` });

await page.getByRole('tab', { name: 'Backdrop' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/28-electron-studio-backdrop.png` });

await page.getByRole('button', { name: 'Schedule', exact: true }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/25-electron-schedule.png` });

await page.getByRole('button', { name: 'Activity', exact: true }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/29-electron-activity.png` });

await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/30-electron-settings.png` });

await page.getByRole('button', { name: 'Home', exact: true }).click();
if (await page.locator('html.dark').count()) {
  await page.locator('button[aria-label*="theme"]').first().click();
  await page.waitForTimeout(500);
}
await page.evaluate(() => localStorage.setItem('quotelock-theme', 'light'));
const light = !(await page.locator('html.dark').count());
console.log(`light theme applied: ${light}`);
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/26-electron-home-light.png` });

console.log('errors:', errors.length ? errors : 'none');
await app.close();
