export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export type BackgroundKind = 'solid' | 'gradient' | 'image';
export type LayoutKind = 'center' | 'left' | 'editorial' | 'minimal';
export type FrameKind = 'none' | 'hairline' | 'inset';
export type TextureKind = 'none' | 'grain' | 'vignette';

export interface Palette {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
}

export interface Background {
  kind: BackgroundKind;
  color: string;
  from: string;
  to: string;
  angle: number;
  image: string;
  blur: number;
  dim: number;
  position: string;
}

export interface Appearance {
  theme: 'dark' | 'light';
  preset: string;
  palette: Palette;
  background: Background;
  layout: LayoutKind;
  frame: FrameKind;
  texture: TextureKind;
  showQuoteMarks: boolean;
  showRule: boolean;
  showFooter: boolean;
  fontFamily: string;
  fontScale: number;
  lineHeight: number;
}

export interface ProviderConfig {
  baseUrl?: string;
  hasKey: boolean;
  model: string;
  models: string[];
  modelsAt: string;
}

export interface AppConfig {
  hasApiKey?: boolean;
  enabled?: boolean;
  activeProvider: string;
  providers: Record<string, ProviderConfig>;
  model: string;
  mode?: string;
  categories: string[];
  daysAhead: number;
  theme: string;
  width: number;
  height: number;
  font: string;
  edge: string;
  description: string;
  skillPath: string;
  webResearch: boolean;
  think: boolean;
  appearance?: Partial<Appearance>;
}

export interface CardItem {
  quote: string;
  author: string;
  category: string;
}

export interface CardMeta {
  kind: 'queue' | 'shown';
  date: string;
  quote: string;
  author: string;
  category: string;
  model?: string;
  created?: string;
  url: string;
}

export interface UserImage {
  name: string;
  path: string;
  url: string;
  size: number;
  mtime: number;
  width: number;
  height: number;
}

export interface TaskInfo {
  exists: boolean;
  state?: string;
  last?: string;
  next?: string;
  lastResult?: number;
  error?: string;
}

export interface EngineStatus {
  running: boolean;
  action?: string;
  code?: number | null;
  output?: string;
}

export interface AppInfo {
  root: string;
  studio: string;
  data: string;
  version: string;
  electron: string;
  chrome: string;
  node: string;
  platform: string;
  dev: boolean;
}

export interface StateSnapshot {
  state: { lastShown?: string; seen?: string[] };
  queue: CardMeta[];
  shown: CardMeta[];
  today: string;
}

export type PageId = 'home' | 'studio' | 'library' | 'schedule' | 'activity' | 'settings';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone?: 'default' | 'success' | 'error';
}

export interface RenderPayload {
  width?: number;
  height?: number;
  item: CardItem;
  date: string;
  appearance: Appearance;
}
