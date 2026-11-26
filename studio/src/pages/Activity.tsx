import { FolderOpen, RefreshCw, ScrollText, TerminalSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Panel,
  Spinner,
  SwitchField,
} from '@/components/ui';
import type { EngineStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

function splitLine(line: string) {
  const match = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(.*)$/.exec(line);
  return match ? { time: match[1], text: match[2] } : { time: '', text: line };
}

function toneFor(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('error') || lower.includes('fail')) return 'text-danger';
  if (lower.includes('lock screen set') || lower.includes('published') || lower.includes('rendered'))
    return 'text-success';
  if (lower.includes('generating') || lower.includes('opening')) return 'text-accent';
  return 'text-muted';
}

export function ActivityPage({ engine }: { engine: EngineStatus }) {
  const [lines, setLines] = useState<string[]>([]);
  const [auto, setAuto] = useState(true);
  const [loading, setLoading] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const next = await window.ql.log.tail(400);
      setLines(next);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void window.ql.log.tail(400).then(setLines);
  }, []);

  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => {
      void window.ql.log.tail(400).then(setLines);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [auto]);

  useEffect(() => {
    const element = viewport.current;
    if (auto && element) element.scrollTop = element.scrollHeight;
  }, [lines, auto]);

  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      <PageHeader
        eyebrow="Activity"
        title="See what the engine is doing."
        description="A live tail of QuoteLock's log: generation, rendering, publishing, and any errors worth knowing about."
        actions={
          <>
            <Button variant="secondary" onClick={() => void window.ql.openFolder('data')}>
              <FolderOpen size={14} />
              Open data folder
            </Button>
            <Button variant="primary" onClick={() => void load()} disabled={loading}>
              {loading ? <Spinner /> : <RefreshCw size={14} />}
              Refresh
            </Button>
          </>
        }
      />

      {engine.running ? (
        <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3">
          <Spinner className="text-accent" />
          <div className="text-[12.5px] font-medium text-foreground">
            {engine.action === 'setup' ? 'Reinstalling the scheduled task…' : 'Generating cards…'}
          </div>
          <span className="ml-auto text-[11.5px] text-muted">
            This can take a minute or two.
          </span>
        </div>
      ) : null}

      <Panel className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <TerminalSquare size={14} className="text-muted" />
            <span className="text-[12px] font-medium text-foreground">data / log.txt</span>
            <Badge>{lines.length} lines</Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[150px]">
              <SwitchField
                label="Live tail"
                checked={auto}
                onCheckedChange={setAuto}
              />
            </div>
          </div>
        </div>

        <div ref={viewport} className="max-h-[58vh] min-h-[320px] overflow-y-auto py-2">
          {lines.length ? (
            lines.map((line, index) => {
              const parsed = splitLine(line);
              return (
                <div key={`${index}-${line.slice(0, 24)}`} className="log-line">
                  <span className="text-faint">{parsed.time || '—'}</span>
                  <span className={cn('break-words', toneFor(parsed.text))}>{parsed.text}</span>
                </div>
              );
            })
          ) : (
            <div className="p-4">
              <EmptyState
                icon={<ScrollText size={18} />}
                title="No log entries yet"
                description="Generate a card and the engine's activity will appear here."
              />
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
