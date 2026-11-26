import { DEFAULT_APPEARANCE } from './presets';
import type { AppConfig } from './types';

const config: AppConfig = {
  hasApiKey: true,
  enabled: true,
  activeProvider: 'nvidia',
  providers: {
    nvidia: {
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      hasKey: true,
      model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
      models: [
        'nvidia/nemotron-3.5-lightning-30b-a3b',
        'meta/llama-3.3-70b-instruct',
      ],
      modelsAt: new Date().toISOString(),
    },
  },
  model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
  mode: 'quotes',
  categories: ['Motivation', 'Stoicism', 'Discipline', 'Wisdom', 'Success', 'Science', 'Creativity'],
  daysAhead: 2,
  theme: 'dark',
  width: 1920,
  height: 1080,
  font: 'Segoe Script',
  edge: '',
  description: '',
  skillPath: '',
  webResearch: true,
  think: true,
  appearance: DEFAULT_APPEARANCE,
};

const today = new Date().toISOString().slice(0, 10);

export function installMockBridge() {
  if (typeof window === 'undefined' || window.ql) return;

  const bridge = {
    info: async () => ({
      root: 'C:\\Users\\dell\\QuoteLock',
      studio: 'C:\\Users\\dell\\QuoteLock\\studio',
      data: 'C:\\Users\\dell\\QuoteLock\\data',
      version: '0.1.0',
      electron: 'mock',
      chrome: 'mock',
      node: 'mock',
      platform: 'win32',
      dev: true,
    }),
    win: {
      minimize: async () => undefined,
      toggleMaximize: async () => undefined,
      close: async () => undefined,
      state: async () => ({ maximized: false, fullscreen: false }),
      onState: () => () => undefined,
    },
    config: {
      read: async () => ({ ...config }),
      save: async (partial: Partial<AppConfig>) => {
        Object.assign(config, partial);
        return { ...config };
      },
      setApiKey: async () => ({ hasApiKey: true }),
    },
    providers: {
      list: async () => ({ ...config }),
      setKey: async () => ({ ...config }),
      setActive: async () => ({ ...config }),
      setModel: async () => ({ ...config }),
      setBaseUrl: async () => ({ ...config }),
      clear: async () => ({ ...config }),
      models: async () => ({
        models: config.providers.nvidia.models,
        fetchedAt: config.providers.nvidia.modelsAt,
        error: '',
        config: { ...config },
      }),
    },
    state: async () => ({
      state: { lastShown: '', seen: [] },
      queue: [],
      shown: [],
      today,
    }),
    library: {
      list: async () => [],
      import: async () => ({ added: 0, images: [] }),
      remove: async () => ({ ok: true, images: [] }),
      dataUrl: async () => '',
    },
    log: {
      tail: async () => [
        `${today} 00:01:02  generating images for: ${today}`,
        `${today} 00:01:03  rendered queue\\${today}.png :: Motivation :: Mark Twain`,
        `${today} 00:01:04  lock screen set: lockscreen\\quote-${today}-000104.png`,
        `${today} 00:01:04  queue full, nothing to generate`,
      ],
    },
    engine: {
      generate: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return { code: 0, output: 'mock generation complete', log: [] };
      },
      setup: async () => ({ code: 0, output: 'mock setup complete' }),
      setActivity: async (enabled: boolean) => {
        config.enabled = enabled;
        return { enabled, config: { ...config } };
      },
      taskInfo: async () => ({
        exists: true,
        state: 'Ready',
        last: new Date().toISOString(),
        next: new Date(Date.now() + 30 * 60000).toISOString(),
        lastResult: 0,
      }),
      onStatus: () => () => undefined,
    },
    card: {
      export: async () => ({ saved: false }),
      publish: async () => ({ ok: true, output: 'mock publish' }),
    },
    openFolder: async () => '',
  };

  window.ql = bridge as unknown as Window['ql'];
}
