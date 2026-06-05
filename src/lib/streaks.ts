import { addWeeks, weekStart } from './muscleVolume'

/**
 * Training consistency: which days had a workout, weekly streaks, and counts.
 * A "week streak" (consecutive weeks with at least one workout) fits strength
 * training better than a day streak, since rest days are part of the plan. The
 * current week is forgiving: an empty week-so-far does not break a prior streak.
 */

/** Local calendar day key, e.g. "2026-06-05". */
export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export interface TrainingStats {
  thisWeek: number
  thisMonth: number
  weekStreak: number
  longestWeekStreak: number
  /** Local day keys that had at least one workout. */
  trainedDays: Set<string>
}

export function computeTrainingStats(dates: Date[], now: Date): TrainingStats {
  const trainedDays = new Set(dates.map(dayKey))

  const wkStart = weekStart(now).getTime()
  const wkEnd = addWeeks(weekStart(now), 1).getTime()
  let thisWeek = 0
  let thisMonth = 0
  for (const d of dates) {
    const t = d.getTime()
    if (t >= wkStart && t < wkEnd) thisWeek++
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) thisMonth++
  }

  // Distinct week-start timestamps that contain a workout.
  const weeks = new Set(dates.map((d) => weekStart(d).getTime()))

  // Current streak: walk back from this week. If this week is still empty,
  // start from last week so an unstarted week does not zero the streak.
  let cursor = weekStart(now)
  if (!weeks.has(cursor.getTime())) cursor = addWeeks(cursor, -1)
  let weekStreak = 0
  while (weeks.has(cursor.getTime())) {
    weekStreak++
    cursor = addWeeks(cursor, -1)
  }

  // Longest run of consecutive weeks anywhere in history.
  const sorted = [...weeks].sort((a, b) => a - b)
  let longestWeekStreak = 0
  let run = 0
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] === addWeeks(new Date(sorted[i - 1]), 1).getTime()) run++
    else run = 1
    if (run > longestWeekStreak) longestWeekStreak = run
  }

  return { thisWeek, thisMonth, weekStreak, longestWeekStreak, trainedDays }
}

/**
 * The calendar grid for a month: 6 rows x 7 days (Monday first), each cell a
 * Date. Days outside the target month are included so weeks are full.
 */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  // Monday-first offset for the 1st of the month.
  const lead = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - lead)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) cells.push(new Date(year, month, 1 - lead + i))
  return cells.length ? cells : [start]
}
