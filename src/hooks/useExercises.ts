import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Exercise } from '../db/types'

/** Live map of exerciseId -> Exercise, including archived ones (so history
 * can still resolve names). */
export function useExerciseMap(): Map<string, Exercise> {
  const list = useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[])
  return new Map(list.map((e) => [e.id, e]))
}

/** Live, name-sorted list of non-archived exercises for pickers/library. */
export function useExercises(includeArchived = false): Exercise[] {
  const list = useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[])
  return list
    .filter((e) => includeArchived || !e.archived)
    .sort((a, b) => a.name.localeCompare(b.name))
}
