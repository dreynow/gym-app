import { db, DEFAULT_SETTINGS, SETTINGS_ID } from '../db/db'
import type {
  BodyMetric,
  Exercise,
  PrRecord,
  Routine,
  Session,
  Settings,
} from '../db/types'

const BACKUP_VERSION = 1
const BACKUP_KIND = 'ironlog-backup'

export interface BackupFile {
  kind: typeof BACKUP_KIND
  version: number
  exportedAt: string
  data: {
    exercises: Exercise[]
    routines: Routine[]
    sessions: Session[]
    bodyMetrics: BodyMetric[]
    settings: Settings[]
    prs: PrRecord[]
  }
}

export async function buildBackup(): Promise<BackupFile> {
  const [exercises, routines, sessions, bodyMetrics, settings, prs] = await Promise.all([
    db.exercises.toArray(),
    db.routines.toArray(),
    db.sessions.toArray(),
    db.bodyMetrics.toArray(),
    db.settings.toArray(),
    db.prs.toArray(),
  ])
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { exercises, routines, sessions, bodyMetrics, settings, prs },
  }
}

/** Trigger a download of the full backup as a timestamped JSON file. */
export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `ironlog-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export type ImportMode = 'replace' | 'merge'

export interface ImportResult {
  exercises: number
  routines: number
  sessions: number
  bodyMetrics: number
}

function isBackup(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.kind === BACKUP_KIND && typeof v.data === 'object' && v.data !== null
}

/**
 * Import a backup. `replace` wipes existing data first; `merge` upserts by id,
 * keeping anything not present in the file. Returns counts for a summary.
 */
export async function importBackup(json: string, mode: ImportMode): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!isBackup(parsed)) {
    throw new Error('That file is not a Rack backup.')
  }
  const { data } = parsed

  await db.transaction(
    'rw',
    [db.exercises, db.routines, db.sessions, db.bodyMetrics, db.settings, db.prs],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.exercises.clear(),
          db.routines.clear(),
          db.sessions.clear(),
          db.bodyMetrics.clear(),
          db.prs.clear(),
        ])
      }
      await db.exercises.bulkPut(data.exercises ?? [])
      await db.routines.bulkPut(data.routines ?? [])
      await db.sessions.bulkPut(data.sessions ?? [])
      await db.bodyMetrics.bulkPut(data.bodyMetrics ?? [])
      await db.prs.bulkPut(data.prs ?? [])
      // Settings is a singleton: always take the imported one if present.
      const importedSettings = (data.settings ?? [])[0]
      if (importedSettings) {
        await db.settings.put({ ...DEFAULT_SETTINGS, ...importedSettings, id: SETTINGS_ID })
      }
    },
  )

  return {
    exercises: data.exercises?.length ?? 0,
    routines: data.routines?.length ?? 0,
    sessions: data.sessions?.length ?? 0,
    bodyMetrics: data.bodyMetrics?.length ?? 0,
  }
}
