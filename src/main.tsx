import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { initDatabase } from './db/repo'
import { requestPersistentStorage } from './lib/storage'

// Ask the browser to keep our IndexedDB data from being evicted. Fire and
// forget: it must not block first paint.
void requestPersistentStorage()

// Seed on first run before mounting so screens render with data immediately.
initDatabase().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
