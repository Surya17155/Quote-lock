import {
  CalendarClock,
  Eye,
  FolderOpen,
  ImagePlus,
  Images,
  Paintbrush,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  Panel,
  Tabs,
  TabsContent,
} from '@/components/ui';
import type { CardMeta, UserImage } from '@/lib/types';
import { fileSize, formatLongDate, formatShortDate } from '@/lib/utils';

type LibraryTab = 'queue' | 'shown' | 'images';

type Selection =
  | { kind: 'card'; card: CardMeta }
  | { kind: 'image'; image: UserImage }
  | null;

export function LibraryPage({
  queue,
  shown,
  images,
  onImport,
  onRemoveImage,
  onUseImage,
  onOpenImages,
}: {
  queue: CardMeta[];
  shown: CardMeta[];
  images: UserImage[];
  onImport: () => void;
  onRemoveImage: (image: UserImage) => void;
  onUseImage: (image: UserImage) => void;
  onOpenImages: () => void;
}) {
  const [tab, setTab] = useState<LibraryTab>('queue');
  const [selection, setSelection] = useState<Selection>(null);
  const [pendingDelete, setPendingDelete] = useState<UserImage | null>(null);

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <PageHeader
        eyebrow="Library"
        title="Every card, in one place."
        description="Cards waiting in the queue, past lock screens, and the photos you have added as backdrops."
        actions={
          <>
            <Button variant="secondary" onClick={onOpenImages}>
              <FolderOpen size={14} />
              Image folder
            </Button>
            <Button variant="primary" onClick={onImport}>
              <ImagePlus size={15} />
              Add images
            </Button>
          </>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as LibraryTab)}
        tabs={[
          { value: 'queue', label: `Queue · ${queue.length}` },
          { value: 'shown', label: `Published · ${shown.length}` },
          { value: 'images', label: `My images · ${images.length}` },
        ]}
      >
        <TabsContent value="queue">
          {queue.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {queue.map((card) => (
                <button
                  key={card.date}
                  type="button"
                  onClick={() => setSelection({ kind: 'card', card })}
                  className="group overflow-hidden rounded-2xl border border-line bg-[var(--panel)] text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-xl"
                >
                  <div className="relative aspect-video overflow-hidden bg-[var(--panel-strong)]">
                    {card.url ? (
                      <img
                        src={card.url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="absolute left-2.5 top-2.5 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/80 backdrop-blur-md">
                      {formatShortDate(card.date)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-200 group-hover:bg-black/25 group-hover:opacity-100">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black">
                        <Eye size={14} />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-foreground">
                        {card.category || 'Quote'}
                      </div>
                      <div className="mt-0.5 truncate text-[11.5px] text-muted">{card.author}</div>
                    </div>
                    <Badge>{formatShortDate(card.date)}</Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarClock size={18} />}
              title="No cards in the queue"
              description="Generate from Home and the next few days will be prepared here."
            />
          )}
        </TabsContent>

        <TabsContent value="shown">
          {shown.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((card) => (
                <button
                  key={`${card.date}-${card.created || ''}`}
                  type="button"
                  onClick={() => setSelection({ kind: 'card', card })}
                  className="group overflow-hidden rounded-2xl border border-line bg-[var(--panel)] text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-xl"
                >
                  <div className="relative aspect-video overflow-hidden bg-[var(--panel-strong)]">
                    {card.url ? (
                      <img
                        src={card.url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="absolute left-2.5 top-2.5 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/80 backdrop-blur-md">
                      Published
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-foreground">
                        {card.author || 'Unknown'}
                      </div>
                      <div className="mt-0.5 truncate text-[11.5px] text-muted">
                        {card.category} · {formatShortDate(card.date)}
                      </div>
                    </div>
                    <Eye size={14} className="shrink-0 text-faint" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Images size={18} />}
              title="Nothing published yet"
              description="Once a card reaches your lock screen it will be archived here."
            />
          )}
        </TabsContent>

        <TabsContent value="images">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <button
              type="button"
              onClick={onImport}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-faint transition-colors hover:border-accent/50 hover:text-accent"
            >
              <ImagePlus size={20} />
              <span className="text-[12px] font-medium">Add images</span>
              <span className="text-[10.5px]">PNG, JPG, WebP</span>
            </button>
            {images.map((image) => (
              <div
                key={image.name}
                className="group overflow-hidden rounded-2xl border border-line bg-[var(--panel)]"
              >
                <button
                  type="button"
                  onClick={() => setSelection({ kind: 'image', image })}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-[var(--panel-strong)]"
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-200 group-hover:bg-black/25 group-hover:opacity-100">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black">
                      <Eye size={14} />
                    </span>
                  </div>
                </button>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-[11.5px] font-medium text-foreground">
                      {image.name}
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-faint">
                      {image.width && image.height ? `${image.width}×${image.height} · ` : ''}
                      {fileSize(image.size)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Use as background"
                      onClick={() => onUseImage(image)}
                    >
                      <Paintbrush size={13} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Delete image"
                      onClick={() => setPendingDelete(image)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!images.length ? (
            <Panel className="mt-4">
              <p className="text-[12px] leading-relaxed text-muted">
                Your images are stored in <span className="font-mono text-[11px]">assets\user</span>.
                Add a photo, choose it as the backdrop, then tune blur and dim in Studio. Images are
                never uploaded anywhere.
              </p>
            </Panel>
          ) : null}
        </TabsContent>
      </Tabs>

      <Modal
        open={Boolean(selection)}
        onOpenChange={(open) => {
          if (!open) setSelection(null);
        }}
        title={
          selection?.kind === 'card'
            ? formatLongDate(selection.card.date)
            : selection?.kind === 'image'
              ? selection.image.name
              : ''
        }
        description={
          selection?.kind === 'card'
            ? `${selection.card.category} · ${selection.card.author}`
            : selection?.kind === 'image'
              ? `${selection.image.width}×${selection.image.height} · ${fileSize(selection.image.size)}`
              : undefined
        }
        className="w-[min(92vw,880px)]"
        footer={
          selection?.kind === 'image' ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setPendingDelete(selection.image);
                  setSelection(null);
                }}
              >
                <Trash2 size={14} />
                Delete
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onUseImage(selection.image);
                  setSelection(null);
                }}
              >
                <Paintbrush size={14} />
                Use as background
              </Button>
            </>
          ) : null
        }
      >
        {selection ? (
          <div className="overflow-hidden rounded-xl border border-line bg-black">
            <img
              src={selection.kind === 'card' ? selection.card.url : selection.image.url}
              alt=""
              className="aspect-video w-full object-contain"
            />
          </div>
        ) : null}
        {selection?.kind === 'card' ? (
          <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-muted">
            {selection.card.quote}
          </p>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this image?"
        description="The file will be removed from your image folder. Cards that already use it keep their rendered PNG."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => {
          if (pendingDelete) onRemoveImage(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
