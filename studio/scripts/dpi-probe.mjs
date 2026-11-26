import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const studio = 'C:/Users/dell/QuoteLock/studio';
const exe = path.join(studio, 'node_modules', 'electron', 'dist', 'electron.exe');
const out = path.join(studio, 'shots');

const app = await electron.launch({
  executablePath: exe,
  args: [
    '--force-device-scale-factor=2',
    '--high-dpi-support=1',
    '--user-data-dir=' + path.join(out, 'dpi-profile'),
    '.',
  ],
  cwd: studio,
  env: { ...process.env },
});
const page = await app.firstWindow();
await page.getByText('A quiet moment, on lock.').waitFor({ timeout: 60000 });
await page.setViewportSize({ width: 1600, height: 1000 });
await page.waitForTimeout(800);
const info = await page.evaluate(() => ({
  dpr: window.devicePixelRatio,
  iw: window.innerWidth,
  ih: window.innerHeight,
}));
await page.setViewportSize({ width: 1600, height: 1000 });
await page.screenshot({ path: path.join(out, 'dpi-probe.png'), scale: 'device' });
console.log(JSON.stringify(info));
await app.close();
