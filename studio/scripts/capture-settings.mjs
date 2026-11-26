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
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.waitForTimeout(1500);
await page.evaluate(() => {
  document.querySelectorAll('main, [data-scroll]').forEach((el) => { el.scrollTop = 0; });
  window.scrollTo(0, 0);
});

const sw = page.locator('button[role="switch"][aria-label="Turn QuoteLock activity on or off"]');
const state = () => sw.getAttribute('aria-checked');
const waitReady = async () => {
  await page.waitForFunction(() => {
    const el = document.querySelector('button[role="switch"][aria-label="Turn QuoteLock activity on or off"]');
    return Boolean(el) && !el.disabled;
  }, undefined, { timeout: 240000 });
};
const waitState = async (value) => {
  await page.waitForFunction((v) => {
    const el = document.querySelector('button[role="switch"][aria-label="Turn QuoteLock activity on or off"]');
    return Boolean(el) && !el.disabled && el.getAttribute('aria-checked') === v;
  }, value, { timeout: 240000 });
  await page.waitForTimeout(900);
};

await waitReady();
console.log('start state ' + (await state()));

if ((await state()) === 'false') {
  await sw.click();
  await waitState('true');
}

const shot = async (name) => {
  await page.screenshot({ path: path.join(out, `${name}.png`), scale: 'device' });
  console.log(name + ' ' + (await state()));
};

await shot('08-switch-on');

await sw.click();
await waitState('false');
await shot('09-switch-off');

await sw.click();
await waitState('true');
await shot('10-switch-on-again');

fs.writeFileSync(path.join(out, 'switch-box.json'), JSON.stringify(await sw.boundingBox(), null, 2));
await app.close();
