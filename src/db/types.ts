/**
 * Core domain types for Ironlog.
 *
 * These mirror the persisted shape in IndexedDB (via Dexie). Keep them plain
 * and serialisable so JSON export/import is lossless and a future cloud sync
 * layer can ship the same objects over the wire without translation.
 */

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'fullbody'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other'

export interface Exercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  isCustom: boolean
  defaultRestSeconds: number
  /** Most exercises use a barbell + plates; flags the plate calculator. */
  usesBarbell?: boolean
  notes?: string
  /** Soft-archive instead of hard delete so historical sessions stay intact. */
  archived?: boolean
}

export interface RoutineItem {
  exerciseId: string
  targetSets: number
  repLow: number
  repHigh: number
  notes?: string
}

export interface Routine {
  id: string
  name: string
  /** Optional grouping label e.g. "Upper / Lower". */
  category?: string
  items: RoutineItem[]
  /** Display order across the routines list; lower comes first. */
  order: number
  archived?: boolean
  createdAt: string
  updatedAt: string
}

export type SetType = 'warmup' | 'working' | 'drop' | 'failure'

export interface WorkoutSet {
  weightKg: number | null
  reps: number | null
  rpe: number | null
  type: SetType
  done: boolean
}

export interface SessionEntry {
  exerciseId: string
  notes?: string
  sets: WorkoutSet[]
}

export interface Session {
  id: string
  dateISO: string
  routineId: string | null
  routineName?: string
  durationSeconds: number
  entries: SessionEntry[]
  /** False while a workout is in progress, true once finished and saved. */
  finished: boolean
  startedAt: string

  /**
   * Optional wearable/health data merged in from an external source (e.g. an
   * Apple Health export). Null/undefined when not available. Kept on the
   * session so a future cloud sync ships them as-is.
   */
  heartRateAvgBpm?: number | null
  heartRateMaxBpm?: number | null
  activeEnergyKcal?: number | null
  /** Provenance of the merged health data, e.g. "apple-health". */
  healthSource?: string
  /**
   * Set when the whole session was created by an import (not logged in-app),
   * e.g. "apple-health" for a backfilled Apple Health workout. Such sessions
   * carry date/duration/HR/calories but no set-level entries, and can be bulk
   * removed. Distinct from `healthSource`, which only marks enrichment data on
   * a normally-logged session.
   */
  importedFrom?: string
}

export interface BodyMetric {
  id: string
  dateISO: string
  weightKg: number | null
  waistCm: number | null
  bodyFatPct: number | null
}

export type Units = 'kg' | 'lb'

export interface Settings {
  id: 'singleton'
  units: Units
  defaultBarKg: number
  defaultRestSeconds: number
  theme: 'dark' | 'light'
  /** Available plate denominations (per single plate) used by the calculator. */
  plateInventoryKg: number[]
  /** Anthropic API key for the in-app AI coach. Stored only on this device. */
  anthropicApiKey?: string
  /** Claude model id the coach uses. */
  coachModel?: string
}

/** One turn in the AI coach conversation, persisted so it survives refreshes. */
export interface CoachMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

/** A detected personal record, surfaced as a badge in the UI. */
export type PrKind = 'weight' | 'e1rm' | 'volume'

export interface PrRecord {
  id: string
  exerciseId: string
  kind: PrKind
  value: number
  dateISO: string
  sessionId: string
}
