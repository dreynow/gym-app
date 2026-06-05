import { cx } from './ui'

/** Native select styled to match the dark theme (good touch target on mobile). */
export function Select<T extends string>({
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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cx(
        'w-full h-11 px-3 rounded-xl bg-surface-2 border border-line-2 text-fg-1',
        'focus:outline-none focus:border-volt appearance-none',
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface-2">
          {o.label}
        </option>
      ))}
    </select>
  )
}
