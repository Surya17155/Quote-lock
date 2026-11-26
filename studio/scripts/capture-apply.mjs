import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const studio = 'C:/Users/dell/QuoteLock/studio';
const out = path.join(studio, '..', 'video', 'capture');
const exe = path.join(studio, 'node_modules', 'electron', 'dist', 'electron.exe');

const app = await electron.launch({
  executablePath: exe,
  args: ['--user-data-dir=' + path.join(studio, 'shots', 'video-profile'), '.'],
  cwd: studio,
  env: { ...process.env },
});
const page = await app.firstWindow();
await page.getByText('A quiet moment, on lock.').waitFor({ timeout: 60000 });
await page.setViewportSize({ width: 1600, height: 1000 });
await page.getByRole('button', { name: 'Studio', exact: true }).click();
await page.waitForTimeout(1500);
await page.evaluate(() => {
  document.querySelectorAll('main, [data-scroll]').forEach((el) => { el.scrollTop = 0; });
  window.scrollTo(0, 0);
});

const apply = page.getByRole('button', { name: /Set as lock screen/ });
await apply.scrollIntoViewIfNeeded();
console.log('apply box ' + JSON.stringify(await apply.boundingBox()));

await apply.click();
await page.waitForTimeout(4000);
await page.screenshot({ path: path.join(out, '11-studio-toast.png'), scale: 'device' });
console.log('toast shot');

await page.getByRole('button', { name: 'Home', exact: true }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, '12-home-after.png'), scale: 'device' });
console.log('home after');

await app.close();
