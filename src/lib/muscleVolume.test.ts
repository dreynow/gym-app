import { describe, it, expect } from 'vitest'
import type { Session, WorkoutSet } from '../db/types'
import { addWeeks, muscleBreakdown, weekStart } from './muscleVolume'

const set = (over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  weightKg: 100,
  reps: 5,
  rpe: null,
  type: 'working',
  done: true,
  ...over,
})

const session = (dateISO: string, exerciseId: string, sets: WorkoutSet[]): Session => ({
  id: `s-${dateISO}-${exerciseId}`,
  dateISO,
  routineId: null,
  durationSeconds: 0,
  entries: [{ exerciseId, sets }],
  finished: true,
  startedAt: dateISO,
})

const MUSCLES = new Map([
  ['bench', 'chest' as const],
  ['squat', 'quads' as const],
])

describe('weekStart', () => {
  it('snaps to the Monday at local midnight', () => {
    // 2026-06-05 is a Friday; its week starts Monday 2026-06-01.
    const ws = weekStart(new Date(2026, 5, 5, 14, 30))
    expect(ws.getFullYear()).toBe(2026)
    expect(ws.getMonth()).toBe(5)
    expect(ws.getDate()).toBe(1)
    expect(ws.getHours()).toBe(0)
    expect(ws.getDay()).toBe(1) // Monday
  })

  it('keeps a Sunday in the week that just ended', () => {
    // Sunday 2026-06-07 belongs to the week starting Monday 2026-06-01.
    expect(weekStart(new Date(2026, 5, 7)).getDate()).toBe(1)
  })

  it('addWeeks steps by whole weeks', () => {
    const ws = weekStart(new Date(2026, 5, 5))
    expect(addWeeks(ws, -1).getDate()).toBe(25) // May 25
  })
})

describe('muscleBreakdown', () => {
  it('counts only hard, logged sets and groups by muscle', () => {
    const sessions = [
      session('2026-06-02T10:00:00.000Z', 'bench', [
        set(),
        set(),
        set({ type: 'warmup' }), // excluded: warmup
        set({ weightKg: null }), // excluded: not logged
      ]),
      session('2026-06-03T10:00:00.000Z', 'squat', [set({ reps: 10 }), set({ reps: 10 })]),
    ]
    const rows = muscleBreakdown(sessions, MUSCLES, 0)
    expect(rows).toEqual([
      { muscle: 'quads', sets: 2, volumeKg: 2000 }, // 100x10 x2
      { muscle: 'chest', sets: 2, volumeKg: 1000 }, // 100x5 x2
    ])
  })

  it('honours the date window and finished flag', () => {
    const inWindow = session('2026-06-02T10:00:00.000Z', 'bench', [set()])
    const tooOld = session('2026-05-01T10:00:00.000Z', 'bench', [set()])
    const unfinished = { ...session('2026-06-02T11:00:00.000Z', 'bench', [set()]), finished: false }
    const since = new Date(2026, 5, 1).getTime()
    const rows = muscleBreakdown([inWindow, tooOld, unfinished], MUSCLES, since)
    expect(rows).toEqual([{ muscle: 'chest', sets: 1, volumeKg: 500 }])
  })

  it('skips exercises with no known muscle', () => {
    const rows = muscleBreakdown(
      [session('2026-06-02T10:00:00.000Z', 'unknown', [set()])],
      MUSCLES,
      0,
    )
    expect(rows).toEqual([])
  })
})
