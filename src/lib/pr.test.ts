import { describe, it, expect } from 'vitest'
import { allTimeBests, bestsForEntry, detectSessionPRs } from './pr'
import { epley1RM } from './calc'
import type { Session, WorkoutSet } from '../db/types'

const set = (weightKg: number, reps: number): WorkoutSet => ({
  weightKg,
  reps,
  rpe: null,
  type: 'working',
  done: true,
})

const session = (id: string, dateISO: string, sets: WorkoutSet[]): Session => ({
  id,
  dateISO,
  startedAt: dateISO,
  routineId: null,
  durationSeconds: 0,
  finished: true,
  entries: [{ exerciseId: 'squat', sets }],
})

describe('bestsForEntry', () => {
  it('summarises weight, e1RM and volume', () => {
    const b = bestsForEntry({ exerciseId: 'squat', sets: [set(100, 5), set(90, 8)] })
    expect(b.weight).toBe(100)
    expect(b.e1rm).toBeCloseTo(epley1RM(100, 5), 5)
    expect(b.volume).toBe(100 * 5 + 90 * 8)
  })
})

describe('allTimeBests', () => {
  it('takes the max of each metric across sessions', () => {
    const sessions = [
      session('a', '2026-01-01T10:00:00Z', [set(100, 5)]),
      session('b', '2026-01-08T10:00:00Z', [set(110, 3)]),
    ]
    const b = allTimeBests('squat', sessions)
    expect(b.weight).toBe(110)
    expect(b.volume).toBe(500) // 100x5 beats 110x3 on volume
  })
})

describe('detectSessionPRs', () => {
  it('flags all three PRs on the very first session', () => {
    const s = session('a', '2026-01-01T10:00:00Z', [set(100, 5)])
    const prs = detectSessionPRs(s, [])
    expect(prs.map((p) => p.kind).sort()).toEqual(['e1rm', 'volume', 'weight'])
  })

  it('detects PRs only when the current session beats prior history', () => {
    const prior = session('a', '2026-01-01T10:00:00Z', [set(100, 5)])
    const current = session('b', '2026-01-08T10:00:00Z', [set(105, 5)])
    const prs = detectSessionPRs(current, [prior])
    // 105 > 100 (weight), bigger e1RM, 525 > 500 (volume) -> all three.
    expect(prs).toHaveLength(3)
    expect(prs.every((p) => p.sessionId === 'b')).toBe(true)
  })

  it('does not flag a PR when nothing was beaten', () => {
    const prior = session('a', '2026-01-01T10:00:00Z', [set(120, 5)])
    const current = session('b', '2026-01-08T10:00:00Z', [set(100, 5)])
    expect(detectSessionPRs(current, [prior])).toHaveLength(0)
  })

  it('ignores prior sessions dated after the current one', () => {
    const future = session('a', '2026-02-01T10:00:00Z', [set(200, 5)])
    const current = session('b', '2026-01-08T10:00:00Z', [set(100, 5)])
    // The 200kg session is in the future, so the 100kg session still PRs.
    expect(detectSessionPRs(current, [future])).toHaveLength(3)
  })
})
