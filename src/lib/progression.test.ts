import { describe, it, expect } from 'vitest'
import type { SessionEntry, WorkoutSet } from '../db/types'
import { progressionIncrementKg, suggestProgression } from './progression'

const set = (over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  weightKg: 100,
  reps: 7,
  rpe: null,
  type: 'working',
  done: true,
  ...over,
})
const entry = (sets: WorkoutSet[]): SessionEntry => ({ exerciseId: 'back-squat', sets })
const opts = { usesBarbell: true, plateInventoryKg: [25, 20, 15, 10, 5, 2.5, 1.25] }

describe('progressionIncrementKg', () => {
  it('is a plate per side for a barbell', () => {
    expect(progressionIncrementKg(true, [25, 1.25])).toBe(2.5)
  })
  it('defaults to 2.5kg for non-barbell', () => {
    expect(progressionIncrementKg(false, [25, 1.25])).toBe(2.5)
  })
})

describe('suggestProgression', () => {
  it('suggests +increment when all working sets hit the top of the range', () => {
    const s = suggestProgression(entry([set(), set(), set()]), 7, opts)
    expect(s).toEqual({ currentWeightKg: 100, suggestedWeightKg: 102.5, incrementKg: 2.5, repHigh: 7 })
  })

  it('does not suggest when one set is below the top', () => {
    expect(suggestProgression(entry([set(), set(), set({ reps: 6 })]), 7, opts)).toBeNull()
  })

  it('ignores warmups and uses the heaviest working weight', () => {
    const s = suggestProgression(
      entry([set({ type: 'warmup', weightKg: 60, reps: 5 }), set({ weightKg: 100 }), set({ weightKg: 100 })]),
      7,
      opts,
    )
    expect(s?.currentWeightKg).toBe(100)
    expect(s?.suggestedWeightKg).toBe(102.5)
  })

  it('returns null with no rep range, no working sets, or no last entry', () => {
    expect(suggestProgression(entry([set()]), undefined, opts)).toBeNull()
    expect(suggestProgression(entry([set({ type: 'warmup' })]), 7, opts)).toBeNull()
    expect(suggestProgression(null, 7, opts)).toBeNull()
  })
})
