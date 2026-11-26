import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Sparkles,
  TerminalSquare,
  Zap,
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
  SliderField,
  Spinner,
  Stat,
  SwitchField,
} from '@/components/ui';
import type { AppConfig, EngineStatus, TaskInfo } from '@/lib/types';
import { providerLabel } from '@/lib/providers';
import { cn, formatDateTime, relativeTime } from '@/lib/utils';

export function SchedulePage({
  config,
  task,
  engine,
  onPatchConfig,
  onRefreshTask,
  onGenerate,
  onRegenerate,
  onSetup,
}: {
  config: AppConfig;
  task: TaskInfo | null;
  engine: EngineStatus;
  onPatchConfig: (partial: Partial<AppConfig>) => void;
  onRefreshTask: () => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onSetup: () => void;
}) {
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmSetup, setConfirmSetup] = useState(false);

  const toggleCategory = (category: string) => {
    const current = new Set(config.categories);
    if (current.has(category)) {
      if (current.size === 1) return;
      current.delete(category);
    } else {
      current.add(category);
    }
    onPatchConfig({ categories: Array.from(current) });
  };

  const healthy = task?.exists && task.lastResult === 0;
  const off = config.enabled === false;
  const active = config.providers?.[config.activeProvider];
  const modelLabel = active?.model || config.model || 'No model selected';

  return (
    <div className="mx-auto max-w-[980px] space-y-6">
      <PageHeader
        eyebrow="Schedule"
        title="Set it, then forget it."
        description="QuoteLock keeps the queue topped up and refreshes your lock screen when you sign in, unlock the PC, and every 30 minutes."
        actions={
          <>
            <Button variant="secondary" onClick={onRefreshTask}>
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={onGenerate}
              disabled={engine.running || off}
              title={off ? 'Turn QuoteLock on in Settings' : undefined}
            >
              {engine.running ? <Spinner /> : <Sparkles size={15} />}
              {off ? 'Paused' : 'Generate now'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[13.5px] font-semibold text-foreground">Windows task</h2>
                <Badge
                  tone={task === null ? 'accent' : !task.exists ? 'danger' : healthy ? 'success' : 'accent'}
                >
                  {task === null ? 'Checking…' : !task.exists ? 'Missing' : task.state || 'Ready'}
                </Badge>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                Runs hidden through <span className="font-mono text-[10.5px]">run-hidden.vbs</span>,
                so no console window flashes.
              </p>
            </div>
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl',
                healthy ? 'bg-success/10 text-success' : 'bg-accent-soft text-accent',
              )}
            >
              <TerminalSquare size={16} />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Stat
              label="Last run"
              value={task === null ? 'Checking…' : task.last ? formatDateTime(task.last) : '—'}
              hint={
                task === null
                  ? 'Reading Windows scheduler'
                  : task.last
                    ? relativeTime(task.last)
                    : 'Not recorded'
              }
              icon={<Clock3 size={14} />}
            />
            <Stat
              label="Next run"
              value={task === null ? 'Checking…' : task.next ? formatDateTime(task.next) : '—'}
              hint={
                task === null
                  ? 'Reading Windows scheduler'
                  : task.next
                    ? relativeTime(task.next)
                    : 'Refresh to load'
              }
              icon={<CalendarClock size={14} />}
            />
          </div>

          <div className="divider my-4" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11.5px] text-muted">
              <CheckCircle2 size={14} className={healthy ? 'text-success' : 'text-faint'} />
              {task === null
                ? 'Reading Windows scheduler…'
                : task.exists
                  ? `Exit code ${task.lastResult ?? '—'} · logon, unlock, daily 00:01, every 30 min`
                  : 'Install the task to enable automatic updates.'}
            </div>
            <Button size="sm" variant="outline" onClick={() => setConfirmSetup(true)}>
              Reinstall
            </Button>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Today" hint="One-off actions" />
          <div className="space-y-3">
            <Button
              className="w-full justify-start"
              variant="secondary"
              onClick={onGenerate}
              disabled={engine.running}
            >
              {engine.running ? <Spinner /> : <Sparkles size={14} />}
              Fill missing days
            </Button>
            <Button
              className="w-full justify-start"
              variant="secondary"
              onClick={() => setConfirmRegenerate(true)}
              disabled={engine.running}
            >
              <RefreshCw size={14} />
              Replace today's card
            </Button>
            <div className="rounded-xl border border-line bg-[var(--panel-soft)] p-3 text-[11px] leading-relaxed text-muted">
              Replacing today's card asks the model for a brand-new quote in today's category and
              publishes it immediately.
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionHeader
          title="Queue preferences"
          hint="Changes save automatically"
          action={
            <Badge tone="accent">
              <Zap size={11} />
              {config.daysAhead} days ahead
            </Badge>
          }
        />
        <SliderField
          label="Days to prepare"
          value={config.daysAhead}
          min={0}
          max={7}
          step={1}
          onChange={(value) => onPatchConfig({ daysAhead: value })}
          format={(value) => (value === 0 ? 'Today only' : `${value} day${value === 1 ? '' : 's'}`)}
          hint="Each day gets its own quote and its own rendered card."
        />

        <div className="divider my-5" />

        <div>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-[12.5px] font-medium text-foreground">Categories</div>
              <div className="mt-0.5 text-[11.5px] text-faint">
                Rotated one per day. Keep at least one.
              </div>
            </div>
            <span className="text-[11px] tabular-nums text-faint">
              {config.categories.length} active
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(
              new Set([
                ...config.categories,
                'Motivation',
                'Stoicism',
                'Discipline',
                'Wisdom',
                'Success',
                'Science',
                'Creativity',
              ]),
            ).map((category) => {
              const active = config.categories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors',
                    active
                      ? 'border-accent/40 bg-accent-soft text-accent'
                      : 'border-line text-muted hover:border-muted/40 hover:text-foreground',
                  )}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="divider my-5" />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Model" hint={`${providerLabel(config.activeProvider)} · change in Settings`}>
            <input
              className="input font-mono text-[11.5px]"
              value={modelLabel}
              readOnly
              spellCheck={false}
            />
          </Field>
          <div className="space-y-2">
            <SwitchField
              label="Web research"
              hint="Adds light context before writing the quote."
              checked={config.webResearch}
              onCheckedChange={(value) => onPatchConfig({ webResearch: value })}
            />
            <SwitchField
              label="Extended thinking"
              hint="Better quotes, slightly slower generation."
              checked={config.think}
              onCheckedChange={(value) => onPatchConfig({ think: value })}
            />
          </div>
        </div>
      </Panel>

      <ConfirmDialog
        open={confirmRegenerate}
        onOpenChange={setConfirmRegenerate}
        title="Replace today's card?"
        description="The current card for today will be discarded and a new quote will be generated and published. Future days stay untouched."
        confirmLabel="Replace card"
        onConfirm={onRegenerate}
      />
      <ConfirmDialog
        open={confirmSetup}
        onOpenChange={setConfirmSetup}
        title="Reinstall the scheduled task?"
        description="This recreates the QuoteLock-Update task and the Desktop / Start Menu shortcuts. Your settings and cards are not touched."
        confirmLabel="Reinstall"
        onConfirm={onSetup}
      />
    </div>
  );
}
