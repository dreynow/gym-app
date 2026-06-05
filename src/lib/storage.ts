/**
 * On-device storage durability. Rack keeps everything in IndexedDB, so we ask
 * the browser to mark that storage "persistent": it then won't be cleared under
 * disk pressure, and on iOS it is exempt from the ~7-day eviction of unused
 * site storage. Best-effort and safe to call repeatedly.
 */

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

/** True for iOS/iPadOS, where "Add to Home Screen" is what truly protects data. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOSUA = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ reports as Mac; detect via touch support.
  const iPadOS = ua.includes('Macintosh') && 'ontouchend' in document
  return iOSUA || iPadOS
}

/** True when launched as an installed PWA (home-screen / standalone). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}
