import raw from '../../shared/providers.json?raw';

export type ProviderAuth = 'bearer' | 'x-api-key' | 'none';

export interface ProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
  auth: ProviderAuth;
  hint: string;
  custom?: boolean;
  local?: boolean;
}

/** Shared with the Electron main process and the engine (shared/providers.json). */
export const PROVIDERS = JSON.parse(raw) as ProviderPreset[];

export const DEFAULT_PROVIDER_ID = 'nvidia';

export function presetById(id: string | undefined): ProviderPreset {
  return PROVIDERS.find((provider) => provider.id === id) || PROVIDERS[0];
}

export function providerLabel(id: string | undefined): string {
  return presetById(id).label;
}

/** Trims a base URL, drops trailing slashes and adds /v1 when a custom URL has no path. */
export function normalizeBaseUrl(value: string): string {
  const trimmed = String(value || '')
    .trim()
    .replace(/\/+$/, '');
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return trimmed;
  const match = trimmed.match(/^https?:\/\/[^/]+(\/.*)?$/i);
  if (match && !match[1]) return `${trimmed}/v1`;
  return trimmed;
}
