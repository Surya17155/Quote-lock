import { Check, ChevronDown, KeyRound, RefreshCw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Label, SectionHeader, Spinner } from '@/components/ui';
import { presetById, PROVIDERS } from '@/lib/providers';
import type { AppConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

function formatStamp(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ProviderSettings({
  config,
  onConfig,
}: {
  config: AppConfig;
  onConfig: (config: AppConfig) => void;
}) {
  const [selected, setSelected] = useState(config.activeProvider || 'nvidia');
  const [keyInput, setKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [busy, setBusy] = useState<'' | 'key' | 'models' | 'active' | 'base'>('');
  const [error, setError] = useState('');

  const preset = presetById(selected);
  const record = config.providers?.[selected];
  const isActive = config.activeProvider === selected;
  const models = useMemo(() => record?.models || [], [record?.models]);

  useEffect(() => {
    setKeyInput('');
    setBaseUrlInput(record?.baseUrl || preset.baseUrl || '');
    setModelQuery(record?.model || '');
    setListOpen(false);
    setError('');
    // Reset the form when the selected provider changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    setModelQuery(record?.model || '');
  }, [record?.model]);

  const filtered = useMemo(() => {
    const query = modelQuery.trim().toLowerCase();
    if (!query) return models;
    return models.filter((model) => model.toLowerCase().includes(query));
  }, [modelQuery, models]);

  const run = async (kind: 'key' | 'models' | 'active' | 'base', task: () => Promise<AppConfig>) => {
    setBusy(kind);
    setError('');
    try {
      onConfig(await task());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy('');
    }
  };

  const saveKey = () =>
    run('key', async () => {
      const next = await window.ql.providers.setKey(selected, keyInput.trim());
      setKeyInput('');
      return next;
    });

  const saveModel = async (model: string) => {
    const clean = model.trim();
    if (!clean) return;
    setModelQuery(clean);
    setListOpen(false);
    setActiveIndex(-1);
    await run('models', () => window.ql.providers.setModel(selected, clean));
  };

  const fetchModels = async () => {
    setBusy('models');
    setError('');
    try {
      const result = await window.ql.providers.models(selected);
      onConfig(result.config);
      if (result.error) setError(result.error);
      else setListOpen(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy('');
    }
  };

  const activate = () => run('active', () => window.ql.providers.setActive(selected));

  const saveBaseUrl = () =>
    run('base', () => window.ql.providers.setBaseUrl(selected, baseUrlInput));

  const clearKey = () =>
    run('key', async () => {
      const next = await window.ql.providers.clear(selected);
      setKeyInput('');
      return next;
    });

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Providers"
        hint="One active provider at a time. Keys stay on this PC."
        action={
          <Badge tone="accent">
            <ShieldCheck size={11} />
            {presetById(config.activeProvider).label}
          </Badge>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const state = config.providers?.[provider.id];
          const active = config.activeProvider === provider.id;
          const chosen = selected === provider.id;
          return (
            <button
              key={provider.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(provider.id)}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200',
                chosen
                  ? 'border-accent/45 bg-accent-soft/60'
                  : 'border-[var(--glass-line)] bg-[var(--glass-bg-soft)] hover:border-muted/40',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold',
                  active ? 'bg-accent text-accent-foreground' : 'bg-elevated text-muted',
                )}
              >
                {provider.label.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-foreground">
                  {provider.label}
                </span>
                <span className="mt-0.5 block truncate text-[10.5px] text-faint">
                  {state?.hasKey
                    ? 'Key saved'
                    : provider.auth === 'none'
                      ? 'No key needed'
                      : 'No key'}
                  {state?.model ? ` · ${state.model}` : ''}
                </span>
              </span>
              {active ? <Check size={13} className="shrink-0 text-accent" /> : null}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--glass-line)] bg-[var(--glass-bg-soft)] p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-semibold text-foreground">{preset.label}</span>
              {isActive ? <Badge tone="accent">Active</Badge> : null}
            </div>
            <p className="mt-1 max-w-[58ch] text-[11.5px] leading-relaxed text-muted">
              {preset.hint}
            </p>
          </div>
          <Button
            variant={isActive ? 'secondary' : 'primary'}
            size="sm"
            disabled={isActive || busy === 'active'}
            onClick={() => void activate()}
          >
            {busy === 'active' ? <Spinner /> : <Check size={13} />}
            {isActive ? 'In use' : 'Use this provider'}
          </Button>
        </div>

        {preset.custom ? (
          <div className="mt-4 space-y-2">
            <Label>Base URL</Label>
            <div className="flex gap-2">
              <input
                className="input font-mono text-[11.5px]"
                value={baseUrlInput}
                onChange={(event) => setBaseUrlInput(event.target.value)}
                placeholder="https://host/v1"
                spellCheck={false}
              />
              <Button
                variant="secondary"
                onClick={() => void saveBaseUrl()}
                disabled={!baseUrlInput.trim() || busy === 'base'}
              >
                {busy === 'base' ? <Spinner /> : null}
                Save
              </Button>
            </div>
            <p className="text-[11px] text-faint">
              If the URL has no path, <span className="font-mono">/v1</span> is added automatically.
            </p>
          </div>
        ) : null}

        {preset.auth !== 'none' ? (
          <div className="mt-4 space-y-2">
            <Label>{record?.hasKey ? 'Replace API key' : 'API key'}</Label>
            <div className="flex gap-2">
              <input
                className="input font-mono text-[11.5px]"
                type="password"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && keyInput.trim()) void saveKey();
                }}
                placeholder={record?.hasKey ? '•••••••••••••••' : 'Paste key'}
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                variant="primary"
                onClick={() => void saveKey()}
                disabled={!keyInput.trim() || busy === 'key'}
              >
                {busy === 'key' ? <Spinner /> : <KeyRound size={14} />}
                Save
              </Button>
              {record?.hasKey ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${preset.label} key`}
                  onClick={() => void clearKey()}
                >
                  <Trash2 size={14} />
                </Button>
              ) : null}
            </div>
            <p className="text-[11px] text-faint">
              The saved key is never shown here or sent to the interface layer.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[11.5px] text-muted">
            Local endpoint. Start Ollama to list models.
          </p>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Model</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchModels()}
              disabled={busy === 'models' || (!record?.hasKey && preset.auth !== 'none')}
            >
              {busy === 'models' ? <Spinner /> : <RefreshCw size={12} />}
              {models.length ? `Refresh (${models.length})` : 'Load models'}
            </Button>
          </div>
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                />
                <input
                  className="input pl-8 pr-9 font-mono text-[11.5px]"
                  value={modelQuery}
                  onChange={(event) => {
                    setModelQuery(event.target.value);
                    setListOpen(true);
                    setActiveIndex(-1);
                  }}
                  onFocus={() => setListOpen(true)}
                  onBlur={() => window.setTimeout(() => setListOpen(false), 120)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setListOpen(true);
                      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setActiveIndex((index) => Math.max(index - 1, 0));
                    } else if (event.key === 'Enter') {
                      event.preventDefault();
                      if (listOpen && activeIndex >= 0 && filtered[activeIndex]) {
                        void saveModel(filtered[activeIndex]);
                      } else if (modelQuery.trim()) {
                        void saveModel(modelQuery);
                      }
                    } else if (event.key === 'Escape') {
                      setListOpen(false);
                    }
                  }}
                  role="combobox"
                  aria-expanded={listOpen}
                  aria-controls="model-listbox"
                  aria-autocomplete="list"
                  placeholder={models.length ? 'Search models' : 'Type a model ID'}
                  spellCheck={false}
                />
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => void saveModel(modelQuery)}
                disabled={!modelQuery.trim() || modelQuery === record?.model}
              >
                Use model
              </Button>
            </div>

            {listOpen ? (
              <div
                id="model-listbox"
                role="listbox"
                className="absolute z-30 mt-2 max-h-[260px] w-full overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 shadow-2xl backdrop-blur-2xl"
              >
                {filtered.length ? (
                  filtered.map((model, index) => (
                    <button
                      key={model}
                      type="button"
                      role="option"
                      aria-selected={model === record?.model}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void saveModel(model)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left font-mono text-[11.5px] transition-colors',
                        index === activeIndex
                          ? 'bg-accent-soft text-foreground'
                          : 'text-muted hover:bg-[var(--panel-soft)] hover:text-foreground',
                      )}
                    >
                      <span className="truncate">{model}</span>
                      {model === record?.model ? <Check size={12} className="text-accent" /> : null}
                    </button>
                  ))
                ) : (
                  <div className="px-2.5 py-2 text-[11.5px] text-faint">
                    {models.length
                      ? 'No model matches. Press Enter to use the typed ID.'
                      : 'No list yet. Press Enter to use the typed ID, or load models.'}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
            {record?.model ? (
              <span>
                Selected: <span className="font-mono text-muted">{record.model}</span>
              </span>
            ) : null}
            {record?.modelsAt ? <span>Listed {formatStamp(record.modelsAt)}</span> : null}
          </div>
          {error ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-2 text-[11.5px] leading-relaxed text-danger">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
