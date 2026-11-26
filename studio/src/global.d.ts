import type {
  AppConfig,
  AppInfo,
  CardMeta,
  EngineStatus,
  RenderPayload,
  StateSnapshot,
  TaskInfo,
  UserImage,
} from './lib/types';

export interface WindowState {
  maximized: boolean;
  fullscreen: boolean;
}

export interface QlApi {
  info: () => Promise<AppInfo>;
  win: {
    minimize: () => Promise<void>;
    toggleMaximize: () => Promise<void>;
    close: () => Promise<void>;
    state: () => Promise<WindowState>;
    onState: (callback: (state: WindowState) => void) => () => void;
  };
  config: {
    read: () => Promise<AppConfig>;
    save: (partial: Partial<AppConfig>) => Promise<AppConfig>;
    setApiKey: (key: string) => Promise<{ hasApiKey: boolean }>;
  };
  providers: {
    list: () => Promise<AppConfig>;
    setKey: (id: string, key: string) => Promise<AppConfig>;
    setActive: (id: string) => Promise<AppConfig>;
    setModel: (id: string, model: string) => Promise<AppConfig>;
    setBaseUrl: (id: string, url: string) => Promise<AppConfig>;
    clear: (id: string) => Promise<AppConfig>;
    models: (id: string) => Promise<{
      models: string[];
      fetchedAt: string;
      error: string;
      config: AppConfig;
    }>;
  };
  state: () => Promise<StateSnapshot>;
  library: {
    list: () => Promise<UserImage[]>;
    import: () => Promise<{ added: number; images: UserImage[] }>;
    remove: (name: string) => Promise<{ ok: boolean; images: UserImage[] }>;
    dataUrl: (name: string) => Promise<string>;
  };
  log: {
    tail: (limit?: number) => Promise<string[]>;
  };
  engine: {
    generate: (
      action: 'generate' | 'regenerate',
    ) => Promise<{ code: number; output: string; log?: string[] }>;
    setup: () => Promise<{ code: number; output: string }>;
    setActivity: (enabled: boolean) => Promise<{ enabled: boolean; config: AppConfig }>;
    taskInfo: () => Promise<TaskInfo>;
    onStatus: (callback: (status: EngineStatus) => void) => () => void;
  };
  card: {
    export: (payload: RenderPayload) => Promise<{ saved: boolean; path?: string }>;
    publish: (payload: RenderPayload) => Promise<{ ok: boolean; output: string }>;
  };
  pickSkillFile: () => Promise<string>;
  openFolder: (kind: 'root' | 'data' | 'queue' | 'shown' | 'lockscreen' | 'images') => Promise<string>;
}

declare global {
  interface Window {
    ql: QlApi;
  }
}

export type { CardMeta };
