import {
  Check,
  Download,
  Image as ImageIcon,
  ImagePlus,
  LayoutTemplate,
  MonitorUp,
  Palette as PaletteIcon,
  RotateCcw,
  Sparkles,
  Type,
} from 'lucide-react';
import { useState } from 'react';
import { CardPreview } from '@/components/CardPreview';
import {
  Badge,
  Button,
  ColorField,
  Field,
  PageHeader,
  Segmented,
  SliderField,
  SwitchField,
  Tabs,
  TabsContent,
} from '@/components/ui';
import { FONT_OPTIONS, POSITION_OPTIONS, PRESETS, THEME_PALETTES } from '@/lib/presets';
import type { Appearance, CardItem, LayoutKind, UserImage } from '@/lib/types';
import { cn } from '@/lib/utils';

type StudioTab = 'presets' | 'text' | 'color' | 'background' | 'layout';

function luminance(hex: string) {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return 0;
  const channels = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string) {
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + 0.05) / (dark + 0.05);
}

function LayoutSketch({ kind }: { kind: LayoutKind }) {
  return (
    <div className="flex h-[52px] w-full flex-col justify-center gap-1.5 rounded-lg border border-line bg-[var(--panel-strong)] p-2.5">
      {kind === 'editorial' ? (
        <div className="flex items-start gap-1">
          <span className="font-serif text-[18px] leading-none text-accent/70">&#8220;</span>
          <div className="flex-1 space-y-1 pt-1">
            <div className="h-1 w-4/5 rounded bg-[var(--muted)] opacity-60" />
            <div className="h-1 w-3/5 rounded bg-[var(--muted)] opacity-40" />
          </div>
        </div>
      ) : kind === 'minimal' ? (
        <div className="space-y-1.5">
          <div className="h-1 w-2/3 rounded bg-[var(--muted)] opacity-60" />
          <div className="h-1 w-1/4 rounded bg-[var(--muted)] opacity-35" />
        </div>
      ) : (
        <div className={cn('space-y-1.5', kind === 'center' && 'mx-auto w-[78%]')}>
          <div className="h-1 w-full rounded bg-[var(--muted)] opacity-60" />
          <div className="h-1 w-4/5 rounded bg-[var(--muted)] opacity-45" />
          <div className="h-0.5 w-6 rounded bg-accent" />
        </div>
      )}
    </div>
  );
}

export function StudioPage({
  appearance,
  item,
  date,
  images,
  onChange,
  onReset,
  onImportImages,
  onExport,
  onPublish,
}: {
  appearance: Appearance;
  item: CardItem;
  date: string;
  images: UserImage[];
  onChange: (appearance: Appearance) => void;
  onReset: () => void;
  onImportImages: () => void;
  onExport: () => void;
  onPublish: () => void;
}) {
  const [tab, setTab] = useState<StudioTab>('presets');
  const background = appearance.background;

  const update = (patch: Partial<Appearance>) => onChange({ ...appearance, preset: 'custom', ...patch });
  const setPalette = (patch: Partial<Appearance['palette']>) => {
    const palette = { ...appearance.palette, ...patch };
    update({
      palette,
      background: patch.bg
        ? { ...appearance.background, color: palette.bg, from: palette.bg }
        : appearance.background,
    });
  };
  const setBackground = (patch: Partial<Appearance['background']>) =>
    update({ background: { ...appearance.background, ...patch } });

  const setCardTheme = (theme: 'dark' | 'light') => {
    const palette = THEME_PALETTES[theme];
    update({
      theme,
      palette,
      background: {
        ...appearance.background,
        color: palette.bg,
        from: palette.bg,
      },
    });
  };

  const ratio = contrast(appearance.palette.fg, appearance.palette.bg);
  const accentRatio = contrast(appearance.palette.accent, appearance.palette.bg);
  const fontChoices = Array.from(new Set([appearance.fontFamily, ...FONT_OPTIONS]));

  return (
    <div className="mx-auto max-w-[1260px] space-y-6">
      <PageHeader
        eyebrow="Design studio"
        title="Make it feel like yours."
        description="Every change appears in the preview instantly. Your design is saved automatically and used for the next lock screen update."
        actions={
          <>
            <Button variant="ghost" onClick={onReset}>
              <RotateCcw size={14} />
              Reset
            </Button>
            <Button variant="secondary" onClick={onExport}>
              <Download size={15} />
              Export PNG
            </Button>
            <Button variant="primary" onClick={onPublish}>
              <MonitorUp size={15} />
              Set as lock screen
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-3 xl:sticky xl:top-1">
          <CardPreview item={item} date={date} appearance={appearance} />
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-2">
              <Badge tone="accent">{item.category || 'Quote'}</Badge>
              <span className="truncate text-[12px] text-muted">{item.author}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-faint">
              <Check size={12} className="text-success" />
              Autosaved locally
            </div>
          </div>
          <p className="px-1 text-[12px] leading-relaxed text-muted">
            The PNG is rendered at 1920 × 1080 with the same template used by the background worker.
          </p>
        </div>

        <div className="surface p-4">
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as StudioTab)}
            tabs={[
              { value: 'presets', label: 'Presets' },
              { value: 'text', label: 'Text' },
              { value: 'color', label: 'Colour' },
              { value: 'background', label: 'Backdrop' },
              { value: 'layout', label: 'Layout' },
            ]}
          >
            <TabsContent value="presets" className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                {PRESETS.map((preset) => {
                  const active = appearance.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onChange(structuredClone(preset.appearance))}
                      className={cn(
                        'group overflow-hidden rounded-xl border p-1.5 text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5',
                        active
                          ? 'border-accent/70 shadow-[0_0_0_3px_var(--accent-soft)]'
                          : 'border-line hover:border-muted/40',
                      )}
                    >
                      <div
                        className="relative flex h-[62px] items-end rounded-lg p-2"
                        style={{ background: preset.swatch }}
                      >
                        <span
                          className="h-1 w-8 rounded-full"
                          style={{ background: preset.appearance.palette.accent }}
                        />
                        {active ? (
                          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-black">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        ) : null}
                      </div>
                      <div className="px-1 pb-0.5 pt-2">
                        <div className="text-[12px] font-medium text-foreground">{preset.name}</div>
                        <div className="mt-0.5 line-clamp-1 text-[10.5px] text-faint">
                          {preset.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="divider" />
              <div className="flex items-start gap-2.5 rounded-xl border border-line bg-[var(--panel-soft)] p-3">
                <Sparkles size={15} className="mt-0.5 shrink-0 text-accent" />
                <p className="text-[11.5px] leading-relaxed text-muted">
                  Presets are a starting point. Change the type, colours and backdrop, then save the
                  result — QuoteLock keeps it for every future card.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-5">
              <Field label="Quote typeface" hint="Uses fonts installed on this PC.">
                <select
                  className="input"
                  value={appearance.fontFamily}
                  onChange={(event) => update({ fontFamily: event.target.value })}
                >
                  {fontChoices.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </Field>
              <div
                className="truncate rounded-xl border border-dashed border-line px-3 py-2.5 text-[15px] text-foreground"
                style={{ fontFamily: appearance.fontFamily }}
              >
                The quick brown fox jumps over the lazy dog.
              </div>
              <SliderField
                label="Type size"
                value={appearance.fontScale}
                min={0.72}
                max={1.36}
                step={0.01}
                onChange={(value) => update({ fontScale: value })}
                format={(value) => `${Math.round(value * 100)}%`}
                hint="Longer quotes scale down automatically to stay readable."
              />
              <SliderField
                label="Line spacing"
                value={appearance.lineHeight}
                min={1.1}
                max={1.9}
                step={0.01}
                onChange={(value) => update({ lineHeight: value })}
                format={(value) => value.toFixed(2)}
              />
              <div className="divider" />
              <div className="space-y-2">
                <SwitchField
                  label="Decorative quote marks"
                  hint="Curly quotes around the text."
                  checked={appearance.showQuoteMarks}
                  onCheckedChange={(value) => update({ showQuoteMarks: value })}
                />
                <SwitchField
                  label="Accent rule"
                  hint="A short line under the author."
                  checked={appearance.showRule}
                  onCheckedChange={(value) => update({ showRule: value })}
                />
                <SwitchField
                  label="Category and date footer"
                  checked={appearance.showFooter}
                  onCheckedChange={(value) => update({ showFooter: value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="color" className="space-y-5">
              <div className="space-y-2">
                <Field label="Card theme">
                  <Segmented
                    value={appearance.theme}
                    onChange={(value) => setCardTheme(value)}
                    options={[
                      { value: 'dark', label: 'Dark' },
                      { value: 'light', label: 'Light' },
                    ]}
                  />
                </Field>
                <p className="text-[11px] leading-relaxed text-faint">
                  Theme sets the starting palette. You can still change every colour below.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ColorField
                  label="Background"
                  value={appearance.palette.bg}
                  onChange={(value) => setPalette({ bg: value })}
                />
                <ColorField
                  label="Text"
                  value={appearance.palette.fg}
                  onChange={(value) => setPalette({ fg: value })}
                />
                <ColorField
                  label="Muted"
                  value={appearance.palette.muted}
                  onChange={(value) => setPalette({ muted: value })}
                />
                <ColorField
                  label="Accent"
                  value={appearance.palette.accent}
                  onChange={(value) => setPalette({ accent: value })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={ratio >= 4.5 ? 'success' : ratio >= 3 ? 'accent' : 'danger'}>
                  Text contrast {ratio.toFixed(1)}:1
                </Badge>
                <Badge tone={accentRatio >= 3 ? 'success' : 'danger'}>
                  Accent {accentRatio.toFixed(1)}:1
                </Badge>
              </div>
              <div className="divider" />
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                  <PaletteIcon size={12} />
                  Palette ideas
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      title={`${preset.name} palette`}
                      onClick={() => {
                        const palette = { ...preset.appearance.palette };
                        update({
                          palette,
                          theme: preset.appearance.theme,
                          background: { ...appearance.background, color: palette.bg },
                        });
                      }}
                      className="group flex items-center gap-1.5 rounded-full border border-line py-1 pl-1.5 pr-2.5 text-[10.5px] text-muted transition-colors hover:border-muted/40 hover:text-foreground"
                    >
                      <span className="flex">
                        {[
                          preset.appearance.palette.bg,
                          preset.appearance.palette.fg,
                          preset.appearance.palette.accent,
                        ].map((colour, index) => (
                          <span
                            key={`${preset.id}-${index}`}
                            className="h-3.5 w-3.5 rounded-full border border-black/10 first:ml-0 -ml-1"
                            style={{ background: colour }}
                          />
                        ))}
                      </span>
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="background" className="space-y-5">
              <Segmented
                value={background.kind}
                onChange={(value) => setBackground({ kind: value })}
                options={[
                  { value: 'solid', label: 'Solid' },
                  { value: 'gradient', label: 'Gradient' },
                  { value: 'image', label: 'Image' },
                ]}
              />
              {background.kind === 'solid' ? (
                <ColorField
                  label="Background colour"
                  value={appearance.palette.bg}
                  onChange={(value) => setPalette({ bg: value })}
                />
              ) : null}
              {background.kind === 'gradient' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorField
                      label="From"
                      value={background.from}
                      onChange={(value) => setBackground({ from: value })}
                    />
                    <ColorField
                      label="To"
                      value={background.to}
                      onChange={(value) => setBackground({ to: value })}
                    />
                  </div>
                  <SliderField
                    label="Angle"
                    value={background.angle}
                    min={0}
                    max={360}
                    step={1}
                    onChange={(value) => setBackground({ angle: value })}
                    format={(value) => `${value}°`}
                  />
                </>
              ) : null}
              {background.kind === 'image' ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((image) => {
                      const active = background.image === image.path;
                      return (
                        <button
                          key={image.name}
                          type="button"
                          onClick={() => setBackground({ image: image.path })}
                          className={cn(
                            'group relative aspect-video overflow-hidden rounded-lg border transition-[border-color,box-shadow]',
                            active
                              ? 'border-accent/80 shadow-[0_0_0_2px_var(--accent-soft)]'
                              : 'border-line hover:border-muted/40',
                          )}
                          title={image.name}
                        >
                          <img
                            src={image.url}
                            alt={image.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          {active ? (
                            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={onImportImages}
                      className="flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-faint transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      <ImagePlus size={16} />
                      <span className="text-[10px]">Add</span>
                    </button>
                  </div>
                  {!images.length ? (
                    <div className="rounded-xl border border-dashed border-line p-4 text-center">
                      <ImageIcon size={18} className="mx-auto mb-1.5 text-faint" />
                      <div className="text-[12px] text-muted">No images yet</div>
                      <div className="mt-0.5 text-[11px] text-faint">
                        Add a photo and it becomes the card backdrop.
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <SliderField
                      label="Blur"
                      value={background.blur}
                      min={0}
                      max={30}
                      step={1}
                      onChange={(value) => setBackground({ blur: value })}
                      format={(value) => `${value}px`}
                    />
                    <SliderField
                      label="Dim"
                      value={background.dim}
                      min={0}
                      max={0.9}
                      step={0.01}
                      onChange={(value) => setBackground({ dim: value })}
                      format={(value) => `${Math.round(value * 100)}%`}
                    />
                  </div>
                  <Field label="Focus point">
                    <select
                      className="input"
                      value={background.position}
                      onChange={(event) => setBackground({ position: event.target.value })}
                    >
                      {POSITION_OPTIONS.map((position) => (
                        <option key={position} value={position}>
                          {position.replace(/\b\w/g, (char) => char.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              ) : null}
              <div className="divider" />
              <div className="space-y-2">
                <Field label="Texture">
                  <Segmented
                    value={appearance.texture}
                    onChange={(value) => update({ texture: value })}
                    options={[
                      { value: 'none', label: 'Clean' },
                      { value: 'grain', label: 'Grain' },
                      { value: 'vignette', label: 'Vignette' },
                    ]}
                  />
                </Field>
                <Field label="Frame">
                  <Segmented
                    value={appearance.frame}
                    onChange={(value) => update({ frame: value })}
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'hairline', label: 'Hairline' },
                      { value: 'inset', label: 'Inset' },
                    ]}
                  />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="layout" className="space-y-5">
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    { id: 'center', label: 'Centered' },
                    { id: 'left', label: 'Left aligned' },
                    { id: 'editorial', label: 'Editorial' },
                    { id: 'minimal', label: 'Minimal' },
                  ] as { id: LayoutKind; label: string }[]
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => update({ layout: option.id })}
                    className={cn(
                      'rounded-xl border p-2 text-left transition-[border-color,box-shadow]',
                      appearance.layout === option.id
                        ? 'border-accent/70 shadow-[0_0_0_3px_var(--accent-soft)]'
                        : 'border-line hover:border-muted/40',
                    )}
                  >
                    <LayoutSketch kind={option.id} />
                    <div className="mt-2 px-0.5 text-[11.5px] font-medium text-foreground">
                      {option.label}
                    </div>
                  </button>
                ))}
              </div>
              <div className="divider" />
              <div className="space-y-2">
                <SwitchField
                  label="Show quote marks"
                  checked={appearance.showQuoteMarks}
                  onCheckedChange={(value) => update({ showQuoteMarks: value })}
                />
                <SwitchField
                  label="Show accent rule"
                  checked={appearance.showRule}
                  onCheckedChange={(value) => update({ showRule: value })}
                />
                <SwitchField
                  label="Show footer"
                  checked={appearance.showFooter}
                  onCheckedChange={(value) => update({ showFooter: value })}
                />
              </div>
              <div className="rounded-xl border border-line bg-[var(--panel-soft)] p-3">
                <div className="flex items-center gap-2 text-[11.5px] font-medium text-foreground">
                  <LayoutTemplate size={14} className="text-accent" />
                  Layout tips
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Editorial adds a large quote glyph; Minimal removes decoration. Both keep the text
                  inside the safe area of the lock screen.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex items-center gap-2 text-[11.5px] text-faint">
          <Type size={13} />
          {appearance.fontFamily} · {Math.round(appearance.fontScale * 100)}% · {appearance.layout}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onReset}>
            Start over
          </Button>
          <Button variant="secondary" onClick={onExport}>
            <Download size={14} />
            Export
          </Button>
          <Button variant="primary" onClick={onPublish}>
            <MonitorUp size={14} />
            Publish now
          </Button>
        </div>
      </div>
    </div>
  );
}
