import { db, DEFAULT_SETTINGS, SETTINGS_ID } from './db'
import { buildSeedExercises, buildSeedRoutines } from './seed'
import type {
  BodyMetric,
  CoachMessage,
  Exercise,
  Routine,
  RoutineItem,
  Session,
  SessionEntry,
  Settings,
} from './types'
import { uid } from '../lib/id'
import {
  matchWorkoutsToSessions,
  parseAppleHealthExport,
  parseAppleHealthFile,
  parseAppleHealthStream,
  type AppleHealthData,
  type HealthWorkout,
} from '../lib/appleHealth'
import { toDateInputValue } from '../lib/format'
import { formatActivityType } from '../lib/labels'

const SEEDED_FLAG = 'ironlog.seeded.v1'

/**
 * First-run setup: populate the starter library, routines, and settings.
 * Idempotent — guarded by a localStorage flag and an emptiness check so we
 * never clobber a user who has already started using the app.
 */
export async function initDatabase(): Promise<void> {
  const already = localStorage.getItem(SEEDED_FLAG)
  const existingSettings = await db.settings.get(SETTINGS_ID)
  if (!existingSettings) {
    await db.settings.put({ ...DEFAULT_SETTINGS })
  }
  if (already) return

  const exerciseCount = await db.exercises.count()
  const routineCount = await db.routines.count()
  if (exerciseCount === 0) {
    await db.exercises.bulkPut(buildSeedExercises())
  }
  if (routineCount === 0) {
    await db.routines.bulkPut(buildSeedRoutines())
  }
  localStorage.setItem(SEEDED_FLAG, '1')
}

// ---------- Settings ----------

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(SETTINGS_ID)
  return s ?? { ...DEFAULT_SETTINGS }
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: SETTINGS_ID })
}

// ---------- Exercises ----------

export function newExercise(data: Partial<Exercise> & Pick<Exercise, 'name'>): Exercise {
  return {
    id: uid('ex'),
    name: data.name,
    muscleGroup: data.muscleGroup ?? 'fullbody',
    equipment: data.equipment ?? 'other',
    isCustom: true,
    defaultRestSeconds: data.defaultRestSeconds ?? 120,
    usesBarbell: data.usesBarbell ?? false,
    notes: data.notes,
  }
}

export async function saveExercise(exercise: Exercise): Promise<void> {
  await db.exercises.put(exercise)
}

export async function archiveExercise(id: string): Promise<void> {
  await db.exercises.update(id, { archived: true })
}

export async function getExerciseMap(): Promise<Map<string, Exercise>> {
  const all = await db.exercises.toArray()
  return new Map(all.map((e) => [e.id, e]))
}

// ---------- Routines ----------

export function newRoutine(name: string): Routine {
  const now = new Date().toISOString()
  return {
    id: uid('rt'),
    name,
    items: [],
    order: Date.now(),
    createdAt: now,
    updatedAt: now,
  }
}

export async function saveRoutine(routine: Routine): Promise<void> {
  await db.routines.put({ ...routine, updatedAt: new Date().toISOString() })
}

export async function deleteRoutine(id: string): Promise<void> {
  // Hard delete is safe: sessions store their own copy of routineName and
  // never reference routine.items, so history stays intact.
  await db.routines.delete(id)
}

export function makeRoutineItem(exerciseId: string): RoutineItem {
  return { exerciseId, targetSets: 3, repLow: 8, repHigh: 12 }
}

// ---------- Sessions ----------

/** Build a fresh in-progress session, optionally pre-filled from a routine. */
export async function startSession(routine: Routine | null): Promise<Session> {
  const now = new Date().toISOString()
  let entries: SessionEntry[] = []
  if (routine) {
    entries = routine.items.map((item) => ({
      exerciseId: item.exerciseId,
      sets: Array.from({ length: Math.max(1, item.targetSets) }, () => ({
        weightKg: null,
        reps: null,
        rpe: null,
        type: 'working' as const,
        done: false,
      })),
    }))
  }
  return {
    id: uid('ses'),
    dateISO: now,
    startedAt: now,
    routineId: routine?.id ?? null,
    routineName: routine?.name,
    durationSeconds: 0,
    entries,
    finished: false,
  }
}

export async function saveSession(session: Session): Promise<void> {
  await db.sessions.put(session)
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id)
  await db.prs.where('id').startsWith(`${id}:`).delete()
}

export async function getFinishedSessions(): Promise<Session[]> {
  // IndexedDB doesn't index booleans, so filter in memory (history volumes
  // are small and this is plenty fast for a single user's lifetime of logs).
  const all = await db.sessions.toArray()
  return all
    .filter((s) => s.finished)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
}

/** The most recent finished session that contains a given exercise. */
export async function lastSessionForExercise(
  exerciseId: string,
  beforeISO?: string,
): Promise<{ session: Session; entry: SessionEntry } | null> {
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
}

// ---------- Body metrics ----------

export function newBodyMetric(data: Partial<BodyMetric> = {}): BodyMetric {
  return {
    id: uid('bm'),
    dateISO: data.dateISO ?? new Date().toISOString(),
    weightKg: data.weightKg ?? null,
    waistCm: data.waistCm ?? null,
    bodyFatPct: data.bodyFatPct ?? null,
  }
}

export async function saveBodyMetric(metric: BodyMetric): Promise<void> {
  await db.bodyMetrics.put(metric)
}

export async function deleteBodyMetric(id: string): Promise<void> {
  await db.bodyMetrics.delete(id)
}

// ---------- AI coach ----------

export async function addCoachMessage(
  role: 'user' | 'assistant',
  content: string,
): Promise<CoachMessage> {
  const msg: CoachMessage = {
    id: uid('msg'),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
  await db.coachMessages.add(msg)
  return msg
}

export async function clearCoachMessages(): Promise<void> {
  await db.coachMessages.clear()
}

// ---------- Apple Health import ----------

export interface HealthImportResult {
  workoutsTotal: number
  workoutsMatched: number
  workoutsUnmatched: number
  /** Workouts added to history as standalone sessions (backfill). */
  sessionsCreated: number
  bodyAdded: number
  bodySkipped: number
}

export interface HealthImportOptions {
  /**
   * Backfill: create a standalone history session for each workout that does
   * not overlap an existing one (date/duration/HR/calories, no set entries).
   */
  createSessions?: boolean
  /** Cumulative bytes read, for progress UI on large exports. */
  onProgress?: (bytesRead: number) => void
}

const APPLE_HEALTH_SOURCE = 'apple-health'

/** Build a finished, set-less session from an Apple Health workout. */
function appleHealthWorkoutToSession(w: HealthWorkout): Session {
  return {
    id: uid('ses'),
    dateISO: w.startISO,
    startedAt: w.startISO,
    routineId: null,
    routineName: formatActivityType(w.activityType),
    durationSeconds: w.durationSec,
    entries: [],
    finished: true,
    heartRateAvgBpm: w.hrAvgBpm,
    heartRateMaxBpm: w.hrMaxBpm,
    activeEnergyKcal: w.energyKcal,
    healthSource: APPLE_HEALTH_SOURCE,
    importedFrom: APPLE_HEALTH_SOURCE,
  }
}

/**
 * Parse an Apple Health `export.xml` and merge it in: attach per-workout heart
 * rate + active energy onto the sessions they overlap, add any bodyweight
 * records to the Body log (skipping dates already recorded), and optionally
 * backfill non-overlapping workouts as history sessions. Non-destructive.
 */
export async function importAppleHealth(
  xml: string,
  opts: HealthImportOptions = {},
): Promise<HealthImportResult> {
  return mergeHealthData(parseAppleHealthExport(xml), opts)
}

/**
 * Streaming variant: takes the file's ReadableStream so a real, multi-hundred-MB
 * `export.xml` never has to fit in a single string (V8 caps strings at ~512MB).
 */
export async function importAppleHealthStream(
  stream: ReadableStream<Uint8Array>,
  opts: HealthImportOptions = {},
): Promise<HealthImportResult> {
  const data = await parseAppleHealthStream(stream, { onProgress: opts.onProgress })
  return mergeHealthData(data, opts)
}

/**
 * Import from a File/Blob using slice-based reading (mobile-safe; does not rely
 * on `Blob.stream()`). This is what the UI uses.
 */
export async function importAppleHealthFile(
  file: Blob,
  opts: HealthImportOptions = {},
): Promise<HealthImportResult> {
  const data = await parseAppleHealthFile(file, { onProgress: opts.onProgress })
  return mergeHealthData(data, opts)
}

/** Remove every session that was backfilled from Apple Health. Returns count. */
export async function removeImportedAppleHealthSessions(): Promise<number> {
  const all = await db.sessions.toArray()
  const ids = all.filter((s) => s.importedFrom === APPLE_HEALTH_SOURCE).map((s) => s.id)
  await Promise.all(ids.map((id) => deleteSession(id)))
  return ids.length
}

async function mergeHealthData(
  data: AppleHealthData,
  opts: HealthImportOptions = {},
): Promise<HealthImportResult> {
  const sessions = (await db.sessions.toArray()).filter((s) => s.finished)
  const { patches, matched, unmatched, unmatchedWorkouts } = matchWorkoutsToSessions(
    data.workouts,
    sessions,
  )
  for (const [id, patch] of patches) {
    await db.sessions.update(id, patch as Partial<Session>)
  }

  // Backfill: turn workouts that overlap nothing into standalone sessions. This
  // is idempotent: on a re-import those sessions now exist and overlap the same
  // workouts, so they are enriched rather than duplicated.
  let sessionsCreated = 0
  if (opts.createSessions && unmatchedWorkouts.length > 0) {
    await db.sessions.bulkAdd(unmatchedWorkouts.map(appleHealthWorkoutToSession))
    sessionsCreated = unmatchedWorkouts.length
  }

  // One bodyweight entry per day; skip days that already have a record.
  const existingDays = new Set((await db.bodyMetrics.toArray()).map((b) => toDateInputValue(b.dateISO)))
  const byDay = new Map<string, { dateISO: string; weightKg: number }>()
  for (const b of data.bodyMass) byDay.set(toDateInputValue(b.dateISO), b)

  let bodyAdded = 0
  let bodySkipped = 0
  for (const [day, b] of byDay) {
    if (existingDays.has(day)) {
      bodySkipped++
      continue
    }
    await saveBodyMetric(newBodyMetric({ dateISO: b.dateISO, weightKg: b.weightKg }))
    bodyAdded++
  }

  return {
    workoutsTotal: data.workouts.length,
    workoutsMatched: matched,
    workoutsUnmatched: unmatched,
    sessionsCreated,
    bodyAdded,
    bodySkipped,
  }
}
