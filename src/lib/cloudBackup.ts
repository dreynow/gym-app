import { buildBackup, importBackup } from './backup'

/**
 * Encrypted cloud backup. Everything is encrypted on-device with the user's
 * passphrase (AES-GCM, key stretched from the passphrase via PBKDF2), so the
 * server only ever stores opaque ciphertext. The storage slot id is derived
 * from the passphrase too, so the same passphrase always maps to the same
 * backup without the server knowing the passphrase. Single-user, no accounts.
 */

const PBKDF2_ITERATIONS = 150_000
const KEY_ID_NAMESPACE = 'rack-cloud-backup-id-v1:'

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

/** Cast a byte array to BufferSource (TS 5.7's typed-array generics are picky). */
function bs(u: Uint8Array): BufferSource {
  return u as unknown as BufferSource
}

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', bs(utf8(passphrase)), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: bs(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Stable, unguessable storage id for a passphrase (server sees only this). */
export async function deriveBackupId(passphrase: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bs(utf8(KEY_ID_NAMESPACE + passphrase)))
  return toBase64(new Uint8Array(hash)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)
}

/** Encrypt a string to a base64 package: salt(16) | iv(12) | ciphertext. */
export async function encryptBackupBlob(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(passphrase, salt)
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv) }, key, bs(utf8(plaintext))),
  )
  const pkg = new Uint8Array(salt.length + iv.length + ct.length)
  pkg.set(salt, 0)
  pkg.set(iv, salt.length)
  pkg.set(ct, salt.length + iv.length)
  return toBase64(pkg)
}

export async function decryptBackupBlob(pkgBase64: string, passphrase: string): Promise<string> {
  const pkg = fromBase64(pkgBase64)
  const salt = pkg.slice(0, 16)
  const iv = pkg.slice(16, 28)
  const ct = pkg.slice(28)
  const key = await deriveAesKey(passphrase, salt)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(iv) }, key, bs(ct))
  return new TextDecoder().decode(pt)
}

export interface CloudBackupConfig {
  endpoint: string
  passphrase: string
}

/** Encrypt the full backup and store it in the cloud. */
export async function pushCloudBackup(cfg: CloudBackupConfig): Promise<void> {
  const backup = await buildBackup()
  const blob = await encryptBackupBlob(JSON.stringify(backup), cfg.passphrase)
  const id = await deriveBackupId(cfg.passphrase)
  const res = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'put', id, blob }),
  })
  if (!res.ok) throw new Error(`Backup failed (HTTP ${res.status}). Check the endpoint URL.`)
}

export interface RestoreResult {
  exportedAt: string | null
}

/**
 * Fetch the cloud backup, decrypt it with the passphrase, and replace local
 * data. Returns null if there is no backup yet for this passphrase.
 */
export async function restoreCloudBackup(cfg: CloudBackupConfig): Promise<RestoreResult | null> {
  const id = await deriveBackupId(cfg.passphrase)
  const res = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'get', id }),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Restore failed (HTTP ${res.status}). Check the endpoint URL.`)
  const { blob } = (await res.json()) as { blob?: string | null }
  if (!blob) return null
  let json: string
  try {
    json = await decryptBackupBlob(blob, cfg.passphrase)
  } catch {
    throw new Error('Could not decrypt. Wrong passphrase, or the backup is corrupted.')
  }
  await importBackup(json, 'replace')
  let exportedAt: string | null = null
  try {
    exportedAt = (JSON.parse(json) as { exportedAt?: string }).exportedAt ?? null
  } catch {
    /* ignore */
  }
  return { exportedAt }
}
