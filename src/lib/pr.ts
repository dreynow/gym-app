import { db } from '../db/db'
import type { PrKind, PrRecord, Session, SessionEntry } from '../db/types'
import { entryBestE1RM, entryVolume, topSetWeight } from './calc'

export interface ExerciseBests {
  weight: number
  e1rm: number
  volume: number
}

const EMPTY: ExerciseBests = { weight: 0, e1rm: 0, volume: 0 }

/** Bests achieved within a single session entry. */
export function bestsForEntry(entry: SessionEntry): ExerciseBests {
  return {
    weight: topSetWeight(entry),
    e1rm: entryBestE1RM(entry),
    volume: entryVolume(entry),
  }
}

/** All-time bests for an exercise across the given (finished) sessions. */
export function allTimeBests(exerciseId: string, sessions: Session[]): ExerciseBests {
  return sessions.reduce<ExerciseBests>((acc, s) => {
    if (!s.finished) return acc
    const entry = s.entries.find((e) => e.exerciseId === exerciseId)
    if (!entry) return acc
    const b = bestsForEntry(entry)
    return {
      weight: Math.max(acc.weight, b.weight),
      e1rm: Math.max(acc.e1rm, b.e1rm),
      volume: Math.max(acc.volume, b.volume),
    }
  }, EMPTY)
}

const KINDS: PrKind[] = ['weight', 'e1rm', 'volume']

/**
 * Compare a session's entries against the bests from all sessions that came
 * before it, returning a PR record for each metric beaten. A small epsilon
 * avoids flagging a "PR" on a floating point tie.
 */
export function detectSessionPRs(session: Session, priorSessions: Session[]): PrRecord[] {
  const eps = 1e-6
  const prs: PrRecord[] = []
  const earlier = priorSessions.filter((s) => s.id !== session.id && s.dateISO < session.dateISO)
  for (const entry of session.entries) {
    const current = bestsForEntry(entry)
    const prior = allTimeBests(entry.exerciseId, earlier)
    for (const kind of KINDS) {
      if (current[kind] > 0 && current[kind] > prior[kind] + eps) {
        prs.push({
          id: `${session.id}:${entry.exerciseId}:${kind}`,
          exerciseId: entry.exerciseId,
          kind,
          value: current[kind],
          dateISO: session.dateISO,
          sessionId: session.id,
        })
      }
    }
  }
  return prs
}

/**
 * Recompute PR records for a freshly finished session and persist them. Called
 * once on finish; History and Progress read the stored records.
 */
export async function recordSessionPRs(session: Session): Promise<PrRecord[]> {
  const all = await db.sessions.toArray()
  const prior = all.filter((s) => s.finished && s.id !== session.id)
  const prs = detectSessionPRs(session, prior)
  // Replace any previously stored PRs for this session (re-finish / edits).
  await db.prs.where('id').startsWith(`${session.id}:`).delete()
  if (prs.length) await db.prs.bulkPut(prs)
  return prs
}

export const PR_LABEL: Record<PrKind, string> = {
  weight: 'Weight PR',
  e1rm: '1RM PR',
  volume: 'Volume PR',
}
