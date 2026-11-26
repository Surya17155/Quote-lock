/**
 * Live publish test against the installed app (regression for the packaged
 * `spawn node.exe ENOENT` error). Renders the current design and publishes it.
 */
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const studio = 'C:/Users/dell/QuoteLock/studio';
const exe = path.join(process.env.LOCALAPPDATA, 'Programs', 'QuoteLock', 'QuoteLock.exe');
const out = path.join(studio, 'shots');
fs.writeFileSync(path.join(out, 'publish-packaged.log'), '');
const log = (line) => {
  console.log(line);
  fs.appendFileSync(path.join(out, 'publish-packaged.log'), `${line}\n`);
};

const app = await electron.launch({
  executablePath: exe,
  cwd: path.dirname(exe),
  args: ['--user-data-dir=' + path.join(studio, 'shots', 'profile-packaged')],
});
const page = await app.firstWindow();
const errors = [];
page.on('pageerror', (err) => errors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.getByText('A quiet moment, on lock.').waitFor({ timeout: 60000 });
log('packaged app ready');
await page.getByRole('button', { name: 'Studio', exact: true }).click();
await page.waitForTimeout(800);

const started = Date.now();
await page.getByRole('button', { name: 'Set as lock screen' }).click();

const outcome = await Promise.race([
  page
    .getByText('Lock screen updated')
    .waitFor({ timeout: 120000 })
    .then(() => 'ok')
    .catch(() => 'timeout'),
  page
    .getByText('Could not publish')
    .waitFor({ timeout: 120000 })
    .then(() => 'error')
    .catch(() => 'timeout'),
]);

const ms = Date.now() - started;
if (outcome === 'ok') {
  log(`PASS publish from installed app in ${ms} ms`);
} else {
  const description = await page
    .locator('text=Could not publish')
    .locator('xpath=..')
    .innerText()
    .catch(() => 'no details');
  log(`FAIL publish (${outcome}) :: ${description.replace(/\n/g, ' ')}`);
}

await page.screenshot({ path: `${out}/36-publish-packaged.png` });
log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`);
await app.close();
process.exit(outcome === 'ok' && errors.length === 0 ? 0 : 1);
