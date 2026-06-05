import type { SessionEntry } from '../db/types'
import { isLogged, isWorkingSet } from './calc'

/**
 * Double progression: at a fixed weight you climb reps across sessions until you
 * hit the top of the routine's rep range on every working set, then you add the
 * smallest weight increment and start climbing again. This helper detects the
 * "ready to add weight" moment from the last session and suggests the next load.
 */

export interface ProgressionSuggestion {
  currentWeightKg: number
  suggestedWeightKg: number
  incrementKg: number
  repHigh: number
}

/** Smallest practical weight jump: a plate per side for a barbell, else 2.5kg. */
export function progressionIncrementKg(
  usesBarbell: boolean,
  plateInventoryKg: number[],
): number {
  if (usesBarbell && plateInventoryKg.length > 0) {
    return Math.min(...plateInventoryKg) * 2
  }
  return 2.5
}

/**
 * If every logged working set in `lastEntry` hit the top of the rep range
 * (reps >= repHigh), suggest adding a weight increment. Returns null when still
 * climbing reps, or there is nothing to judge.
 */
export function suggestProgression(
  lastEntry: SessionEntry | null | undefined,
  repHigh: number | undefined,
  opts: { usesBarbell: boolean; plateInventoryKg: number[] },
): ProgressionSuggestion | null {
  if (!lastEntry || !repHigh) return null
  const working = lastEntry.sets.filter((s) => isLogged(s) && isWorkingSet(s))
  if (working.length === 0) return null
  // Ready only when ALL working sets topped the range.
  if (!working.every((s) => (s.reps ?? 0) >= repHigh)) return null
  const currentWeightKg = Math.max(...working.map((s) => s.weightKg ?? 0))
  if (currentWeightKg <= 0) return null
  const incrementKg = progressionIncrementKg(opts.usesBarbell, opts.plateInventoryKg)
  const suggestedWeightKg = Math.round((currentWeightKg + incrementKg) * 100) / 100
  return { currentWeightKg, suggestedWeightKg, incrementKg, repHigh }
}
