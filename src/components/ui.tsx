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

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-volt-500 text-ink-950 active:bg-volt-600 font-semibold',
  secondary: 'bg-ink-700 text-fg active:bg-ink-600',
  subtle: 'bg-ink-800 text-muted active:bg-ink-700',
  ghost: 'bg-transparent text-fg active:bg-ink-800',
  danger: 'bg-danger/15 text-danger active:bg-danger/25',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-11 px-4 text-[15px] rounded-xl',
  lg: 'h-14 px-5 text-base rounded-xl',
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
        'inline-flex items-center justify-center gap-2 select-none transition-colors',
        'disabled:opacity-40 disabled:pointer-events-none',
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
        'inline-flex items-center justify-center h-10 w-10 rounded-xl transition-colors',
        'disabled:opacity-40 disabled:pointer-events-none',
        VARIANTS[variant],
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
    <div className={cx('bg-ink-850 border border-ink-700/60 rounded-2xl', className)}>
      {children}
    </div>
  )
}

export function Pill({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: 'default' | 'volt' | 'cyan' | 'pr' | 'muted'
  className?: string
}) {
  const tones = {
    default: 'bg-ink-700 text-fg',
    volt: 'bg-volt-500/15 text-volt-400',
    cyan: 'bg-cyan-accent/15 text-cyan-accent',
    pr: 'bg-pr/15 text-pr',
    muted: 'bg-ink-800 text-faint',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
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
      {icon && <div className="text-faint mb-3">{icon}</div>}
      <h3 className="text-fg font-semibold">{title}</h3>
      {subtitle && <p className="text-muted text-sm mt-1 max-w-xs">{subtitle}</p>}
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
      <div className="relative w-full sm:max-w-md bg-ink-850 border-t sm:border border-ink-700 rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col animate-pop safe-bottom">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <IconX size={20} />
          </IconButton>
        </div>
        <div className="px-5 pb-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-ink-700">{footer}</div>}
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
    <div className={cx('inline-flex bg-ink-800 rounded-xl p-1 gap-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cx(
            'px-3 h-9 rounded-lg text-sm font-medium transition-colors flex-1',
            value === opt.value ? 'bg-ink-600 text-fg' : 'text-muted',
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
      <span className="block text-sm text-muted mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-faint mt-1">{hint}</span>}
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
        'w-full h-11 px-3 rounded-xl bg-ink-800 border border-ink-700 text-fg',
        'placeholder:text-faint focus:outline-none focus:border-volt-500',
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
    <div className="inline-flex items-center bg-ink-800 rounded-xl border border-ink-700">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(clamp(value - step))}
        className="h-10 w-10 grid place-items-center text-muted active:text-fg disabled:opacity-30"
        disabled={value <= min}
      >
        <IconMinus size={18} />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(clamp(value + step))}
        className="h-10 w-10 grid place-items-center text-muted active:text-fg disabled:opacity-30"
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
      <div className="h-8 w-8 rounded-full border-2 border-ink-600 border-t-volt-500 animate-spin" />
    </div>
  )
}
