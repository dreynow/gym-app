import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { db } from './db/db'
import { initDatabase, runAutoBackup } from './db/repo'
import { requestPersistentStorage } from './lib/storage'

// Dev-only handle so e2e tests can close the connection and wipe the DB for a
// clean slate. Guarded by DEV, so it never ships in the production build.
if (import.meta.env.DEV) {
  ;(window as unknown as { __rackDb?: typeof db }).__rackDb = db
}

// Ask the browser to keep our IndexedDB data from being evicted. Fire and
// forget: it must not block first paint.
void requestPersistentStorage()

// Daily safety-net backup on load (at most once every 12h). Workouts also
// trigger an immediate backup on finish; both are silent and non-blocking.
const DAILY_MS = 12 * 60 * 60 * 1000

// Seed on first run before mounting so screens render with data immediately.
initDatabase().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  void runAutoBackup(DAILY_MS)
})
