/**
 * Renders the launch video frame by frame from the deterministic HTML scene and
 * streams JPEG frames straight into ffmpeg. No frame files on disk.
 *
 * Usage: node scripts/render-video.mjs [--stills 3.2,12,28] [--seconds 60] [--out path]
 */
import { _electron as electron } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const studio = 'C:/Users/dell/QuoteLock/studio';
const renderDir = path.join(studio, '..', 'video', 'render');
const exe = path.join(studio, 'node_modules', 'electron', 'dist', 'electron.exe');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const fps = Number(arg('fps', 60));
const seconds = Number(arg('seconds', 60));
const out = path.resolve(arg('out', path.join(studio, '..', 'video', 'renders', 'picture.mp4')));
const stills = arg('stills', null);

const app = await electron.launch({
  executablePath: exe,
  args: ['--user-data-dir=' + path.join(studio, 'shots', 'render-profile'), '.'],
  cwd: renderDir,
  env: { ...process.env },
});

const page = await app.firstWindow();
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForFunction(() => typeof window.__setFrame === 'function', undefined, { timeout: 30000 });

await page.evaluate(async () => {
  const names = [
    '01-home', '02-generating', '03-studio', '04-studio-paper', '05-studio-ready',
    '08-switch-on', '09-switch-off', '11-studio-toast',
  ];
  await Promise.all(
    names.map(
      (n) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = `../capture/${n}.png`;
        }),
    ),
  );
  const bg = document.getElementById('bgimg');
  if (bg && !bg.complete) await new Promise((r) => { bg.onload = r; bg.onerror = r; });
  await document.fonts.ready;
});

await page.evaluate(() => window.__setFrame(0));
await page.waitForTimeout(500);

if (stills) {
  const dir = path.join(studio, '..', 'video', 'frames');
  fs.mkdirSync(dir, { recursive: true });
  for (const value of stills.split(',')) {
    const t = Number(value);
    await page.evaluate((v) => window.__setFrame(v), t);
    await page.waitForTimeout(150);
    const file = path.join(dir, `still-${t.toFixed(2)}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 94 });
    console.log('still ' + file);
  }
  await app.close();
  process.exit(0);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
const ff = spawn(
  'ffmpeg',
  [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'mjpeg', '-i', '-',
    '-vf', 'format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
    '-x264-params', 'keyint=120:min-keyint=60:scenecut=0',
    '-r', String(fps),
    out,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);

const done = new Promise((resolve, reject) => {
  ff.on('error', reject);
  ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code))));
});

const total = Math.round(fps * seconds);
const started = Date.now();

const grab = async () => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await page.screenshot({ type: 'jpeg', quality: 92, timeout: 20000 });
    } catch (err) {
      console.log(`  screenshot retry ${attempt + 1}: ${err.message.split('\n')[0]}`);
      await page.waitForTimeout(400);
    }
  }
  throw new Error('screenshot failed after retries');
};

for (let f = 0; f < total; f += 1) {
  const t = f / fps;
  await page.evaluate((v) => window.__setFrame(v), t);
  const buf = await grab();
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 15 === 0) {
    const elapsed = (Date.now() - started) / 1000;
    const rate = f > 0 ? elapsed / f : 0;
    const pct = Math.floor((f / total) * 100);
    const fill = Math.floor(pct / 3.34);
    const bar = '#'.repeat(fill) + '.'.repeat(30 - fill);
    const line = `${bar} ${String(pct).padStart(3)}%  ${f}/${total}  elapsed ${(elapsed / 60).toFixed(1)}m  eta ${(((total - f) * rate) / 60).toFixed(1)}m`;
    fs.writeFileSync(path.join(studio, '..', 'video', 'render-progress.txt'), line + '\n');
    if (f % 300 === 0) console.log(`frame ${f}/${total} ${elapsed.toFixed(0)}s`);
  }
}

ff.stdin.end();
await done;
await app.close();

const info = fs.statSync(out);
console.log(`rendered ${out} ${(info.size / 1024 / 1024).toFixed(1)} MB in ${((Date.now() - started) / 1000).toFixed(0)}s`);
