import {
  ArrowRight,
  CalendarDays,
  Clock3,
  History,
  Layers,
  Paintbrush,
  Sparkles,
} from 'lucide-react';
import { CardPreview } from '@/components/CardPreview';
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Panel,
  SectionHeader,
  Spinner,
  Stat,
} from '@/components/ui';
import type {
  Appearance,
  AppConfig,
  CardItem,
  CardMeta,
  EngineStatus,
  PageId,
  TaskInfo,
} from '@/lib/types';
import { formatLongDate, formatShortDate, relativeTime } from '@/lib/utils';
import { providerLabel } from '@/lib/providers';

export function HomePage({
  config,
  appearance,
  item,
  date,
  queue,
  shown,
  task,
  engine,
  hasCard,
  onGenerate,
  onNavigate,
}: {
  config: AppConfig;
  appearance: Appearance;
  item: CardItem;
  date: string;
  queue: CardMeta[];
  shown: CardMeta[];
  task: TaskInfo | null;
  engine: EngineStatus;
  hasCard: boolean;
  onGenerate: () => void;
  onNavigate: (page: PageId) => void;
}) {
  const upcoming = queue.filter((card) => card.date !== date).slice(0, 3);
  const recent = shown.slice(0, 4);
  const lastPublished = shown[0]?.date;
  const off = config.enabled === false;
  const active = config.providers?.[config.activeProvider];
  const modelLabel = active?.model || config.model || 'No model selected';

  return (
    <div className="mx-auto max-w-[1180px] space-y-9">
      <PageHeader
        eyebrow={formatLongDate(date)}
        title="A quiet moment, on lock."
        description="Your quote of the day, designed the way you want it. Generate a fresh card, tune the look in Studio, and it appears the next time your screen wakes."
        actions={
          <>
            <Button variant="secondary" onClick={() => onNavigate('studio')}>
              <Paintbrush size={15} />
              Open Studio
            </Button>
            <Button
              variant="primary"
              onClick={onGenerate}
              disabled={engine.running || off}
              title={off ? 'Turn QuoteLock on in Settings' : undefined}
            >
              {engine.running ? <Spinner /> : <Sparkles size={15} />}
              {engine.running ? 'Generating' : off ? 'Paused' : 'Generate now'}
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(318px,1fr)]">
        <div className="space-y-4">
          <CardPreview item={item} date={date} appearance={appearance} />
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <Badge tone="accent">{item.category || 'Quote'}</Badge>
              <span className="truncate text-[12.5px] text-muted">{item.author || 'Unknown'}</span>
              {!hasCard ? <Badge>Sample card</Badge> : null}
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('library')}>
              Browse library
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-[13.5px] font-semibold text-foreground">Today at a glance</h2>
              <Badge tone={off ? 'danger' : engine.running ? 'accent' : 'success'}>
                <span
                  className={
                    off
                      ? 'h-1.5 w-1.5 rounded-full bg-danger'
                      : engine.running
                        ? 'h-1.5 w-1.5 animate-pulse rounded-full bg-accent'
                        : 'h-1.5 w-1.5 rounded-full bg-success'
                  }
                />
                {off ? 'Off' : engine.running ? 'Working' : 'Up to date'}
              </Badge>
            </div>
            <div className="mt-1 truncate text-[11px] text-faint">
              {providerLabel(config.activeProvider)} · <span className="font-mono">{modelLabel}</span>
            </div>
            <div className="mt-5 space-y-4">
              <Stat
                label="Next update"
                value={
                  task === null
                    ? 'Reading schedule…'
                    : task.next
                      ? relativeTime(task.next)
                      : 'Every 30 minutes'
                }
                hint={
                  task === null
                    ? 'Checking Windows scheduler'
                    : task.exists
                      ? 'Windows scheduled task'
                      : 'Scheduled task not installed'
                }
                icon={<Clock3 size={15} />}
              />
              <Stat
                label="In the queue"
                value={`${queue.length} ${queue.length === 1 ? 'card' : 'cards'}`}
                hint={config.daysAhead ? `${config.daysAhead} days ahead` : 'Today only'}
                icon={<Layers size={15} />}
              />
              <Stat
                label="Last published"
                value={lastPublished ? formatShortDate(lastPublished) : 'Not yet'}
                hint={lastPublished ? 'Shown on your lock screen' : 'Generate to publish'}
                icon={<History size={15} />}
              />
            </div>
            <div className="divider my-4" />
            <div className="flex flex-wrap gap-1.5">
              {config.categories.slice(0, 7).map((category) => (
                <span key={category} className="chip">
                  {category}
                </span>
              ))}
            </div>
          </Panel>

          <Panel className="border-accent/20 bg-[color-mix(in_srgb,var(--accent)_7%,var(--panel))]">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Sparkles size={15} />
              </div>
              <div>
                <div className="text-[12.5px] font-medium text-foreground">Make it yours</div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                  Pick a preset, add your own photo, and choose every colour. The preview updates as
                  you design.
                </p>
                <Button
                  size="sm"
                  variant="subtle"
                  className="mt-3"
                  onClick={() => onNavigate('studio')}
                >
                  Design a card
                  <ArrowRight size={13} />
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <section>
        <SectionHeader
          title="Coming up"
          hint="Cards waiting for their day"
          action={
            <Button size="sm" variant="ghost" onClick={() => onNavigate('library')}>
              View all
              <ArrowRight size={13} />
            </Button>
          }
        />
        {upcoming.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((card) => (
              <button
                key={card.date}
                type="button"
                onClick={() => onNavigate('library')}
                className="group overflow-hidden rounded-2xl border border-line bg-[var(--panel)] text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-xl"
              >
                <div className="relative aspect-video overflow-hidden bg-[var(--panel-strong)]">
                  {card.url ? (
                    <img
                      src={card.url}
                      alt={`${card.category} card for ${card.date}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="absolute left-2.5 top-2.5 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/80 backdrop-blur-md">
                    {formatShortDate(card.date)}
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="text-[12px] font-medium text-foreground">
                    {card.category || 'Quote'}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[11.5px] text-muted">
                    {card.author}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays size={18} />}
            title="The queue is empty"
            description="Generate now and QuoteLock will prepare today and the next few days."
            action={
              <Button size="sm" variant="primary" onClick={onGenerate} disabled={engine.running}>
                {engine.running ? <Spinner /> : <Sparkles size={14} />}
                Generate cards
              </Button>
            }
          />
        )}
      </section>

      {recent.length ? (
        <section>
          <SectionHeader title="Recently shown" hint="A small archive of past lock screens" />
          <div className="surface divide-y divide-[var(--line)] overflow-hidden">
            {recent.map((card) => (
              <div key={`${card.date}-${card.kind}`} className="flex items-center gap-4 p-3">
                <div className="h-11 w-[78px] shrink-0 overflow-hidden rounded-lg bg-[var(--panel-strong)]">
                  {card.url ? (
                    <img
                      src={card.url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-foreground">
                    {card.author || 'Unknown'}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[11.5px] text-muted">{card.quote}</div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <div className="text-[11.5px] text-muted">{formatShortDate(card.date)}</div>
                  <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.12em] text-faint">
                    {card.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
