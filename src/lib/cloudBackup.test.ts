import { describe, it, expect } from 'vitest'
import { decryptBackupBlob, deriveBackupId, encryptBackupBlob } from './cloudBackup'

describe('cloud backup encryption', () => {
  it('round-trips a string through encrypt/decrypt', async () => {
    const plain = JSON.stringify({ hello: 'world', n: 42 })
    const blob = await encryptBackupBlob(plain, 'correct horse battery staple')
    expect(blob).not.toContain('hello') // ciphertext, not plaintext
    const back = await decryptBackupBlob(blob, 'correct horse battery staple')
    expect(back).toBe(plain)
  })

  it('fails to decrypt with the wrong passphrase', async () => {
    const blob = await encryptBackupBlob('secret', 'passphrase-one')
    await expect(decryptBackupBlob(blob, 'passphrase-two')).rejects.toBeTruthy()
  })

  it('derives a stable, unguessable id per passphrase', async () => {
    const a = await deriveBackupId('my passphrase')
    const b = await deriveBackupId('my passphrase')
    const c = await deriveBackupId('other passphrase')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^[a-zA-Z0-9]{32}$/)
  })
})
