import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { allTimeBests, type ExerciseBests } from '../lib/pr'

const ZERO: ExerciseBests = { weight: 0, e1rm: 0, volume: 0 }

/** All-time bests for an exercise across finished sessions before `beforeISO`
 * (so an in-progress session can flag live PRs against true history). */
export function useAllTimeBests(exerciseId: string, beforeISO?: string): ExerciseBests {
  const bests = useLiveQuery(async () => {
    const all = await db.sessions.toArray()
    const prior = beforeISO ? all.filter((s) => s.dateISO < beforeISO) : all
    return allTimeBests(exerciseId, prior)
  }, [exerciseId, beforeISO])
  return bests ?? ZERO
}
