import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar, TitleBar } from '@/components/Shell';
import { ToastProvider, TooltipHost, useToast } from '@/components/ui';
import { buildExportPayload, SAMPLE_ITEM } from '@/lib/card';
import { isMuted, playClick, setMuted } from '@/lib/feedback';
import { DEFAULT_APPEARANCE, mergeAppearance } from '@/lib/presets';
import type {
  AppConfig,
  AppInfo,
  CardItem,
  CardMeta,
  EngineStatus,
  PageId,
  StateSnapshot,
  TaskInfo,
  UserImage,
} from '@/lib/types';
import { todayIso } from '@/lib/utils';
import { useTheme } from '@/lib/useTheme';
import { ActivityPage } from '@/pages/Activity';
import { HomePage } from '@/pages/Home';
import { LibraryPage } from '@/pages/Library';
import { SchedulePage } from '@/pages/Schedule';
import { SettingsPage } from '@/pages/Settings';
import { StudioPage } from '@/pages/Studio';

function StudioApp() {
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const { mode: themeMode, setMode: setThemeMode, resolved, toggle } = useTheme();

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [snapshot, setSnapshot] = useState<StateSnapshot | null>(null);
  const [images, setImages] = useState<UserImage[]>([]);
  const [task, setTask] = useState<TaskInfo | null>(null);
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [page, setPage] = useState<PageId>('home');
  const [engine, setEngine] = useState<EngineStatus>({ running: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(() => isMuted());

  const saveTimer = useRef<number | null>(null);
  const savedTimer = useRef<number | null>(null);
  const pending = useRef<Partial<AppConfig>>({});
  const configRef = useRef<AppConfig | null>(null);
  configRef.current = config;

  const loadTask = () => {
    void window.ql.engine
      .taskInfo()
      .then(setTask)
      .catch(() => setTask({ exists: false }));
  };

  const refresh = async () => {
    const [nextSnapshot, nextImages] = await Promise.all([
      window.ql.state(),
      window.ql.library.list(),
    ]);
    setSnapshot(nextSnapshot);
    setImages(nextImages);
    loadTask();
  };

  const applyProviders = (next: AppConfig) => {
    setConfig((current) => (current ? { ...current, ...next } : next));
  };

  const changeMuted = (next: boolean) => {
    setMutedState(next);
    setMuted(next);
    if (!next) playClick('tick');
  };

  const setActivity = async (enabled: boolean) => {
    try {
      const result = await window.ql.engine.setActivity(enabled);
      setConfig((current) => (current ? { ...current, ...result.config } : result.config));
      loadTask();
      toast.push({
        title: enabled ? 'QuoteLock is on' : 'QuoteLock is off',
        description: enabled
          ? 'Scheduled updates and publishing are live again.'
          : 'Windows is back on its default lock screen and the scheduled task is paused.',
        tone: enabled ? 'success' : 'default',
      });
    } catch (error) {
      toast.push({
        title: 'Could not change activity',
        description: error instanceof Error ? error.message : String(error),
        tone: 'error',
      });
      throw error;
    }
  };

  const load = async () => {
    setLoadError(null);
    try {
      const [cfg, snap, imgs, inf] = await Promise.all([
        window.ql.config.read(),
        window.ql.state(),
        window.ql.library.list(),
        window.ql.info(),
      ]);
      setConfig(cfg);
      setSnapshot(snap);
      setImages(imgs);
      setInfo(inf);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setReady(true);
      loadTask();
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const control = target.closest(
        'button, a, [role="button"], [role="switch"], [role="radio"], [role="option"]',
      );
      if (!control) return;
      if (control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true') {
        return;
      }
      playClick(control.classList.contains('btn-glass-primary') ? 'thunk' : 'tick');
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    const unsubscribe = window.ql.engine.onStatus((status) => {
      setEngine(status);
      if (!status.running) void refresh();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, []);

  const patchConfig = (partial: Partial<AppConfig>) => {
    setConfig((current) => (current ? { ...current, ...partial } : current));
    pending.current = { ...pending.current, ...partial };
    setSaved(false);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const payload = pending.current;
      pending.current = {};
      if (!Object.keys(payload).length) return;
      setSaving(true);
      try {
        const next = await window.ql.config.save(payload);
        setConfig((current) => (current ? { ...current, hasApiKey: next.hasApiKey } : next));
        setSaved(true);
        if (savedTimer.current) window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setSaved(false), 2200);
      } catch (error) {
        toast.push({
          title: 'Could not save settings',
          description: error instanceof Error ? error.message : String(error),
          tone: 'error',
        });
      } finally {
        setSaving(false);
      }
    }, 550);
  };

  const appearance = useMemo(() => mergeAppearance(config?.appearance), [config?.appearance]);
  const today = snapshot?.today || todayIso();
  const todayCard: CardMeta | undefined =
    snapshot?.shown.find((card) => card.date === today) ||
    snapshot?.queue.find((card) => card.date === today);
  const item: CardItem =
    todayCard && todayCard.quote
      ? { quote: todayCard.quote, author: todayCard.author, category: todayCard.category }
      : SAMPLE_ITEM;
  const hasCard = Boolean(todayCard?.url);

  const generate = async (action: 'generate' | 'regenerate' = 'generate') => {
    if (engine.running) return;
    if (configRef.current?.enabled === false) {
      toast.push({
        title: 'QuoteLock is off',
        description: 'Turn activity on in Settings before generating.',
        tone: 'error',
      });
      return;
    }
    setEngine({ running: true, action });
    try {
      const result = await window.ql.engine.generate(action);
      if (result.code !== 0) {
        toast.push({
          title: 'Generation failed',
          description: result.output || 'Check the Activity page for details.',
          tone: 'error',
        });
      } else if ((result.log ?? []).some((line) => /\brendered\b/i.test(line))) {
        toast.push({
          title: action === 'regenerate' ? "Today's card replaced" : 'Fresh cards ready',
          description:
            action === 'regenerate'
              ? 'The new quote is on your lock screen now.'
              : 'The queue is topped up and the newest card is live.',
          tone: 'success',
        });
      } else {
        toast.push({
          title: action === 'regenerate' ? 'Nothing to replace yet' : 'Everything is up to date',
          description:
            action === 'regenerate'
              ? 'No card was rebuilt. Check Activity for details.'
              : 'Your queue is full, so no new cards were needed.',
        });
      }
    } catch (error) {
      toast.push({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : String(error),
        tone: 'error',
      });
    } finally {
      setEngine({ running: false });
      await refresh();
    }
  };

  const exportCard = async () => {
    try {
      const result = await window.ql.card.export(buildExportPayload(item, today, appearance));
      if (result.saved) {
        toast.push({ title: 'PNG exported', description: result.path, tone: 'success' });
      }
    } catch (error) {
      toast.push({
        title: 'Export failed',
        description: error instanceof Error ? error.message : String(error),
        tone: 'error',
      });
    }
  };

  const publishCard = async () => {
    if (configRef.current?.enabled === false) {
      toast.push({
        title: 'QuoteLock is off',
        description: 'Turn activity on in Settings before publishing.',
        tone: 'error',
      });
      return;
    }
    try {
      await window.ql.card.publish(buildExportPayload(item, today, appearance));
      toast.push({
        title: 'Lock screen updated',
        description: 'Your current design is now live.',
        tone: 'success',
      });
      await refresh();
    } catch (error) {
      toast.push({
        title: 'Could not publish',
        description: error instanceof Error ? error.message : String(error),
        tone: 'error',
      });
    }
  };

  const importImages = async () => {
    try {
      const result = await window.ql.library.import();
      setImages(result.images);
      if (result.added) {
        toast.push({
          title: `${result.added} image${result.added === 1 ? '' : 's'} added`,
          description: 'Choose one in Studio → Backdrop.',
          tone: 'success',
        });
      }
    } catch (error) {
      toast.push({
        title: 'Could not add images',
        description: error instanceof Error ? error.message : String(error),
        tone: 'error',
      });
    }
  };

  const removeImage = async (image: UserImage) => {
    try {
      const result = await window.ql.library.remove(image.name);
      setImages(result.images);
      if (appearance.background.image === image.path) {
        patchConfig({
          appearance: {
            ...appearance,
            preset: 'custom',
            background: { ...appearance.background, kind: 'solid', image: '' },
          },
        });
      }
      toast.push({ title: 'Image removed', tone: 'success' });
    } catch (error) {
      toast.push({
        title: 'Could not remove image',
        description: error instanceof Error ? error.message : String(error),
        tone: 'error',
      });
    }
  };

  const useImage = (image: UserImage) => {
    patchConfig({
      appearance: {
        ...appearance,
        preset: 'custom',
        background: { ...appearance.background, kind: 'image', image: image.path },
      },
    });
    setPage('studio');
    toast.push({
      title: 'Backdrop applied',
      description: 'Tune blur and dim under Backdrop in Studio.',
      tone: 'success',
    });
  };

  const setupTask = async () => {
    try {
      const result = await window.ql.engine.setup();
      if (result.code === 0) {
        toast.push({
          title: 'Scheduled task installed',
          description: 'Hidden updates are active again.',
          tone: 'success',
        });
      } else {
        toast.push({
          title: 'Setup failed',
          description: result.output || 'Check permissions and try again.',
          tone: 'error',
        });
      }
    } catch (error) {
      toast.push({
        title: 'Setup failed',
        description: error instanceof Error ? error.message : String(error),
        tone: 'error',
      });
    } finally {
      setTask(await window.ql.engine.taskInfo());
    }
  };

  const resetAppearance = () => {
    patchConfig({ appearance: structuredClone(DEFAULT_APPEARANCE) });
    toast.push({ title: 'Design reset', description: 'Back to Nocturne.', tone: 'success' });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!event.ctrlKey || event.altKey || event.metaKey) return;
      const map: Record<string, PageId> = {
        '1': 'home',
        '2': 'studio',
        '3': 'library',
        '4': 'schedule',
        '5': 'activity',
        '6': 'settings',
      };
      if (map[event.key]) {
        event.preventDefault();
        playClick('tick');
        setPage(map[event.key]);
        return;
      }
      if (event.key.toLowerCase() === 'g') {
        event.preventDefault();
        void generate('generate');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.running, item, appearance, today]);

  if (!ready) {
    return (
      <div className="atmosphere flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-serif text-[26px] leading-none text-accent-foreground">
            &#8220;
          </div>
          <div className="text-[12px] text-muted">Opening QuoteLock Studio…</div>
        </div>
      </div>
    );
  }

  if (loadError || !config) {
    return (
      <div className="atmosphere flex h-full items-center justify-center p-8">
        <div className="surface max-w-[440px] p-6 text-center">
          <div className="text-[15px] font-semibold text-foreground">Studio could not start</div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">{loadError || 'No configuration found.'}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-xl bg-accent px-4 py-2 text-[12.5px] font-medium text-accent-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="atmosphere flex h-full flex-col">
      <TitleBar
        page={page}
        theme={resolved}
        onToggleTheme={toggle}
        saving={saving}
        saved={saved}
        engine={engine}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          page={page}
          onNavigate={setPage}
          task={task}
          engine={engine}
          version={info?.version || '0.1.0'}
        />
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-7 lg:px-9 lg:py-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full pb-10"
            >
              {page === 'home' ? (
                <HomePage
                  config={config}
                  appearance={appearance}
                  item={item}
                  date={today}
                  queue={snapshot?.queue || []}
                  shown={snapshot?.shown || []}
                  task={task}
                  engine={engine}
                  hasCard={hasCard}
                  onGenerate={() => void generate('generate')}
                  onNavigate={setPage}
                />
              ) : null}
              {page === 'studio' ? (
                <StudioPage
                  appearance={appearance}
                  item={item}
                  date={today}
                  images={images}
                  onChange={(next) => patchConfig({ appearance: next })}
                  onReset={resetAppearance}
                  onImportImages={() => void importImages()}
                  onExport={() => void exportCard()}
                  onPublish={() => void publishCard()}
                />
              ) : null}
              {page === 'library' ? (
                <LibraryPage
                  queue={snapshot?.queue || []}
                  shown={snapshot?.shown || []}
                  images={images}
                  onImport={() => void importImages()}
                  onRemoveImage={(image) => void removeImage(image)}
                  onUseImage={useImage}
                  onOpenImages={() => void window.ql.openFolder('images')}
                />
              ) : null}
              {page === 'schedule' ? (
                <SchedulePage
                  config={config}
                  task={task}
                  engine={engine}
                  onPatchConfig={patchConfig}
                  onRefreshTask={() =>
                    void window.ql.engine.taskInfo().then(setTask)
                  }
                  onGenerate={() => void generate('generate')}
                  onRegenerate={() => void generate('regenerate')}
                  onSetup={() => void setupTask()}
                />
              ) : null}
              {page === 'activity' ? <ActivityPage engine={engine} /> : null}
              {page === 'settings' ? (
                <SettingsPage
                  config={config}
                  info={info}
                  themeMode={themeMode}
                  muted={muted}
                  onMutedChange={changeMuted}
                  onThemeMode={setThemeMode}
                  onPatchConfig={patchConfig}
                  onProvidersConfig={applyProviders}
                  onActivity={setActivity}
                  onSetup={() => void setupTask()}
                  onResetAppearance={resetAppearance}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <TooltipHost>
        <StudioApp />
      </TooltipHost>
    </ToastProvider>
  );
}
