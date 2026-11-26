import {
  Cpu,
  FileText,
  FolderOpen,
  Info,
  Palette,
  Power,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDialog,
  Field,
  PageHeader,
  Panel,
  SectionHeader,
  Segmented,
  Spinner,
  SwitchField,
} from '@/components/ui';
import { ProviderSettings } from '@/components/ProviderSettings';
import { providerLabel } from '@/lib/providers';
import type { AppConfig, AppInfo, ThemeMode } from '@/lib/types';
import { cn } from '@/lib/utils';

export function SettingsPage({
  config,
  info,
  themeMode,
  muted,
  onMutedChange,
  onThemeMode,
  onPatchConfig,
  onProvidersConfig,
  onActivity,
  onSetup,
  onResetAppearance,
}: {
  config: AppConfig;
  info: AppInfo | null;
  themeMode: ThemeMode;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  onThemeMode: (mode: ThemeMode) => void;
  onPatchConfig: (partial: Partial<AppConfig>) => void;
  onProvidersConfig: (config: AppConfig) => void;
  onActivity: (enabled: boolean) => Promise<void>;
  onSetup: () => void;
  onResetAppearance: () => void;
}) {
  const [confirmSetup, setConfirmSetup] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [activityBusy, setActivityBusy] = useState(false);
  const enabled = config.enabled !== false;
  const presetLabel = providerLabel(config.activeProvider);

  const folders = [
    { key: 'root' as const, label: 'QuoteLock folder', path: info?.root },
    { key: 'images' as const, label: 'Your images', path: `${info?.root}\\assets\\user` },
    { key: 'queue' as const, label: 'Queue', path: `${info?.root}\\queue` },
    { key: 'shown' as const, label: 'Published', path: `${info?.root}\\shown` },
    { key: 'lockscreen' as const, label: 'Lock screen copies', path: `${info?.root}\\lockscreen` },
  ];

  return (
    <div className="mx-auto max-w-[980px] space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="The quiet controls."
        description="Connection, content guidance, appearance, and the scheduled task. Nothing here is uploaded anywhere except the quote request itself."
      />

      <Panel className={cn('transition-opacity', !enabled && 'opacity-95')}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors',
                enabled
                  ? 'border-success/35 bg-success/12 text-success'
                  : 'border-line bg-[var(--glass-bg-soft)] text-faint',
              )}
            >
              <Power size={17} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-foreground">
                  QuoteLock activity
                </span>
                <Badge tone={enabled ? 'success' : 'danger'}>{enabled ? 'On' : 'Off'}</Badge>
              </div>
              <p className="mt-0.5 max-w-[62ch] text-[11.5px] leading-relaxed text-muted">
                {enabled
                  ? 'Generation, web research, scheduled updates, and publishing are live.'
                  : 'Everything is paused. Your Windows lock screen is back to its default image and QuoteLock-Update is disabled.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Turn QuoteLock activity on or off"
            disabled={activityBusy}
            onClick={async () => {
              setActivityBusy(true);
              try {
                await onActivity(!enabled);
              } finally {
                setActivityBusy(false);
              }
            }}
            className={cn(
              'glass-switch relative h-[34px] w-[62px] shrink-0 rounded-full border transition-all duration-300 disabled:opacity-60',
              enabled
                ? 'border-success/50 bg-success/85 shadow-[0_10px_26px_-14px_var(--success)]'
                : 'border-line bg-[var(--line-strong)]',
            )}
          >
            <span
              className={cn(
                'absolute top-1/2 flex h-[26px] w-[26px] -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] shadow-md transition-all duration-300',
                enabled ? 'left-[32px]' : 'left-[4px]',
              )}
            >
              {activityBusy ? (
                <Spinner className="text-muted" />
              ) : (
                <Power size={12} className={enabled ? 'text-success' : 'text-faint'} />
              )}
            </span>
          </button>
        </div>
      </Panel>

      <Panel>
        <ProviderSettings config={config} onConfig={onProvidersConfig} />
      </Panel>

      <Panel>
        <SectionHeader title="Content" hint="Optional guidance for the model" />
        <div className="space-y-4">
          <Field
            label="Description"
            hint="What kind of quotes do you want? Tone, themes, authors to favour or avoid."
          >
            <textarea
              className="input"
              value={config.description}
              onChange={(event) => onPatchConfig({ description: event.target.value })}
              placeholder="Short, grounded quotes about craft, patience and doing the work. Avoid hustle clichés."
            />
          </Field>
          <Field
            label="Skill file"
            hint="Optional path to a Markdown file with extra writing instructions."
          >
            <div className="flex gap-2">
              <input
                className="input font-mono text-[12px]"
                value={config.skillPath}
                onChange={(event) => onPatchConfig({ skillPath: event.target.value })}
                placeholder={info ? `${info.root}\\skill.md` : 'skill.md'}
                spellCheck={false}
              />
              <Button
                variant="secondary"
                onClick={async () => {
                  const picked = await window.ql.pickSkillFile();
                  if (picked) onPatchConfig({ skillPath: picked });
                }}
              >
                <FileText size={14} />
                Browse
              </Button>
            </div>
          </Field>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionHeader title="App theme" hint="Applies to this window only" />
          <Segmented
            value={themeMode}
            onChange={(value) => onThemeMode(value)}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-[var(--panel-soft)] p-3">
            <Palette size={15} className="mt-0.5 shrink-0 text-accent" />
            <p className="text-[11.5px] leading-relaxed text-muted">
              The quote card has its own independent theme and palette in Studio.
            </p>
          </div>
          <div className="divider my-4" />
          <SwitchField
            label="Interface sounds"
            hint="Soft clicks when you switch pages or press a control."
            checked={!muted}
            onCheckedChange={(value) => onMutedChange(!value)}
          />
          <div className="mt-1 flex items-center gap-2 text-[11px] text-faint">
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            {muted ? 'Muted. Saved for next launch.' : 'Click sounds are on.'}
          </div>
          <div className="divider my-4" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12.5px] font-medium text-foreground">Reset card design</div>
              <div className="mt-0.5 text-[11.5px] text-faint">Back to Nocturne defaults.</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setConfirmReset(true)}>
              Reset
            </Button>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Engine" hint="Scheduled updates" />
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--panel-soft)] text-muted">
                  <Cpu size={14} />
                </div>
                <div>
                  <div className="text-[12px] font-medium text-foreground">Scheduled task</div>
                  <div className="text-[11px] text-faint">QuoteLock-Update</div>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setConfirmSetup(true)}>
                <RefreshCw size={13} />
                Reinstall
              </Button>
            </div>
            <Field label="Microsoft Edge path" hint="Leave empty to detect automatically.">
              <input
                className="input font-mono text-[11.5px]"
                value={config.edge}
                onChange={(event) => onPatchConfig({ edge: event.target.value })}
                placeholder="auto"
                spellCheck={false}
              />
            </Field>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionHeader title="Folders" hint="Everything stays on this PC" />
        <div className="grid gap-2 sm:grid-cols-2">
          {folders.map((folder) => (
            <button
              key={folder.key}
              type="button"
              onClick={() => void window.ql.openFolder(folder.key)}
              className="flex items-center gap-3 rounded-xl border border-line bg-[var(--panel-soft)] p-3 text-left transition-colors hover:border-muted/40"
            >
              <FolderOpen size={14} className="shrink-0 text-muted" />
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-foreground">{folder.label}</div>
                <div className="mt-0.5 truncate font-mono text-[10.5px] text-faint">
                  {folder.path || '—'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionHeader title="About" hint="QuoteLock Studio" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 text-[11.5px] text-muted">
            <Row label="Version" value={info?.version || '0.1.0'} />
            <Row label="Electron" value={info?.electron || '—'} />
            <Row label="Chromium" value={info?.chrome || '—'} />
            <Row label="Node" value={info?.node || '—'} />
          </div>
          <div className="space-y-2 text-[11.5px] text-muted">
            <Row label="Mode" value={config.mode || 'quotes'} />
            <Row label="Canvas" value={`${config.width} × ${config.height}`} />
            <Row label="Categories" value={`${config.categories.length} active`} />
            <Row label="Queue" value={`${config.daysAhead} days ahead`} />
          </div>
        </div>
        <div className="divider my-4" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11.5px] text-muted">
            <Sparkles size={13} className="text-accent" />
            Quotes are generated by your own {presetLabel} key.
          </div>
          <div className="flex items-center gap-2 text-[11px] text-faint">
            <Info size={12} />
            Shortcuts: Ctrl+1…6 pages, Ctrl+G generate
          </div>
        </div>
      </Panel>

      <ConfirmDialog
        open={confirmSetup}
        onOpenChange={setConfirmSetup}
        title="Reinstall the scheduled task?"
        description="This recreates QuoteLock-Update and the shortcuts. Your cards, images and settings stay untouched."
        confirmLabel="Reinstall"
        onConfirm={onSetup}
      />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset the card design?"
        description="Your quote card returns to the default Nocturne look. Existing rendered cards and the queue are unaffected."
        confirmLabel="Reset design"
        tone="danger"
        onConfirm={onResetAppearance}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3')}>
      <span className="text-faint">{label}</span>
      <span className="truncate font-mono text-[11px] text-foreground">{value}</span>
    </div>
  );
}
