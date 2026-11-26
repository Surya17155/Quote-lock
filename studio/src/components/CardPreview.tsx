import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPreviewHtml } from '@/lib/card';
import type { Appearance, CardItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CardPreview({
  item,
  date,
  appearance,
  className,
  chrome = true,
}: {
  item: CardItem;
  date: string;
  appearance: Appearance;
  className?: string;
  chrome?: boolean;
}) {
  const html = useMemo(() => buildPreviewHtml(item, date, appearance), [item, date, appearance]);
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => setScale(element.clientWidth / 1920);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className={cn('preview-frame aspect-video w-full', className)}>
      <iframe
        title="Quote card preview"
        srcDoc={html}
        tabIndex={-1}
        style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}
      />
      {chrome ? (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/75 backdrop-blur-md">
            Live preview
          </span>
          <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/60 backdrop-blur-md">
            1920 × 1080
          </span>
        </div>
      ) : null}
    </div>
  );
}
