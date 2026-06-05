import type { MuscleGroup, Session } from '../db/types'
import { isLogged, isWorkingSet, setVolume } from './calc'

/**
 * Weekly working-set volume per muscle group. The headline metric is the count
 * of hard (non-warmup, logged) sets each muscle gets in a week, the number most
 * hypertrophy guidance is framed around (roughly 10 to 20 sets per muscle per
 * week). Tonnage (weight x reps) rides along for a secondary view.
 *
 * Pure functions over plain sessions so they unit-test without a DB and a
 * future cloud sync can reuse them untouched.
 */

export interface MuscleVolumeRow {
  muscle: MuscleGroup
  /** Hard sets (working/drop/failure, with weight and reps logged). */
  sets: number
  /** Tonnage of those sets, in kg. */
  volumeKg: number
}

/** Local midnight on the Monday of the week containing `date`. */
export function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // getDay(): 0=Sun..6=Sat; shift so Monday is the first day.
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d
}

/** Move `n` whole weeks from a week-start date (negative goes back). */
export function addWeeks(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n * 7)
  return d
}

/** Short label for a week, e.g. "Jun 1". */
export function weekLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Aggregate hard sets and tonnage per muscle group across the finished sessions
 * that fall within [sinceMs, untilMs). Rows are sorted by set count, descending;
 * muscles with no work in the window are omitted.
 */
export function muscleBreakdown(
  sessions: Session[],
  muscleByExercise: Map<string, MuscleGroup>,
  sinceMs: number,
  untilMs = Number.POSITIVE_INFINITY,
): MuscleVolumeRow[] {
  const sets = new Map<MuscleGroup, number>()
  const volume = new Map<MuscleGroup, number>()

  for (const s of sessions) {
    if (!s.finished) continue
    const t = new Date(s.dateISO).getTime()
    if (t < sinceMs || t >= untilMs) continue
    for (const entry of s.entries) {
      const muscle = muscleByExercise.get(entry.exerciseId)
      if (!muscle) continue
      for (const set of entry.sets) {
        if (!isLogged(set) || !isWorkingSet(set)) continue
        sets.set(muscle, (sets.get(muscle) ?? 0) + 1)
        volume.set(muscle, (volume.get(muscle) ?? 0) + setVolume(set))
      }
    }
  }

  return [...sets.keys()]
    .map((muscle) => ({
      muscle,
      sets: sets.get(muscle) ?? 0,
      volumeKg: Math.round(volume.get(muscle) ?? 0),
    }))
    .sort((a, b) => b.sets - a.sets || b.volumeKg - a.volumeKg)
}
