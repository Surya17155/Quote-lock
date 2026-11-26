import type { Appearance, Background, Palette } from './types';

const darkPalette: Palette = {
  bg: '#0f1115',
  fg: '#f6f2e9',
  muted: '#a9a396',
  accent: '#c8a656',
};

const lightPalette: Palette = {
  bg: '#f4f1ea',
  fg: '#1b1c1f',
  muted: '#6b655b',
  accent: '#8a6a1f',
};

export const THEME_PALETTES: Record<'dark' | 'light', Palette> = {
  dark: darkPalette,
  light: lightPalette,
};

const baseBackground: Background = {
  kind: 'solid',
  color: darkPalette.bg,
  from: darkPalette.bg,
  to: '#1a2030',
  angle: 135,
  image: '',
  blur: 0,
  dim: 0.35,
  position: 'center',
};

export const DEFAULT_APPEARANCE: Appearance = {
  theme: 'dark',
  preset: 'nocturne',
  palette: darkPalette,
  background: baseBackground,
  layout: 'center',
  frame: 'none',
  texture: 'none',
  showQuoteMarks: true,
  showRule: true,
  showFooter: true,
  fontFamily: 'Segoe Script',
  fontScale: 1,
  lineHeight: 1.42,
};

export type AppearancePatch = Omit<Partial<Appearance>, 'palette' | 'background'> & {
  palette?: Partial<Palette>;
  background?: Partial<Background>;
};

export function mergeAppearance(partial?: AppearancePatch | null): Appearance {
  if (!partial) return structuredClone(DEFAULT_APPEARANCE);
  return {
    ...DEFAULT_APPEARANCE,
    ...partial,
    palette: { ...DEFAULT_APPEARANCE.palette, ...(partial.palette || {}) },
    background: { ...DEFAULT_APPEARANCE.background, ...(partial.background || {}) },
  };
}

interface Preset {
  id: string;
  name: string;
  description: string;
  swatch: string;
  appearance: Appearance;
}

function makePreset(
  id: string,
  name: string,
  description: string,
  swatch: string,
  overrides: AppearancePatch & { palette: Palette },
): Preset {
  return {
    id,
    name,
    description,
    swatch,
    appearance: mergeAppearance({ ...overrides, preset: id }),
  };
}

export const PRESETS: Preset[] = [
  makePreset('nocturne', 'Nocturne', 'Charcoal and candlelight', 'linear-gradient(135deg,#0f1115,#24242b)', {
    theme: 'dark',
    palette: darkPalette,
    background: { kind: 'solid', color: '#0f1115' },
    layout: 'center',
    fontFamily: 'Segoe Script',
  }),
  makePreset('paper', 'Paper', 'Warm ink on cream', 'linear-gradient(135deg,#f6f2e9,#e6dcc8)', {
    theme: 'light',
    palette: lightPalette,
    background: { kind: 'solid', color: '#f4f1ea' },
    layout: 'center',
    frame: 'hairline',
    fontFamily: 'Georgia',
  }),
  makePreset('noir', 'Noir', 'Editorial black and bone', 'linear-gradient(135deg,#0a0a0a,#2a2a28)', {
    theme: 'dark',
    palette: { bg: '#0a0a0a', fg: '#f5f3ec', muted: '#9a978d', accent: '#e7ddc8' },
    background: { kind: 'solid', color: '#0a0a0a' },
    layout: 'editorial',
    frame: 'hairline',
    fontFamily: 'Georgia',
  }),
  makePreset('aurora', 'Aurora', 'Deep sea green with a glow', 'linear-gradient(140deg,#06110f,#0e3436 55%,#2a6b5c)', {
    theme: 'dark',
    palette: { bg: '#06110f', fg: '#eaf7f1', muted: '#9dc0b4', accent: '#79d6b4' },
    background: { kind: 'gradient', from: '#06110f', to: '#0d2f33', angle: 145 },
    layout: 'left',
    texture: 'grain',
    fontFamily: 'Georgia',
  }),
  makePreset('ember', 'Ember', 'Burnt sienna and dusk', 'linear-gradient(140deg,#180d0a,#3a1c12 60%,#8a4526)', {
    theme: 'dark',
    palette: { bg: '#140c09', fg: '#f8ece1', muted: '#c2a794', accent: '#e08a4c' },
    background: { kind: 'gradient', from: '#180d0a', to: '#2b1712', angle: 160 },
    layout: 'center',
    texture: 'vignette',
    fontFamily: 'Palatino Linotype',
  }),
  makePreset('sage', 'Sage', 'Quiet garden light', 'linear-gradient(135deg,#eef3ea,#cfdccd)', {
    theme: 'light',
    palette: { bg: '#e9efe6', fg: '#1b2a22', muted: '#5c7265', accent: '#4f7a5f' },
    background: { kind: 'solid', color: '#e9efe6' },
    layout: 'left',
    frame: 'hairline',
    fontFamily: 'Palatino Linotype',
  }),
  makePreset('slate', 'Slate', 'Cool graphite and steel', 'linear-gradient(135deg,#0e1319,#26313f)', {
    theme: 'dark',
    palette: { bg: '#0e1319', fg: '#eef3f8', muted: '#9aa9b8', accent: '#8fb4d9' },
    background: { kind: 'gradient', from: '#0e1319', to: '#1b2431', angle: 130 },
    layout: 'center',
    frame: 'inset',
    fontFamily: 'Candara',
  }),
  makePreset('mono', 'Mono', 'Nothing but the words', 'linear-gradient(135deg,#ffffff,#e7e7e2)', {
    theme: 'light',
    palette: { bg: '#ffffff', fg: '#101010', muted: '#7a7a72', accent: '#101010' },
    background: { kind: 'solid', color: '#ffffff' },
    layout: 'minimal',
    frame: 'none',
    showQuoteMarks: false,
    showRule: false,
    showFooter: false,
    fontFamily: 'Segoe UI',
  }),
];

export function presetById(id: string) {
  return PRESETS.find((preset) => preset.id === id) || PRESETS[0];
}

export const FONT_OPTIONS = [
  'Segoe Script',
  'Segoe UI',
  'Georgia',
  'Palatino Linotype',
  'Book Antiqua',
  'Constantia',
  'Cambria',
  'Candara',
  'Corbel',
  'Garamond',
  'Times New Roman',
  'Franklin Gothic Medium',
  'Sitka Banner',
  'Bahnschrift',
  'Trebuchet MS',
  'Verdana',
  'Consolas',
];

export const POSITION_OPTIONS = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'top left',
  'top right',
  'bottom left',
  'bottom right',
];

