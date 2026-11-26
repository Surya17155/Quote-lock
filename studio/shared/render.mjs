import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { buildCardHtml } from './card.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key.slice(2)] = true;
    else {
      out[key.slice(2)] = next;
      i += 1;
    }
  }
  return out;
}

function fail(message) {
  process.stdout.write(`${JSON.stringify({ ok: false, error: String(message) })}\n`);
  process.exit(1);
}

function edgeCandidates() {
  const list = [];
  if (process.env.ProgramFiles) {
    list.push(path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
  }
  if (process.env['ProgramFiles(x86)']) {
    list.push(
      path.join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  }
  if (process.env.LOCALAPPDATA) {
    list.push(
      path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  }
  return list;
}

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 24) return null;
  if (buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function localImageToUrl(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^(data:image\/|file:|ql:|https?:)/i.test(v)) return v;
  return pathToFileURL(path.resolve(v)).href;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.data || !args.out) fail('Usage: render.mjs --data payload.json --out card.png');

  const dataPath = path.resolve(args.data);
  const outPath = path.resolve(args.out);
  const raw = fs.readFileSync(dataPath, 'utf8').replace(/^\uFEFF/, '');
  const payload = JSON.parse(raw);
  const width = Number(payload.width) || 1920;
  const height = Number(payload.height) || 1080;

  if (payload.appearance?.background?.image) {
    payload.appearance.background.image = localImageToUrl(payload.appearance.background.image);
  }
  if (payload.backgroundImage) payload.backgroundImage = localImageToUrl(payload.backgroundImage);

  const html = buildCardHtml({
    ...payload,
    width,
    height,
    appearance: payload.appearance,
    backgroundImage: payload.backgroundImage,
  });

  const htmlPath = path.resolve(payload.htmlPath || path.join(path.dirname(outPath), 'current.html'));
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, html, 'utf8');

  const edge =
    (payload.edge && fs.existsSync(payload.edge) && payload.edge) ||
    edgeCandidates().find((candidate) => fs.existsSync(candidate));
  if (!edge) fail('Microsoft Edge not found.');

  const profile = path.resolve(payload.profileDir || path.join(path.dirname(outPath), 'edge-render'));
  fs.mkdirSync(profile, { recursive: true });
  fs.rmSync(outPath, { force: true });

  const edgeArgs = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--allow-file-access-from-files',
    `--window-size=${width},${height}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--virtual-time-budget=3000',
    `--screenshot=${outPath}`,
    pathToFileURL(htmlPath).href,
  ];

  const child = spawn(edge, edgeArgs, { windowsHide: true, stdio: 'ignore' });

  const deadline = Date.now() + 30000;
  let size = null;
  while (Date.now() < deadline) {
    if (fs.existsSync(outPath)) {
      try {
        size = pngSize(outPath);
        if (size) break;
      } catch {
        /* file still being written */
      }
    }
    await sleep(200);
  }

  try {
    child.kill();
  } catch {
    /* ignore */
  }

  if (!size) fail('Edge did not produce a readable screenshot.');
  if (size.width !== width || size.height !== height) {
    fs.rmSync(outPath, { force: true });
    fail(`Unexpected image size ${size.width}x${size.height}, expected ${width}x${height}.`);
  }

  process.stdout.write(
    `${JSON.stringify({ ok: true, out: outPath, html: htmlPath, width: size.width, height: size.height })}\n`,
  );
}

main().catch((error) => fail(error?.message || error));
