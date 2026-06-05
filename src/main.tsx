import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { db } from './db/db'
import { getSettings, initDatabase, updateSettings } from './db/repo'
import { requestPersistentStorage } from './lib/storage'
import { pushCloudBackup } from './lib/cloudBackup'

// Dev-only handle so e2e tests can close the connection and wipe the DB for a
// clean slate. Guarded by DEV, so it never ships in the production build.
if (import.meta.env.DEV) {
  ;(window as unknown as { __rackDb?: typeof db }).__rackDb = db
}

// Ask the browser to keep our IndexedDB data from being evicted. Fire and
// forget: it must not block first paint.
void requestPersistentStorage()

// Auto cloud-backup on load, at most ~once a day, if the user has configured a
// passphrase + endpoint. Silent and non-blocking: manual backup in Settings
// surfaces any errors.
async function maybeAutoBackup() {
  try {
    const s = await getSettings()
    if (!s.syncEndpoint || !s.syncPassphrase) return
    const last = s.lastCloudBackupAt ? new Date(s.lastCloudBackupAt).getTime() : 0
    if (Date.now() - last < 12 * 60 * 60 * 1000) return
    await pushCloudBackup({ endpoint: s.syncEndpoint, passphrase: s.syncPassphrase })
    await updateSettings({ lastCloudBackupAt: new Date().toISOString() })
  } catch {
    /* silent: the user can back up manually */
  }
}

// Seed on first run before mounting so screens render with data immediately.
initDatabase().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  void maybeAutoBackup()
})
