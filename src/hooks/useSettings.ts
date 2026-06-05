import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS, SETTINGS_ID } from '../db/db'
import type { Settings } from '../db/types'

/** Live settings, falling back to defaults until the DB resolves. */
export function useSettings(): Settings {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID), [])
  return settings ?? DEFAULT_SETTINGS
}
