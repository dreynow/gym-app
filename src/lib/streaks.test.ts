import { describe, it, expect } from 'vitest'
import { computeTrainingStats, dayKey, monthGrid } from './streaks'

// Local dates so weekStart (Monday-anchored, local) is deterministic.
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

describe('computeTrainingStats', () => {
  // "now" = Fri 2026-06-05 (week of Mon 2026-06-01).
  const now = d(2026, 6, 5)

  it('counts this week and this month', () => {
    const dates = [d(2026, 6, 2), d(2026, 6, 4), d(2026, 5, 28), d(2026, 6, 1)]
    const s = computeTrainingStats(dates, now)
    expect(s.thisWeek).toBe(3) // Jun 1, 2, 4
    expect(s.thisMonth).toBe(3) // Jun 1, 2, 4 (May 28 excluded)
  })

  it('counts consecutive week streak back from now', () => {
    // Workouts in week of Jun 1, May 25, May 18 => 3 week streak.
    const dates = [d(2026, 6, 2), d(2026, 5, 26), d(2026, 5, 20)]
    expect(computeTrainingStats(dates, now).weekStreak).toBe(3)
  })

  it('does not break the streak just because this week is still empty', () => {
    // Nothing this week yet, but last two weeks trained => streak 2.
    const dates = [d(2026, 5, 26), d(2026, 5, 20)]
    expect(computeTrainingStats(dates, now).weekStreak).toBe(2)
  })

  it('breaks the streak on a fully missed week', () => {
    // This week empty, last week empty, two weeks ago trained => streak 0.
    const dates = [d(2026, 5, 20)]
    expect(computeTrainingStats(dates, now).weekStreak).toBe(0)
  })

  it('reports the longest historical run and trained days', () => {
    const dates = [d(2026, 5, 26), d(2026, 5, 20), d(2026, 5, 13), d(2026, 3, 2)]
    const s = computeTrainingStats(dates, now)
    expect(s.longestWeekStreak).toBe(3)
    expect(s.trainedDays.has(dayKey(d(2026, 5, 20)))).toBe(true)
  })
})

describe('monthGrid', () => {
  it('returns 42 Monday-first cells covering the month', () => {
    const cells = monthGrid(2026, 5) // June 2026
    expect(cells).toHaveLength(42)
    // June 1 2026 is a Monday, so the first cell is June 1.
    expect(dayKey(cells[0])).toBe('2026-06-01')
    expect(cells.some((c) => dayKey(c) === '2026-06-30')).toBe(true)
  })
})
