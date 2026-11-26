/**
 * Video capture: drives the real Electron Studio and saves high-resolution
 * stills for each beat of the launch video, plus the screen boxes the renderer
 * needs for the cursor path.
 */
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const studio = 'C:/Users/dell/QuoteLock/studio';
const out = path.join(studio, '..', 'video', 'capture');
const exe = path.join(studio, 'node_modules', 'electron', 'dist', 'electron.exe');
const W = 1600;
const H = 1000;

fs.mkdirSync(out, { recursive: true });
const log = (line) => console.log(line);

const app = await electron.launch({
  executablePath: exe,
  args: ['--user-data-dir=' + path.join(studio, 'shots', 'video-profile'), '.'],
  cwd: studio,
  env: { ...process.env },
});

const page = await app.firstWindow();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.getByText('A quiet moment, on lock.').waitFor({ timeout: 60000 });
await page.setViewportSize({ width: W, height: H });
await page.waitForTimeout(900);

const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: W,
  height: H,
  deviceScaleFactor: 2,
  mobile: false,
});
await page.waitForTimeout(600);

const boxes = {};

const box = async (locator, key) => {
  const b = await locator.boundingBox();
  if (!b) return;
  boxes[key] = {
    x: Math.round(b.x),
    y: Math.round(b.y),
    w: Math.round(b.width),
    h: Math.round(b.height),
    cx: Math.round(b.x + b.width / 2),
    cy: Math.round(b.y + b.height / 2),
  };
};

const shot = async (name) => {
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file, scale: 'device' });
  const s = fs.statSync(file);
  log(`${name}.png ${s.size} bytes`);
};

const scrollTop = async () => {
  await page.evaluate(() => {
    document.querySelectorAll('main, [data-scroll]').forEach((el) => {
      el.scrollTop = 0;
    });
    window.scrollTo(0, 0);
  });
};

// 1. Home, ready state.
await scrollTop();
await page.waitForTimeout(400);
await box(page.getByRole('button', { name: /Generate now|Generating/ }), 'generate');
await box(page.getByRole('button', { name: 'Studio', exact: true }), 'navStudio');
await box(page.getByRole('button', { name: 'Settings', exact: true }), 'navSettings');
await shot('01-home');

// 2. Home, generating.
const gen = page.getByRole('button', { name: 'Generate now' });
if (await gen.count()) {
  await gen.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
await shot('02-generating');

await page.getByRole('button', { name: 'Studio', exact: true }).click();
await page.waitForTimeout(1200);
await scrollTop();
await shot('03-studio');

// 3. Studio, Paper preset chosen.
const paper = page.getByText('Paper', { exact: true }).first();
await box(paper, 'paper');
await paper.click();
await page.waitForTimeout(1000);
await shot('04-studio-paper');

const applyBtn = page.getByRole('button', { name: /Set as lock screen/ });
await box(applyBtn, 'apply');
await shot('05-studio-ready');

// 4. Settings.
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.waitForTimeout(1200);
await scrollTop();
await shot('06-settings-top');

const providerPanel = page.getByText('Providers', { exact: true }).first();
if (await providerPanel.count()) {
  await providerPanel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
}
await shot('07-providers');
await box(page.getByText('NVIDIA NIM', { exact: true }).first(), 'provider');

const sw = page.getByRole('switch', { name: 'Turn QuoteLock activity on or off' });
await sw.scrollIntoViewIfNeeded();
await page.waitForFunction(
  () => {
    const el = document.querySelector('button[role="switch"][aria-label="Turn QuoteLock activity on or off"]');
    return Boolean(el) && !el.disabled;
  },
  undefined,
  { timeout: 150000 },
);
await page.waitForTimeout(700);
await box(sw, 'switch');
await shot('08-switch-on');

await sw.click();
await page.waitForTimeout(1000);
await shot('09-switch-off');

await sw.click();
await page.waitForTimeout(900);
await shot('10-switch-on-again');

fs.writeFileSync(path.join(out, 'boxes.json'), JSON.stringify({ W, H, boxes, errors }, null, 2));
log('boxes ' + JSON.stringify(boxes));
log('errors ' + JSON.stringify(errors));

await app.close();
