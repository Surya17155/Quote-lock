/**
 * UI audit: drives the real Electron Studio and checks that every palette chip
 * and the main design controls reach the rendered preview and config.json.
 *
 * Reads the preview iframe's srcdoc instead of computed styles: React remounts
 * the iframe on each design change, so frameLocator lookups race.
 */
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const studio = 'C:/Users/dell/QuoteLock/studio';
const exe = path.join(studio, 'node_modules', 'electron', 'dist', 'electron.exe');
const out = path.join(studio, 'shots');

const log = (line) => {
  console.log(line);
  fs.appendFileSync(path.join(out, 'ui-audit.log'), `${line}\n`);
};
fs.writeFileSync(path.join(out, 'ui-audit.log'), '');

const app = await electron.launch({
  executablePath: exe,
  args: ['--user-data-dir=' + path.join(studio, 'shots', 'profile'), '.'],
  cwd: studio,
  env: { ...process.env },
});

const page = await app.firstWindow();
const errors = [];
page.on('pageerror', (err) => errors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.getByText('A quiet moment, on lock.').waitFor({ timeout: 60000 });
await page.getByRole('button', { name: 'Studio', exact: true }).click();
await page.getByRole('tab', { name: 'Colour' }).click();

const srcdoc = () =>
  page
    .locator('iframe[title="Quote card preview"]')
    .getAttribute('srcdoc', { timeout: 1500 })
    .catch(() => null);

const decode = (html) => {
  const body = html.match(/\nbody\{([^}]*)\}/)?.[1] || '';
  const pick = (chunk, key) => chunk.match(new RegExp(`${key}:([^;}]*)`))?.[1]?.trim() || '';
  return {
    bg: pick(body, 'background'),
    fg: pick(body, 'color'),
    author: html.match(/\.author\{([^}]*)\}/)?.[1]?.match(/color:([^;}]*)/)?.[1]?.trim() || '',
    rule: html.match(/\.rule\{([^}]*)\}/)?.[1]?.match(/background:([^;}]*)/)?.[1]?.trim() || '',
    stage: html.match(/<div class="stage ([^"]*)"/)?.[1] || '',
    layers: (html.match(/<div class="(bg|grain|vignette|scrim)/g) || []).join(','),
    font: html.match(/\.q\{font-family:([^;]*)/)?.[1] || '',
    quote: html.match(/<div class="q[^"]*">([^<]*)/)?.[1] || '',
    foot: html.includes('class="foot"'),
  };
};

const waitFor = async (predicate, ms = 15000) => {
  const started = Date.now();
  while (Date.now() - started < ms) {
    const html = await srcdoc();
    if (html) {
      const card = decode(html);
      if (predicate(card, html)) return { card, ms: Date.now() - started };
    }
    await page.waitForTimeout(60);
  }
  const html = (await srcdoc()) || '';
  return { card: decode(html), ms: Date.now() - started, timeout: true };
};

const chips = page.locator('button[title$="palette"]');
const total = await chips.count();
let pass = 0;
for (let i = 0; i < total; i += 1) {
  const chip = chips.nth(i);
  const name = (await chip.getAttribute('title')).replace(' palette', '');
  const swatches = await chip
    .locator('span[style]')
    .evaluateAll((nodes) => nodes.map((node) => node.style.background));
  const hex = (index) => {
    const value = swatches[index] || '';
    const direct = value.match(/#[0-9a-f]{6}/i)?.[0];
    if (direct) return direct.toLowerCase();
    const rgb = value.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (!rgb) return '';
    return `#${rgb
      .slice(1)
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')}`;
  };
  const expected = { bg: hex(0), fg: hex(1), accent: hex(2) };

  await chip.click();
  const { card, ms, timeout } = await waitFor(
    (state) =>
      state.bg === expected.bg &&
      state.fg === expected.fg &&
      (!expected.accent || state.rule === expected.accent),
  );
  if (!timeout) pass += 1;
  log(
    `${timeout ? 'FAIL' : 'PASS'} ${name.padEnd(9)} ${String(ms).padStart(4)} ms  ` +
      `bg ${card.bg} fg ${card.fg} accent ${card.rule} stage ${card.stage}`,
  );
}

const config = await page.evaluate(() => window.ql.config.read());
log(`saved palette: ${JSON.stringify(config.appearance?.palette)}`);

const tab = async (label) => {
  await page.getByRole('tab', { name: label }).click();
  await page.waitForTimeout(200);
};

await tab('Layout');
await page.getByRole('button', { name: 'Left aligned' }).click();
let state = (await waitFor((card) => card.stage.includes('layout-left'))).card;
log(`${state.stage.includes('layout-left') ? 'PASS' : 'FAIL'} layout applies (${state.stage})`);

await tab('Text');
await page.locator('select').first().selectOption('Georgia');
state = (await waitFor((card) => card.font.includes('Georgia'))).card;
log(`${state.font.includes('Georgia') ? 'PASS' : 'FAIL'} font change applies (${state.font.trim()})`);

await tab('Backdrop');
await page.getByRole('radio', { name: 'Gradient', exact: true }).click();
state = (await waitFor((_card, html) => html.includes('linear-gradient'))).card;
log(`${state.layers.includes('bg') ? 'PASS' : 'FAIL'} gradient applies (${state.layers})`);

await page.getByRole('radio', { name: 'Solid', exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole('tab', { name: 'Presets' }).click();
await page.waitForTimeout(300);

await page.screenshot({ path: `${out}/35-ui-audit.png` });
log(`palette pass ${pass}/${total}`);
log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`);
await app.close();
process.exit(pass === total && errors.length === 0 ? 0 : 1);
