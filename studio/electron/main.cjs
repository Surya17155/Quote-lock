const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeImage,
  net,
  protocol,
  shell,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const PROVIDERS = require('../shared/providers.json');
const DEFAULT_PROVIDER_ID = 'nvidia';

const isPackaged = app.isPackaged;
const STUDIO_DIR = path.resolve(__dirname, '..');
const ROOT = isPackaged ? path.join(app.getPath('home'), 'QuoteLock') : path.resolve(STUDIO_DIR, '..');
const DATA_DIR = path.join(ROOT, 'data');
const QUEUE_DIR = path.join(ROOT, 'queue');
const SHOWN_DIR = path.join(ROOT, 'shown');
const LOCK_DIR = path.join(ROOT, 'lockscreen');
const USER_IMAGE_DIR = path.join(ROOT, 'assets', 'user');
const CONFIG_PATH = path.join(ROOT, 'config.json');
const STATE_PATH = path.join(DATA_DIR, 'state.json');
const LOG_PATH = path.join(DATA_DIR, 'log.txt');
const APP_PS1 = path.join(ROOT, 'app.ps1');
const RENDER_SCRIPT = isPackaged
  ? path.join(ROOT, 'shared', 'render.mjs')
  : path.join(STUDIO_DIR, 'shared', 'render.mjs');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let mainWindow = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'ql',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

app.setAppUserModelId('QuoteLock.Studio');

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function ensureDirs() {
  for (const dir of [DATA_DIR, QUEUE_DIR, SHOWN_DIR, LOCK_DIR, USER_IMAGE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function prepareEngine() {
  if (!isPackaged) return;
  ensureDirs();
  const engineDir = path.join(process.resourcesPath, 'engine');
  const copies = [
    ['app.ps1', path.join(ROOT, 'app.ps1')],
    ['run-hidden.vbs', path.join(ROOT, 'run-hidden.vbs')],
    [path.join('shared', 'render.mjs'), path.join(ROOT, 'shared', 'render.mjs')],
    [path.join('shared', 'card.mjs'), path.join(ROOT, 'shared', 'card.mjs')],
    [path.join('shared', 'providers.json'), path.join(ROOT, 'shared', 'providers.json')],
  ];
  for (const [from, to] of copies) {
    const src = path.join(engineDir, from);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    // Only refresh when the bundled engine is newer than what is on disk, so a
    // running build never clobbers local edits made after packaging.
    const destStat = fs.existsSync(to) ? fs.statSync(to) : null;
    const srcStat = fs.statSync(src);
    if (destStat && destStat.mtimeMs >= srcStat.mtimeMs) continue;
    fs.copyFileSync(src, to);
  }
}

function readJson(file, fallback) {
  try {
    const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 4)}\n`, 'utf8');
  try {
    fs.rmSync(file, { force: true });
  } catch {
    /* ignore */
  }
  fs.renameSync(tmp, file);
}

function safeInside(base, candidate) {
  const rel = path.relative(base, candidate);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function publicConfig(cfg) {
  const copy = { ...(cfg || {}) };
  delete copy.apiKey;
  delete copy.providers;
  const providers = {};
  for (const preset of PROVIDERS) {
    const record = cfg?.providers?.[preset.id] || {};
    providers[preset.id] = {
      baseUrl: record.baseUrl || preset.baseUrl,
      hasKey: Boolean(record.key),
      model: record.model || '',
      models: Array.isArray(record.models) ? record.models : [],
      modelsAt: record.modelsAt || '',
    };
  }
  for (const [id, record] of Object.entries(cfg?.providers || {})) {
    if (providers[id]) continue;
    providers[id] = {
      baseUrl: record.baseUrl || '',
      hasKey: Boolean(record.key),
      model: record.model || '',
      models: Array.isArray(record.models) ? record.models : [],
      modelsAt: record.modelsAt || '',
    };
  }
  const activeProvider = cfg?.activeProvider || DEFAULT_PROVIDER_ID;
  return {
    ...copy,
    activeProvider,
    providers,
    hasApiKey: Boolean(cfg?.providers?.[activeProvider]?.key),
  };
}

function providerPreset(id) {
  return PROVIDERS.find((preset) => preset.id === id) || null;
}

function migrateConfig(input) {
  const cfg = input && typeof input === 'object' ? input : {};
  const providers = cfg.providers && typeof cfg.providers === 'object' ? cfg.providers : {};
  if (cfg.apiKey && !providers.nvidia?.key) {
    providers.nvidia = {
      ...(providers.nvidia || {}),
      key: String(cfg.apiKey),
      model: providers.nvidia?.model || cfg.model || '',
    };
  }
  if (!cfg.activeProvider) {
    const withKey = Object.keys(providers).find((id) => providers[id]?.key);
    cfg.activeProvider = withKey || DEFAULT_PROVIDER_ID;
  }
  cfg.providers = providers;
  return cfg;
}

function readConfig() {
  return migrateConfig(readJson(CONFIG_PATH, {}));
}

function activityEnabled(cfg = readConfig()) {
  return cfg.enabled !== false;
}

function writeConfig(cfg) {
  writeJson(CONFIG_PATH, cfg);
  return publicConfig(cfg);
}

function normalizeBaseUrl(value) {
  const trimmed = String(value || '')
    .trim()
    .replace(/\/+$/, '');
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return trimmed;
  const match = trimmed.match(/^https?:\/\/[^/]+(\/.*)?$/i);
  if (match && !match[1]) return `${trimmed}/v1`;
  return trimmed;
}

function providerRecord(cfg, id) {
  const preset = providerPreset(id);
  if (!preset) throw new Error(`Unknown provider: ${id}`);
  const record = cfg.providers?.[id] || {};
  return {
    preset,
    record,
    baseUrl: normalizeBaseUrl(record.baseUrl || preset.baseUrl),
    key: String(record.key || ''),
  };
}

function providerHeaders(preset, key) {
  const headers = { Accept: 'application/json' };
  if (preset.auth === 'bearer' && key) headers.Authorization = `Bearer ${key}`;
  if (preset.auth === 'x-api-key' && key) {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
  }
  return headers;
}

function parseModelList(payload) {
  const out = [];
  const push = (value) => {
    const id = String(value || '').trim();
    if (id && !out.includes(id)) out.push(id);
  };
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      if (typeof entry === 'string') push(entry);
      else push(entry?.id || entry?.name || entry?.model);
    }
  } else if (Array.isArray(payload?.data)) {
    for (const entry of payload.data) push(entry?.id || entry?.name || entry?.model);
  } else if (Array.isArray(payload?.models)) {
    for (const entry of payload.models) push(entry?.name || entry?.id || entry?.model);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

async function fetchProviderModels(id) {
  const cfg = readConfig();
  const { preset, record, baseUrl, key } = providerRecord(cfg, id);
  if (!baseUrl) throw new Error('Add a base URL for this provider first.');
  if (preset.auth !== 'none' && !key) throw new Error('Save an API key for this provider first.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await net.fetch(`${baseUrl}/models`, {
      headers: providerHeaders(preset, key),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      const detail = text.replace(/\s+/g, ' ').trim().slice(0, 220);
      throw new Error(`${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`);
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error('The provider did not return JSON.');
    }
    const models = parseModelList(payload);
    if (!models.length) throw new Error('No models returned by this provider.');
    cfg.providers[id] = {
      ...record,
      models,
      modelsAt: new Date().toISOString(),
      model: record.model && models.includes(record.model) ? record.model : record.model || models[0],
    };
    writeConfig(cfg);
    return { models, fetchedAt: cfg.providers[id].modelsAt, error: '' };
  } finally {
    clearTimeout(timer);
  }
}

function resolveNode() {
  const candidates = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
    'node',
  ];
  return candidates.find((c) => c === 'node' || fs.existsSync(c)) || 'node';
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || ROOT,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => {
      stdout += d.toString();
      if (stdout.length > 200000) stdout = stdout.slice(-200000);
    });
    child.stderr?.on('data', (d) => {
      stderr += d.toString();
      if (stderr.length > 200000) stderr = stderr.slice(-200000);
    });
    child.on('error', (err) => resolve({ code: -1, stdout, stderr: String(err.message || err) }));
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

function runPowerShell(args, options = {}) {
  return run(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', APP_PS1, ...args],
    options,
  );
}

function listCards(kind) {
  const dir = kind === 'queue' ? QUEUE_DIR : SHOWN_DIR;
  if (!fs.existsSync(dir)) return [];
  const entries = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.toLowerCase().endsWith('.json')) continue;
    const meta = readJson(path.join(dir, name), null);
    if (!meta) continue;
    const base = name.slice(0, -5);
    const png = path.join(dir, `${base}.png`);
    const date = meta.date || base;
    entries.push({
      kind,
      date,
      quote: meta.quote || '',
      author: meta.author || '',
      category: meta.category || '',
      model: meta.model || '',
      created: meta.created || '',
      url: fs.existsSync(png) ? fileUrl(png) : '',
    });
  }
  return entries.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function fileUrl(file) {
  return `ql://local/${encodeURIComponent(file.replace(/\\/g, '/'))}`;
}

function listUserImages() {
  if (!fs.existsSync(USER_IMAGE_DIR)) return [];
  const out = [];
  for (const name of fs.readdirSync(USER_IMAGE_DIR)) {
    if (!/\.(png|jpe?g|webp|bmp)$/i.test(name)) continue;
    const file = path.join(USER_IMAGE_DIR, name);
    const stat = fs.statSync(file);
    const img = nativeImage.createFromPath(file);
    const size = img.isEmpty() ? { width: 0, height: 0 } : img.getSize();
    out.push({
      name,
      path: file,
      url: fileUrl(file),
      size: stat.size,
      mtime: stat.mtimeMs,
      width: size.width,
      height: size.height,
    });
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

function tailLog(limit = 250) {
  try {
    const text = fs.readFileSync(LOG_PATH, 'utf8');
    return text.split(/\r?\n/).filter(Boolean).slice(-limit);
  } catch {
    return [];
  }
}

function localDateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function collectOutput(result) {
  return [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

async function renderCard(payload) {
  ensureDirs();
  if (!payload?.item || !payload?.date) throw new Error('Missing card data.');
  const stamp = Date.now();
  const out = path.join(DATA_DIR, `studio-render-${stamp}.png`);
  const dataPath = path.join(DATA_DIR, `studio-payload-${stamp}.json`);
  const full = {
    width: 1920,
    height: 1080,
    htmlPath: path.join(DATA_DIR, 'current.html'),
    profileDir: path.join(DATA_DIR, 'edge-studio'),
    ...payload,
  };
  fs.writeFileSync(dataPath, JSON.stringify(full, null, 2), 'utf8');
  try {
    const result = await run(
      resolveNode(),
      [RENDER_SCRIPT, '--data', dataPath, '--out', out],
      { cwd: isPackaged ? ROOT : STUDIO_DIR },
    );
    if (result.code !== 0 || !fs.existsSync(out)) {
      throw new Error(collectOutput(result) || 'Renderer did not produce an image.');
    }
    const metaPath = out.replace(/\.png$/i, '.json');
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          date: payload.date,
          quote: payload.item.quote || '',
          author: payload.item.author || '',
          category: payload.item.category || '',
          model: 'studio',
          created: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );
    return out;
  } finally {
    try {
      fs.rmSync(dataPath, { force: true });
    } catch {
      /* ignore */
    }
  }
}

function removeRenderArtifacts(out) {
  for (const file of [out, out.replace(/\.png$/i, '.json')]) {
    try {
      fs.rmSync(file, { force: true });
    } catch {
      /* ignore */
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0b0c0f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  const emitWindowState = () => {
    send('win:state', {
      maximized: mainWindow.isMaximized(),
      fullscreen: mainWindow.isFullScreen(),
    });
  };

  mainWindow.on('maximize', emitWindowState);
  mainWindow.on('unmaximize', emitWindowState);
  mainWindow.on('enter-full-screen', emitWindowState);
  mainWindow.on('leave-full-screen', emitWindowState);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    emitWindowState();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(STUDIO_DIR, 'dist', 'index.html'));
  }
}

function registerIpc() {
  ipcMain.handle('app:info', () => ({
    root: ROOT,
    studio: STUDIO_DIR,
    data: DATA_DIR,
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    dev: isDev,
  }));

  ipcMain.handle('win:minimize', () => mainWindow?.minimize());
  ipcMain.handle('win:toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.handle('win:close', () => mainWindow?.close());
  ipcMain.handle('win:state', () => ({
    maximized: Boolean(mainWindow?.isMaximized()),
    fullscreen: Boolean(mainWindow?.isFullScreen()),
  }));

  ipcMain.handle('config:read', () => publicConfig(readConfig()));

  ipcMain.handle('config:save', (_event, partial) => {
    const current = readConfig();
    const next = { ...current };
    const allowed = [
      'enabled',
      'activeProvider',
      'model',
      'mode',
      'categories',
      'daysAhead',
      'theme',
      'width',
      'height',
      'font',
      'edge',
      'description',
      'skillPath',
      'webResearch',
      'think',
      'appearance',
    ];
    for (const key of allowed) {
      if (partial && Object.prototype.hasOwnProperty.call(partial, key)) {
        next[key] = partial[key];
      }
    }
    next.mode = 'quotes';
    next.width = 1920;
    next.height = 1080;
    if (typeof next.daysAhead === 'number') {
      next.daysAhead = Math.max(0, Math.min(14, Math.round(next.daysAhead)));
    }
    if (Array.isArray(next.categories)) {
      next.categories = next.categories.map(String).filter(Boolean).slice(0, 16);
    }
    if (next.appearance) {
      if (next.appearance.fontFamily) next.font = next.appearance.fontFamily;
      if (next.appearance.theme === 'light' || next.appearance.theme === 'dark') {
        next.theme = next.appearance.theme;
      }
    }
    const active = next.activeProvider || DEFAULT_PROVIDER_ID;
    next.activeProvider = active;
    next.providers = next.providers || {};
    next.providers[active] = { ...(next.providers[active] || {}), model: String(next.model || '') };
    writeJson(CONFIG_PATH, next);
    return publicConfig(next);
  });

  ipcMain.handle('config:set-api-key', (_event, key) => {
    const current = readConfig();
    const id = current.activeProvider || DEFAULT_PROVIDER_ID;
    current.providers[id] = { ...(current.providers[id] || {}), key: String(key || '').trim() };
    writeJson(CONFIG_PATH, current);
    return { hasApiKey: Boolean(current.providers[id].key) };
  });

  ipcMain.handle('providers:list', () => publicConfig(readConfig()));

  ipcMain.handle('providers:set-key', (_event, id, key) => {
    const current = readConfig();
    providerRecord(current, id);
    current.providers[id] = { ...(current.providers[id] || {}), key: String(key || '').trim() };
    return writeConfig(current);
  });

  ipcMain.handle('providers:set-active', (_event, id) => {
    const current = readConfig();
    providerRecord(current, id);
    current.activeProvider = id;
    return writeConfig(current);
  });

  ipcMain.handle('providers:set-model', (_event, id, model) => {
    const current = readConfig();
    providerRecord(current, id);
    current.providers[id] = { ...(current.providers[id] || {}), model: String(model || '').trim() };
    if (current.activeProvider === id) current.model = String(model || '').trim();
    return writeConfig(current);
  });

  ipcMain.handle('providers:set-base-url', (_event, id, url) => {
    const current = readConfig();
    const { preset } = providerRecord(current, id);
    if (!preset.custom) throw new Error('Only the custom provider takes a base URL.');
    const baseUrl = normalizeBaseUrl(url);
    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) throw new Error('Base URL must start with http:// or https://');
    current.providers[id] = { ...(current.providers[id] || {}), baseUrl };
    return writeConfig(current);
  });

  ipcMain.handle('providers:clear', (_event, id) => {
    const current = readConfig();
    providerRecord(current, id);
    current.providers[id] = {
      ...(current.providers[id] || {}),
      key: '',
      models: [],
      modelsAt: '',
    };
    return writeConfig(current);
  });

  ipcMain.handle('providers:models', async (_event, id) => {
    try {
      const result = await fetchProviderModels(id);
      return { ...result, config: publicConfig(readConfig()) };
    } catch (error) {
      const cfg = readConfig();
      return {
        models: [],
        fetchedAt: cfg.providers?.[id]?.modelsAt || '',
        error: error instanceof Error ? error.message : String(error),
        config: publicConfig(cfg),
      };
    }
  });

  ipcMain.handle('state:read', () => {
    const state = readJson(STATE_PATH, { lastShown: '', seen: [] });
    return {
      state,
      queue: listCards('queue'),
      shown: listCards('shown'),
      today: localDateKey(),
    };
  });

  ipcMain.handle('library:list', () => listUserImages());

  ipcMain.handle('library:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Add images',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }],
    });
    if (result.canceled) return { added: 0, images: listUserImages() };
    let added = 0;
    for (const source of result.filePaths) {
      const ext = path.extname(source).toLowerCase();
      const base = path
        .basename(source, ext)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'image';
      let name = `${base}${ext}`;
      let i = 2;
      while (fs.existsSync(path.join(USER_IMAGE_DIR, name))) {
        name = `${base}-${i}${ext}`;
        i += 1;
      }
      fs.copyFileSync(source, path.join(USER_IMAGE_DIR, name));
      added += 1;
    }
    return { added, images: listUserImages() };
  });

  ipcMain.handle('library:remove', (_event, name) => {
    const file = path.join(USER_IMAGE_DIR, path.basename(String(name)));
    if (!safeInside(USER_IMAGE_DIR, file)) return { ok: false, images: listUserImages() };
    try {
      fs.rmSync(file, { force: true });
    } catch {
      /* ignore */
    }
    return { ok: true, images: listUserImages() };
  });

  ipcMain.handle('library:data-url', (_event, name) => {
    const file = path.join(USER_IMAGE_DIR, path.basename(String(name)));
    if (!safeInside(USER_IMAGE_DIR, file) || !fs.existsSync(file)) return '';
    const img = nativeImage.createFromPath(file);
    if (img.isEmpty()) return '';
    return img.toDataURL();
  });

  ipcMain.handle('log:tail', (_event, limit) => tailLog(Number(limit) || 250));

  ipcMain.handle('engine:set-activity', async (_event, enabled) => {
    const on = Boolean(enabled);
    const result = await runPowerShell([on ? '-On' : '-Off']);
    if (result.code !== 0) {
      throw new Error(collectOutput(result) || 'Could not change activity.');
    }
    return { enabled: on, config: publicConfig(readConfig()) };
  });

  ipcMain.handle('engine:generate', async (_event, action) => {
    if (!activityEnabled()) {
      throw new Error('QuoteLock is turned off. Turn it on in Settings to generate again.');
    }
    const flag = action === 'regenerate' ? '-Regenerate' : '-Generate';
    send('engine:status', { running: true, action });
    const before = tailLog(100000).length;
    const result = await runPowerShell([flag]);
    const log = tailLog(100000).slice(before);
    send('engine:status', {
      running: false,
      action,
      code: result.code,
      output: collectOutput(result),
    });
    return { code: result.code, output: collectOutput(result), log };
  });

  ipcMain.handle('engine:setup', async () => {
    send('engine:status', { running: true, action: 'setup' });
    const result = await runPowerShell(['-Setup']);
    if (result.code === 0 && !activityEnabled()) {
      await runPowerShell(['-Off']);
    }
    send('engine:status', {
      running: false,
      action: 'setup',
      code: result.code,
      output: collectOutput(result),
    });
    return { code: result.code, output: collectOutput(result) };
  });

  ipcMain.handle('engine:task-info', async () => {
    const script = [
      "$t = Get-ScheduledTask -TaskName 'QuoteLock-Update' -ErrorAction SilentlyContinue;",
      "if (-not $t) { '{\"exists\":false}' } else {",
      '  $i = $t | Get-ScheduledTaskInfo;',
      '  [pscustomobject]@{ exists=$true; state=[string]$t.State; last=$i.LastRunTime.ToString(\'o\');',
      '    next=$i.NextRunTime.ToString(\'o\'); lastResult=$i.LastTaskResult } | ConvertTo-Json -Compress',
      '}',
    ].join(' ');
    const result = await run('powershell.exe', ['-NoProfile', '-Command', script]);
    try {
      return JSON.parse(result.stdout.trim());
    } catch {
      return { exists: false, error: collectOutput(result) };
    }
  });

  ipcMain.handle('card:export', async (_event, payload) => {
    const out = await renderCard(payload);
    try {
      const date = payload?.date || localDateKey();
      const save = await dialog.showSaveDialog(mainWindow, {
        title: 'Export quote card',
        defaultPath: path.join(
          app.getPath('pictures'),
          `QuoteLock-${String(date).replace(/[^0-9-]/g, '')}.png`,
        ),
        filters: [{ name: 'PNG image', extensions: ['png'] }],
      });
      if (save.canceled || !save.filePath) return { saved: false };
      fs.copyFileSync(out, save.filePath);
      return { saved: true, path: save.filePath };
    } finally {
      removeRenderArtifacts(out);
    }
  });

  ipcMain.handle('card:publish', async (_event, payload) => {
    if (!activityEnabled()) {
      throw new Error('QuoteLock is turned off. Turn it on in Settings to publish again.');
    }
    const out = await renderCard(payload);
    const result = await runPowerShell(['-Publish', out]);
    if (result.code !== 0) {
      removeRenderArtifacts(out);
      throw new Error(collectOutput(result) || 'Publishing failed.');
    }
    return { ok: true, output: collectOutput(result) };
  });

  ipcMain.handle('dialog:pick-skill-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose a skill file',
      properties: ['openFile'],
      filters: [{ name: 'Text', extensions: ['md', 'txt', 'markdown'] }],
      defaultPath: ROOT,
    });
    return result.canceled ? '' : result.filePaths[0] || '';
  });

  ipcMain.handle('folder:open', (_event, kind) => {
    const map = {
      root: ROOT,
      data: DATA_DIR,
      queue: QUEUE_DIR,
      shown: SHOWN_DIR,
      lockscreen: LOCK_DIR,
      images: USER_IMAGE_DIR,
    };
    const target = map[kind] || ROOT;
    ensureDirs();
    return shell.openPath(target);
  });
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(() => {
  prepareEngine();
  protocol.handle('ql', (request) => {
    try {
      const url = new URL(request.url);
      let filePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (/^[a-zA-Z]:/.test(filePath)) filePath = filePath.replace(/\//g, path.sep);
      const abs = path.resolve(filePath);
      if (!abs.toLowerCase().startsWith(ROOT.toLowerCase())) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(abs).toString());
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
