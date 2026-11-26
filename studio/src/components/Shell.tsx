import {
  CalendarClock,
  Check,
  Images,
  LayoutDashboard,
  Minus,
  Moon,
  Paintbrush,
  ScrollText,
  Settings2,
  Square,
  Sun,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, relativeTime } from '@/lib/utils';
import type { EngineStatus, PageId, TaskInfo } from '@/lib/types';
import { Spinner } from './ui';

export const NAV_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'studio', label: 'Studio', icon: Paintbrush },
  { id: 'library', label: 'Library', icon: Images },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'activity', label: 'Activity', icon: ScrollText },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

const PAGE_LABELS: Record<PageId, string> = {
  home: 'Home',
  studio: 'Studio',
  library: 'Library',
  schedule: 'Schedule',
  activity: 'Activity',
  settings: 'Settings',
};

export function TitleBar({
  page,
  theme,
  onToggleTheme,
  saving,
  saved,
  engine,
}: {
  page: PageId;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  saving: boolean;
  saved: boolean;
  engine: EngineStatus;
}) {
  return (
    <header className="titlebar relative z-20 flex h-[46px] shrink-0 items-center justify-between border-b border-line bg-[color-mix(in_srgb,var(--panel)_55%,transparent)] pl-4 pr-0 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-accent font-serif text-[17px] font-bold leading-none text-accent-foreground shadow-sm">
          &#8220;
        </div>
        <div className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-foreground">
          QuoteLock
        </div>
        <div className="h-3.5 w-px bg-[var(--line-strong)]" />
        <div className="truncate text-[12px] text-muted">{PAGE_LABELS[page]}</div>
      </div>

      <div className="no-drag flex h-full items-center gap-1">
        {engine.running ? (
          <span className="chip mr-1 border-accent/25 bg-accent-soft text-accent">
            <Spinner />
            {engine.action === 'setup' ? 'Setting up' : 'Generating'}
          </span>
        ) : saving ? (
          <span className="chip mr-1">
            <Spinner />
            Saving
          </span>
        ) : saved ? (
          <span className="chip mr-1 text-success">
            <Check size={12} />
            Saved
          </span>
        ) : null}

        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-foreground"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div className="mx-1 h-5 w-px bg-[var(--line-strong)]" />

        <button
          type="button"
          onClick={() => window.ql.win.minimize()}
          className="flex h-[46px] w-[46px] items-center justify-center text-muted transition-colors hover:bg-elevated hover:text-foreground"
          aria-label="Minimize"
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={() => window.ql.win.toggleMaximize()}
          className="flex h-[46px] w-[46px] items-center justify-center text-muted transition-colors hover:bg-elevated hover:text-foreground"
          aria-label="Maximize"
        >
          <Square size={12} />
        </button>
        <button
          type="button"
          onClick={() => window.ql.win.close()}
          className="flex h-[46px] w-[46px] items-center justify-center text-muted transition-colors hover:bg-[#c42b1c] hover:text-white"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
}

export function Sidebar({
  page,
  onNavigate,
  task,
  engine,
  version,
}: {
  page: PageId;
  onNavigate: (page: PageId) => void;
  task: TaskInfo | null;
  engine: EngineStatus;
  version: string;
}) {
  return (
    <aside className="flex w-[228px] shrink-0 flex-col border-r border-line bg-[color-mix(in_srgb,var(--panel)_42%,transparent)] px-4 pb-4 pt-5 backdrop-blur-xl">
      <div className="mb-5 px-1">
        <div className="font-display text-[17px] font-semibold tracking-[-0.03em] text-foreground">
          QuoteLock
        </div>
        <div className="mt-0.5 text-[11px] uppercase tracking-[0.22em] text-faint">Studio</div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn('nav-item text-left')}
              data-active={active}
            >
              {active ? (
                <motion.span
                  layoutId="nav-glow"
                  className="absolute inset-0 rounded-xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ) : null}
              <Icon size={17} className="relative z-10" strokeWidth={1.7} />
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-5">
        <div className="rounded-xl border border-line bg-[var(--panel-soft)] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
              Engine
            </span>
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                engine.running ? 'animate-pulse bg-accent' : 'bg-success',
              )}
            />
          </div>
          <div className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            {engine.running
              ? 'Working on your cards…'
              : task === null
                ? 'Checking schedule…'
                : task.next
                  ? `Next update ${relativeTime(task.next)}`
                  : 'Automatic updates ready'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-faint">
            <span className="h-1 w-1 rounded-full bg-faint" />
            {task === null
              ? 'Checking schedule…'
              : task.exists
                ? 'Scheduled task active'
                : 'Task not installed'}
          </div>
        </div>
        <div className="flex items-center justify-between px-1 text-[10.5px] text-faint">
          <span>v{version || '0.1.0'}</span>
          <span>Windows</span>
        </div>
      </div>
    </aside>
  );
}
