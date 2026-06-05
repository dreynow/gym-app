import type { Session, SessionEntry, WorkoutSet } from '../db/types'

/** Epley estimated 1RM: weight x (1 + reps / 30). */
export function epley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  if (reps === 1) return weightKg
  return weightKg * (1 + reps / 30)
}

/** Volume for a single set (0 for unloaded/empty sets). */
export function setVolume(set: WorkoutSet): number {
  if (set.weightKg == null || set.reps == null) return 0
  return set.weightKg * set.reps
}

/** A set counts toward stats only when it has a weight and reps logged. */
export function isLogged(set: WorkoutSet): boolean {
  return set.weightKg != null && set.reps != null && set.reps > 0
}

/** Working + drop + failure sets count as "hard" sets; warmups do not. */
export function isWorkingSet(set: WorkoutSet): boolean {
  return set.type !== 'warmup'
}

export function entryVolume(entry: SessionEntry): number {
  return entry.sets.reduce((sum, s) => sum + setVolume(s), 0)
}

export function sessionVolume(session: Session): number {
  return session.entries.reduce((sum, e) => sum + entryVolume(e), 0)
}

/** The heaviest logged set in an entry, used for "top set" charts. */
export function topSetWeight(entry: SessionEntry): number {
  return entry.sets.reduce((max, s) => {
    if (!isLogged(s)) return max
    return Math.max(max, s.weightKg ?? 0)
  }, 0)
}

/** Best estimated 1RM across all logged sets in an entry. */
export function entryBestE1RM(entry: SessionEntry): number {
  return entry.sets.reduce((best, s) => {
    if (!isLogged(s)) return best
    return Math.max(best, epley1RM(s.weightKg!, s.reps!))
  }, 0)
}

export function countWorkingSets(entry: SessionEntry): number {
  return entry.sets.filter((s) => isLogged(s) && isWorkingSet(s)).length
}

export interface PlateLayout {
  /** Plates for one side of the bar, heaviest first. */
  perSide: number[]
  /** Weight not representable with available plates (rounding leftover). */
  remainderKg: number
  achievableKg: number
}

/**
 * Greedy plate calculator. Given a target total weight, the bar weight, and the
 * available plate denominations, returns the plates to load per side.
 */
export function calcPlates(
  targetKg: number,
  barKg: number,
  inventoryKg: number[],
): PlateLayout {
  const perSide: number[] = []
  if (targetKg <= barKg) {
    return { perSide, remainderKg: 0, achievableKg: barKg }
  }
  let perSideRemaining = (targetKg - barKg) / 2
  const plates = [...inventoryKg].sort((a, b) => b - a)
  // Small epsilon guards against floating point drift (e.g. 1.25 increments).
  const eps = 1e-6
  for (const plate of plates) {
    while (perSideRemaining + eps >= plate) {
      perSide.push(plate)
      perSideRemaining -= plate
    }
  }
  const remainderKg = Math.max(0, perSideRemaining)
  const achievableKg = targetKg - remainderKg * 2
  return { perSide, remainderKg, achievableKg }
}

/** kg <-> lb helpers for display only; storage is always kg. */
export const KG_PER_LB = 0.45359237
export function kgToLb(kg: number): number {
  return kg / KG_PER_LB
}
export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}
