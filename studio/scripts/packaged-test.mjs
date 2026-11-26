import { _electron as electron } from 'playwright-core';
import path from 'node:path';

const studio = 'C:/Users/dell/QuoteLock/studio';
const exe = path.join(process.env.LOCALAPPDATA, 'Programs', 'QuoteLock', 'QuoteLock.exe');
const out = path.join(studio, 'shots');

const app = await electron.launch({
  executablePath: exe,
  cwd: path.dirname(exe),
  args: ['--user-data-dir=' + path.join(studio, 'shots', 'profile-packaged')],
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
console.log(`packaged home ready in ${Date.now() - started} ms`);
const root = await page.evaluate(() => window.ql.info());
console.log(`root: ${root.root}`);
console.log(`version: ${root.version} packaged: ${!root.dev}`);
const taskStart = Date.now();
await page.getByText('Scheduled task active').waitFor({ timeout: 20000 });
console.log(`task info in ${Date.now() - taskStart} ms`);
await page.screenshot({ path: `${out}/33-packaged-home.png` });
const body = await page.locator('body').innerText();
console.log(`queue visible: ${/card[s]?/.test(body)}`);
console.log('errors:', errors.length ? errors : 'none');
await app.close();
