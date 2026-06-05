import {
  useEffect,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { IconMinus, IconPlus, IconX } from './Icons'

/** Join class names, dropping falsy values. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

// Rack: volt is the only fill; everything else is charcoal + hairline.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-volt text-on-volt font-semibold active:bg-volt-deep',
  secondary: 'bg-surface-2 text-fg-1 border border-line-2 active:bg-surface-3',
  subtle: 'bg-surface-2 text-fg-2 active:bg-surface-3',
  ghost: 'bg-transparent text-fg-1 active:bg-surface-2',
  danger: 'bg-danger-ghost text-danger active:bg-danger/20',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-md',
  md: 'h-11 px-4 text-[15px] rounded-md',
  lg: 'h-12 px-5 text-[15px] rounded-md',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  full?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  full,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 select-none transition-[transform,background-color] duration-150 active:scale-[.97]',
        'disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100',
        // The one expressive shadow: a soft volt halo on the primary CTA.
        variant === 'primary' && size === 'lg' && 'shadow-glow',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: Variant
}

export function IconButton({ label, variant = 'ghost', className, children, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cx(
        'inline-flex items-center justify-center h-10 w-10 rounded-md transition-colors',
        'disabled:opacity-40 disabled:pointer-events-none',
        variant === 'ghost' ? 'text-fg-2 active:bg-surface-2' : VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('bg-surface-1 border border-line-2 rounded-lg', className)}>
      {children}
    </div>
  )
}

type PillTone = 'default' | 'volt' | 'pr' | 'info' | 'cyan' | 'muted' | 'warning' | 'success' | 'danger'

export function Pill({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: PillTone
  className?: string
}) {
  const tones: Record<PillTone, string> = {
    default: 'bg-surface-3 text-fg-2',
    // Accent text uses the dimmer volt to cut glare on surfaces.
    volt: 'bg-volt-ghost text-volt-dim',
    // A PR is a rationed celebration: solid volt fill.
    pr: 'bg-volt text-on-volt',
    info: 'bg-info-ghost text-info',
    cyan: 'bg-info-ghost text-info',
    muted: 'bg-surface-2 text-fg-3',
    warning: 'bg-warning-ghost text-warning',
    success: 'bg-success-ghost text-success',
    danger: 'bg-danger-ghost text-danger',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && <div className="text-fg-3 mb-3">{icon}</div>}
      <h3 className="text-fg-1 font-semibold text-lg">{title}</h3>
      {subtitle && <p className="text-fg-2 text-sm mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** A bottom sheet for mobile-friendly modals (pickers, forms, confirmations). */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-md bg-surface-1 border-t sm:border border-line-2 rounded-t-2xl sm:rounded-2xl max-h-[88vh] flex flex-col animate-sheet shadow-sheet safe-bottom">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <IconX size={20} />
          </IconButton>
        </div>
        <div className="px-5 pb-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line-2">{footer}</div>}
      </div>
    </div>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cx('inline-flex bg-surface-2 rounded-lg p-1 gap-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cx(
            'px-3 h-9 rounded-md text-sm font-medium transition-colors flex-1',
            value === opt.value ? 'bg-surface-4 text-fg-1' : 'text-fg-2',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm text-fg-2 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-fg-3 mt-1">{hint}</span>}
    </label>
  )
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'w-full h-11 px-3 rounded-md bg-surface-2 border border-line-2 text-fg-1',
        'placeholder:text-fg-3 focus:outline-none focus:border-volt-line',
        className,
      )}
      {...props}
    />
  )
}

/** Compact +/- stepper for small integer targets (sets, rep range, etc.). */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  return (
    <div className="inline-flex items-center bg-surface-2 rounded-md border border-line-2">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(clamp(value - step))}
        className="h-10 w-10 grid place-items-center text-fg-2 active:text-fg-1 disabled:opacity-30"
        disabled={value <= min}
      >
        <IconMinus size={18} />
      </button>
      <span className="w-9 text-center font-mono font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(clamp(value + step))}
        className="h-10 w-10 grid place-items-center text-fg-2 active:text-fg-1 disabled:opacity-30"
        disabled={value >= max}
      >
        <IconPlus size={18} />
      </button>
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 rounded-full border-2 border-surface-3 border-t-volt animate-spin" />
    </div>
  )
}
