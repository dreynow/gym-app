import Dexie, { type EntityTable } from 'dexie'
import type {
  BodyMetric,
  Exercise,
  PrRecord,
  Routine,
  Session,
  Settings,
} from './types'

/**
 * The single IndexedDB database for the whole app. Bumping the version number
 * and adding a new `.stores()` call is how we migrate schema going forward;
 * Dexie keeps old data intact across upgrades.
 */
export class IronlogDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  sessions!: EntityTable<Session, 'id'>
  bodyMetrics!: EntityTable<BodyMetric, 'id'>
  settings!: EntityTable<Settings, 'id'>
  prs!: EntityTable<PrRecord, 'id'>

  constructor() {
    super('ironlog')
    this.version(1).stores({
      // Only index the fields we actually query/sort on.
      exercises: 'id, name, muscleGroup, equipment, archived',
      routines: 'id, order, archived',
      sessions: 'id, dateISO, finished, routineId',
      bodyMetrics: 'id, dateISO',
      settings: 'id',
      prs: 'id, exerciseId, kind',
    })
  }
}

export const db = new IronlogDB()

export const SETTINGS_ID = 'singleton' as const

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  units: 'kg',
  defaultBarKg: 20,
  defaultRestSeconds: 120,
  theme: 'dark',
  plateInventoryKg: [25, 20, 15, 10, 5, 2.5, 1.25],
}
