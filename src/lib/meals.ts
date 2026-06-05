import type { Meal } from '../db/types'
import { dayKey } from './streaks'

export interface MealTotals {
  calories: number
  proteinG: number
}

export function mealTotals(meals: Meal[]): MealTotals {
  return meals.reduce<MealTotals>(
    (t, m) => ({ calories: t.calories + m.calories, proteinG: t.proteinG + m.proteinG }),
    { calories: 0, proteinG: 0 },
  )
}

/** Parse a "YYYY-MM-DD" key back to a local Date. */
export function dayFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Shift a day key by whole days. */
export function shiftDayKey(key: string, delta: number): string {
  const d = dayFromKey(key)
  d.setDate(d.getDate() + delta)
  return dayKey(d)
}

/** "Today", "Yesterday", or a short weekday/date label for a day key. */
export function dayLabel(key: string, today = dayKey(new Date())): string {
  if (key === today) return 'Today'
  if (key === shiftDayKey(today, -1)) return 'Yesterday'
  return dayFromKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
