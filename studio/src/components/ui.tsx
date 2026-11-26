import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, CircleAlert, Loader2, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import type { ToastItem } from '@/lib/types';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const variants: Record<ButtonVariant, string> = {
  primary: 'btn-glass-primary',
  secondary: 'btn-glass',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  danger: 'btn-danger',
  subtle: 'btn-subtle',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12.5px] rounded-[10px]',
  md: 'h-10 px-4 text-[13px] rounded-xl',
  lg: 'h-11 px-5 text-[13.5px] rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-[10px]',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 font-medium transition-[background-color,color,border-color,box-shadow,filter,transform] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  className,
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return <Button size="icon" variant="ghost" className={className} {...props} />;
}

export function Panel({
  className,
  children,
  ...props
}: ComponentProps<'section'>) {
  return (
    <section className={cn('surface p-5', className)} {...props}>
      {children}
    </section>
  );
}

export function Label({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('text-[12px] font-medium tracking-[0.01em] text-muted', className)}>
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <Label>{label}</Label>
      {children}
      {hint ? <span className="block text-[11.5px] leading-relaxed text-faint">{hint}</span> : null}
    </label>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-4', className)}>
      <div>
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
        {hint ? <p className="mt-0.5 text-[11.5px] text-faint">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SliderField({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  format,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        <span className="rounded-md bg-elevated px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted">
          {format ? format(value) : value}
        </span>
      </div>
      <SliderPrimitive.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([next]) => onChange(next)}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[var(--line-strong)]">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-accent" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-[var(--panel-strong)] bg-accent shadow-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50" />
      </SliderPrimitive.Root>
      {hint ? <p className="-mt-1 text-[11.5px] leading-relaxed text-faint">{hint}</p> : null}
    </div>
  );
}

export function SwitchField({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-foreground">{label}</div>
        {hint ? <div className="mt-0.5 text-[11.5px] leading-relaxed text-faint">{hint}</div> : null}
      </div>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="glass-switch data-[state=checked]:bg-accent data-[state=unchecked]:bg-[var(--line-strong)] relative h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full border border-[var(--glass-border)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <SwitchPrimitive.Thumb className="block h-[18px] w-[18px] translate-x-[2px] rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px]" />
      </SwitchPrimitive.Root>
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'inline-flex w-full items-center gap-1 rounded-xl border border-line bg-[var(--panel-soft)] p-1',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-2 text-[12px] font-medium transition-colors',
            value === option.value
              ? 'bg-elevated text-foreground shadow-sm'
              : 'text-muted hover:text-foreground',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function hex6(value: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  return match ? `#${match[1]}` : '#000000';
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-[var(--panel)] px-2 transition-colors focus-within:border-accent/50">
        <span
          className="swatch relative h-6 w-6 shrink-0 overflow-hidden rounded-md"
          style={{ background: value }}
        >
          <input
            type="color"
            value={hex6(value)}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label} colour picker`}
          />
        </span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          spellCheck={false}
          className="w-full min-w-0 bg-transparent font-mono text-[11.5px] uppercase tracking-wide text-foreground outline-none"
        />
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'accent';
  className?: string;
}) {
  const tones = {
    default: 'text-muted',
    success: 'text-success border-success/25 bg-success/10',
    danger: 'text-danger border-danger/25 bg-danger/10',
    accent: 'text-accent border-accent/25 bg-accent-soft',
  };
  return <span className={cn('chip', tones[tone], className)}>{children}</span>;
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon ? (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--panel-soft)] text-muted">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.12em] text-faint">{label}</div>
        <div className="mt-0.5 truncate text-[13.5px] font-medium text-foreground">{value}</div>
        {hint ? <div className="mt-0.5 text-[11.5px] text-muted">{hint}</div> : null}
      </div>
    </div>
  );
}

export function Tabs({
  value,
  onValueChange,
  tabs,
  children,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: { value: string; label: string }[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
      <TabsPrimitive.List className="flex w-full items-center gap-1 rounded-xl border border-line bg-[var(--panel-soft)] p-1">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="flex-1 rounded-[9px] px-2 py-1.5 text-[12px] font-medium text-muted outline-none transition-colors hover:text-foreground data-[state=active]:bg-elevated data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Content value={value} className={cn('mt-4 outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  );
}

export function Tip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={8}
          className="z-[80] rounded-lg border border-line bg-[var(--panel-strong)] px-2.5 py-1.5 text-[11.5px] text-foreground shadow-xl"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function TooltipHost({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={350} skipDelayDuration={120}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[3px]" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[91] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--glass-border)] bg-[linear-gradient(180deg,var(--glass-highlight-soft),transparent_46%),var(--glass-bg-strong)] p-6 shadow-2xl outline-none backdrop-blur-2xl',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-[16px] font-semibold tracking-[-0.01em] text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-foreground"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </DialogPrimitive.Close>
          </div>
          {children ? <div className="mt-5">{children}</div> : null}
          {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'primary',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

const ToastContext = createContext<{ push: (toast: Omit<ToastItem, 'id'>) => void } | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const push = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = Date.now() + Math.random();
      setItems((current) => [...current.slice(-3), { ...toast, id }]);
      window.setTimeout(() => remove(id), 4800);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-[340px] flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="pointer-events-auto rounded-xl border border-[var(--glass-border)] bg-[linear-gradient(180deg,var(--glass-highlight-soft),transparent_46%),var(--glass-bg-strong)] p-3.5 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    item.tone === 'error'
                      ? 'bg-danger/12 text-danger'
                      : item.tone === 'success'
                        ? 'bg-success/12 text-success'
                        : 'bg-accent-soft text-accent',
                  )}
                >
                  {item.tone === 'error' ? <CircleAlert size={15} /> : <CheckCircle2 size={15} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-foreground">{item.title}</div>
                  {item.description ? (
                    <div className="mt-0.5 line-clamp-3 text-[11.5px] leading-relaxed text-muted">
                      {item.description}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="text-faint transition-colors hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 size={14} className={cn('animate-spin', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--panel-soft)] text-muted">
          {icon}
        </div>
      ) : null}
      <div className="text-[13.5px] font-medium text-foreground">{title}</div>
      {description ? (
        <div className="mt-1 max-w-[42ch] text-[12px] leading-relaxed text-muted">{description}</div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="kbd">{children}</span>;
}
