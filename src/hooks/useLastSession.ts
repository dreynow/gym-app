import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Session, SessionEntry } from '../db/types'

export interface LastSessionInfo {
  session: Session
  entry: SessionEntry
}

/**
 * The most recent finished session (before `beforeISO`) that included this
 * exercise. Powers the "beat your last session" inline reference. Live so it
 * stays correct even if history is edited mid-app.
 */
export function useLastSession(
  exerciseId: string,
  beforeISO?: string,
): LastSessionInfo | null {
  const result = useLiveQuery(async () => {
    const all = await db.sessions.toArray()
    const candidates = all
      .filter((s) => s.finished)
      .filter((s) => !beforeISO || s.dateISO < beforeISO)
      .filter((s) => s.entries.some((e) => e.exerciseId === exerciseId))
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
    const session = candidates[0]
    if (!session) return null
    const entry = session.entries.find((e) => e.exerciseId === exerciseId)!
    return { session, entry }
  }, [exerciseId, beforeISO])
  return result ?? null
}
