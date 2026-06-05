import type { Units } from '../db/types'
import { kgToLb } from './calc'

/** Trim trailing zeros: 60 -> "60", 62.5 -> "62.5". */
export function num(n: number, maxDecimals = 1): string {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 10 ** maxDecimals) / 10 ** maxDecimals
  return rounded.toString()
}

/** Display a kg-stored weight in the user's chosen units (with no suffix). */
export function displayWeight(kg: number | null | undefined, units: Units): string {
  if (kg == null) return '—'
  return units === 'lb' ? num(kgToLb(kg)) : num(kg)
}

export function unitLabel(units: Units): string {
  return units === 'lb' ? 'lb' : 'kg'
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** "8m", "1h 12m" for session length summaries. */
export function formatDurationShort(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  if (m > 0) return `${m}m`
  return `${s}s`
}

const DAY_MS = 86_400_000

export function formatDate(dateISO: string): string {
  const d = new Date(dateISO)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateISO: string): string {
  const d = new Date(dateISO)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** "Today", "Yesterday", "3 days ago", else a short date. */
export function relativeDate(dateISO: string): string {
  const then = new Date(dateISO)
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate())
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((startOfToday.getTime() - startOfThen.getTime()) / DAY_MS)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`
  return formatDate(dateISO)
}

/** yyyy-mm-dd for date inputs, in local time. */
export function toDateInputValue(dateISO: string): string {
  const d = new Date(dateISO)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}
