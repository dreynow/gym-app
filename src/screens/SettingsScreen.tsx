import { useEffect, useRef, useState } from 'react'
import {
  importAppleHealthFile,
  removeImportedAppleHealthSessions,
  updateSettings,
  type HealthImportResult,
} from '../db/repo'
import type { Units } from '../db/types'
import { useSettings } from '../hooks/useSettings'
import {
  downloadBackup,
  importBackup,
  type ImportMode,
  type ImportResult,
} from '../lib/backup'
import { num } from '../lib/format'
import { navigate } from '../lib/router'
import { useConfirm } from '../components/ConfirmDialog'
import { COACH_MODELS, DEFAULT_COACH_MODEL } from '../lib/coach'
import { pushCloudBackup, restoreCloudBackup } from '../lib/cloudBackup'
import {
  isIOS,
  isStandalone,
  isStoragePersisted,
  requestPersistentStorage,
} from '../lib/storage'
import { Header } from '../components/Header'
import {
  Button,
  Card,
  cx,
  Field,
  SegmentedControl,
  Sheet,
  Stepper,
  TextInput,
} from '../components/ui'
import {
  IconCheck,
  IconDownload,
  IconHeart,
  IconLibrary,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconUpload,
  IconX,
} from '../components/Icons'

export function SettingsScreen() {
  const settings = useSettings()
  const confirm = useConfirm()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newPlate, setNewPlate] = useState('')
  const healthFileRef = useRef<HTMLInputElement>(null)
  const [healthBusy, setHealthBusy] = useState(false)
  const [healthResult, setHealthResult] = useState<HealthImportResult | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [backfillWorkouts, setBackfillWorkouts] = useState(true)
  const [removedMsg, setRemovedMsg] = useState<string | null>(null)
  const [healthProgress, setHealthProgress] = useState<number | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [keySaved, setKeySaved] = useState(false)
  const [cloudEndpoint, setCloudEndpoint] = useState('')
  const [cloudPass, setCloudPass] = useState('')
  const [cloudBusy, setCloudBusy] = useState<'idle' | 'backup' | 'restore'>('idle')
  const [cloudMsg, setCloudMsg] = useState<string | null>(null)
  const [cloudErr, setCloudErr] = useState<string | null>(null)

  useEffect(() => {
    void isStoragePersisted().then(setPersisted)
  }, [])

  useEffect(() => {
    setKeyInput(settings.anthropicApiKey ?? '')
  }, [settings.anthropicApiKey])

  useEffect(() => {
    setCloudEndpoint(settings.syncEndpoint ?? '')
    setCloudPass(settings.syncPassphrase ?? '')
  }, [settings.syncEndpoint, settings.syncPassphrase])

  async function backupNow() {
    const endpoint = cloudEndpoint.trim()
    const passphrase = cloudPass
    if (!endpoint || !passphrase) {
      setCloudErr('Enter the endpoint URL and a passphrase first.')
      return
    }
    setCloudErr(null)
    setCloudMsg(null)
    setCloudBusy('backup')
    try {
      await updateSettings({ syncEndpoint: endpoint, syncPassphrase: passphrase })
      await pushCloudBackup({ endpoint, passphrase })
      await updateSettings({ lastCloudBackupAt: new Date().toISOString() })
      setCloudMsg('Backed up to the cloud.')
    } catch (e) {
      setCloudErr(e instanceof Error ? e.message : 'Backup failed.')
    } finally {
      setCloudBusy('idle')
    }
  }

  async function restoreNow() {
    const endpoint = cloudEndpoint.trim()
    const passphrase = cloudPass
    if (!endpoint || !passphrase) {
      setCloudErr('Enter the endpoint URL and your passphrase first.')
      return
    }
    if (
      !(await confirm({
        title: 'Restore from cloud',
        message:
          'This replaces ALL data on this device with your cloud backup. Continue?',
        confirmLabel: 'Restore',
        danger: true,
      }))
    )
      return
    setCloudErr(null)
    setCloudMsg(null)
    setCloudBusy('restore')
    try {
      await updateSettings({ syncEndpoint: endpoint, syncPassphrase: passphrase })
      const res = await restoreCloudBackup({ endpoint, passphrase })
      if (!res) setCloudMsg('No backup found for that passphrase yet.')
      else
        setCloudMsg(
          `Restored backup from ${res.exportedAt ? new Date(res.exportedAt).toLocaleString() : 'the cloud'}.`,
        )
    } catch (e) {
      setCloudErr(e instanceof Error ? e.message : 'Restore failed.')
    } finally {
      setCloudBusy('idle')
    }
  }

  function addPlate() {
    const v = Number(newPlate)
    if (!Number.isFinite(v) || v <= 0) return
    if (settings.plateInventoryKg.includes(v)) {
      setNewPlate('')
      return
    }
    const next = [...settings.plateInventoryKg, v].sort((a, b) => b - a)
    void updateSettings({ plateInventoryKg: next })
    setNewPlate('')
  }

  function removePlate(kg: number) {
    void updateSettings({
      plateInventoryKg: settings.plateInventoryKg.filter((p) => p !== kg),
    })
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setError(null)
      setPendingImport(String(reader.result))
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function runImport(mode: ImportMode) {
    if (!pendingImport) return
    try {
      const res = await importBackup(pendingImport, mode)
      setResult(res)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setPendingImport(null)
    }
  }

  async function onHealthFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setHealthError(null)
    setHealthResult(null)
    setRemovedMsg(null)
    setHealthBusy(true)
    setHealthProgress(0)
    try {
      // Read the file in slices rather than whole: a real export.xml can be
      // hundreds of MB (past V8's max string length), and slice-based reading
      // is the mobile-safe path (iOS Safari File.stream() is unreliable).
      const total = file.size || 1
      const res = await importAppleHealthFile(file, {
        createSessions: backfillWorkouts,
        onProgress: (bytes) => setHealthProgress(Math.min(99, Math.round((bytes / total) * 100))),
      })
      setHealthResult(res)
    } catch {
      setHealthError('Could not read that file. Pick the export.xml from your Apple Health export.')
    } finally {
      setHealthBusy(false)
      setHealthProgress(null)
    }
  }

  async function removeImportedWorkouts() {
    if (
      !(await confirm({
        title: 'Remove imported workouts',
        message:
          'Remove all workouts that were imported from Apple Health? Workouts you logged in Rack are kept.',
        confirmLabel: 'Remove',
        danger: true,
      }))
    )
      return
    setRemovedMsg(null)
    const n = await removeImportedAppleHealthSessions()
    setHealthResult(null)
    setRemovedMsg(`Removed ${n} imported ${n === 1 ? 'workout' : 'workouts'}.`)
  }

  return (
    <>
      <Header title="Settings" back={{ name: 'routines' }} />

      <div className="p-4 space-y-6">
        <Section title="Units & defaults">
          <Field label="Weight units">
            <SegmentedControl<Units>
              value={settings.units}
              onChange={(units) => void updateSettings({ units })}
              options={[
                { value: 'kg', label: 'Kilograms (kg)' },
                { value: 'lb', label: 'Pounds (lb)' },
              ]}
              className="w-full"
            />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-sm">Default rest timer</span>
            <div className="flex items-center gap-3">
              <Stepper
                value={settings.defaultRestSeconds}
                min={0}
                max={600}
                step={15}
                onChange={(v) => void updateSettings({ defaultRestSeconds: v })}
              />
              <span className="text-sm text-fg-3 w-12 tabular-nums">
                {Math.floor(settings.defaultRestSeconds / 60)}:
                {String(settings.defaultRestSeconds % 60).padStart(2, '0')}
              </span>
            </div>
          </div>
          <Field label="Default bar weight (kg)">
            <TextInput
              type="number"
              inputMode="decimal"
              value={settings.defaultBarKg}
              onChange={(e) =>
                void updateSettings({ defaultBarKg: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </Field>
        </Section>

        <Section title="Plate inventory (per plate, kg)">
          <p className="text-xs text-fg-3 -mt-1">
            Used by the plate calculator to work out what to load per side.
          </p>
          <div className="flex flex-wrap gap-2">
            {settings.plateInventoryKg.map((kg) => (
              <span
                key={kg}
                className="inline-flex items-center gap-1.5 bg-surface-3 rounded-lg pl-3 pr-1.5 py-1.5 text-sm font-medium"
              >
                {num(kg)}
                <button
                  onClick={() => removePlate(kg)}
                  aria-label={`Remove ${kg}kg plate`}
                  className="h-5 w-5 grid place-items-center rounded-md bg-surface-4 active:bg-surface-4"
                >
                  <IconX size={13} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <TextInput
              type="number"
              inputMode="decimal"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="Add plate, e.g. 1.25"
            />
            <Button variant="secondary" onClick={addPlate} disabled={!newPlate}>
              <IconPlus size={18} /> Add
            </Button>
          </div>
        </Section>

        <Section title="Your data">
          <p className="text-xs text-fg-3 -mt-1">
            Everything is stored only on this device. Export a backup regularly,
            and use it to move your history to another device.
          </p>

          <div className="bg-surface-2 rounded-md p-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={cx(
                  'size-2 rounded-full',
                  persisted ? 'bg-volt' : 'bg-warning',
                )}
              />
              <span className="text-fg-1 font-medium">
                {persisted == null
                  ? 'Checking storage…'
                  : persisted
                    ? 'On-device storage is persistent'
                    : 'Storage is not yet persistent'}
              </span>
            </div>
            {persisted === false && (
              <>
                <p className="text-xs text-fg-3 mt-1">
                  Without this, the browser may clear your data under storage
                  pressure. {isIOS() && !isStandalone()
                    ? 'On iPhone, add Rack to your Home Screen (Share, then Add to Home Screen) to keep data safe.'
                    : ''}
                </p>
                <button
                  type="button"
                  onClick={() => void requestPersistentStorage().then(setPersisted)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-volt-dim active:text-volt"
                >
                  <IconCheck size={14} /> Make storage persistent
                </button>
              </>
            )}
          </div>

          <Button variant="secondary" full onClick={() => void downloadBackup()}>
            <IconDownload size={18} /> Export backup (JSON)
          </Button>
          <Button variant="secondary" full onClick={() => fileRef.current?.click()}>
            <IconUpload size={18} /> Import backup (JSON)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFileChosen}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </Section>

        <Section title="Cloud backup">
          <p className="text-xs text-fg-3 -mt-1">
            Back up to your own server. Your data is encrypted on this device
            with your passphrase before it leaves, so the server only stores
            unreadable ciphertext. Keep the passphrase safe: without it, the
            backup cannot be restored. Backs up automatically about once a day.
          </p>
          <Field label="Backup endpoint URL">
            <TextInput
              type="url"
              autoComplete="off"
              value={cloudEndpoint}
              placeholder="https://...lambda-url.aws/"
              onChange={(e) => setCloudEndpoint(e.target.value)}
            />
          </Field>
          <Field label="Passphrase">
            <TextInput
              type="password"
              autoComplete="off"
              value={cloudPass}
              placeholder="A phrase only you know"
              onChange={(e) => setCloudPass(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button
              variant="primary"
              full
              disabled={cloudBusy !== 'idle'}
              onClick={() => void backupNow()}
            >
              <IconUpload size={18} /> {cloudBusy === 'backup' ? 'Backing up…' : 'Back up now'}
            </Button>
            <Button
              variant="secondary"
              full
              disabled={cloudBusy !== 'idle'}
              onClick={() => void restoreNow()}
            >
              <IconDownload size={18} /> {cloudBusy === 'restore' ? 'Restoring…' : 'Restore'}
            </Button>
          </div>
          {settings.lastCloudBackupAt && (
            <p className="text-xs text-fg-3">
              Last backed up {new Date(settings.lastCloudBackupAt).toLocaleString()}.
            </p>
          )}
          {cloudMsg && <p className="text-sm text-volt-dim">{cloudMsg}</p>}
          {cloudErr && <p className="text-sm text-danger">{cloudErr}</p>}
        </Section>

        <Section title="Apple Health">
          <p className="text-xs text-fg-3 -mt-1">
            On your iPhone: Health app, tap your photo, then Export All Health
            Data. Unzip the file and import export.xml here. Heart rate and active
            calories attach to the workouts they overlap, and bodyweight entries
            are added to your Body log.
          </p>

          <button
            type="button"
            onClick={() => setBackfillWorkouts((v) => !v)}
            className="w-full flex items-start gap-3 text-left bg-surface-2 rounded-md p-3 active:bg-surface-3"
          >
            <span
              className={cx(
                'mt-0.5 size-5 shrink-0 rounded-[6px] border flex items-center justify-center',
                backfillWorkouts ? 'bg-volt border-volt text-on-volt' : 'border-line-2 text-transparent',
              )}
            >
              <IconCheck size={14} />
            </span>
            <span className="text-sm">
              <span className="text-fg-1 font-medium">Add workouts to history</span>
              <span className="block text-xs text-fg-3">
                Backfills past workouts as sessions (date, duration, heart rate,
                calories) so your calendar and streaks fill in. Apple Health has
                no set data, so these carry no lifts.
              </span>
            </span>
          </button>

          <Button
            variant="secondary"
            full
            disabled={healthBusy}
            onClick={() => healthFileRef.current?.click()}
          >
            <IconHeart size={18} />{' '}
            {healthBusy
              ? `Importing… ${healthProgress ?? 0}%`
              : 'Import from Apple Health (export.xml)'}
          </Button>
          <input
            ref={healthFileRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={onHealthFileChosen}
          />
          {healthError && <p className="text-sm text-danger">{healthError}</p>}
          {removedMsg && <p className="text-sm text-fg-2">{removedMsg}</p>}
          {healthResult && (
            <div className="text-sm text-fg-2 bg-surface-2 rounded-md p-3">
              <p className="text-fg-1 font-medium mb-1">Apple Health imported</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>
                  {healthResult.workoutsMatched} of {healthResult.workoutsTotal} workouts matched
                  to your sessions
                  {healthResult.workoutsUnmatched > 0 &&
                    ` (${healthResult.workoutsUnmatched} had no matching session)`}
                </li>
                {healthResult.sessionsCreated > 0 && (
                  <li>{healthResult.sessionsCreated} workouts added to history</li>
                )}
                <li>
                  {healthResult.bodyAdded} bodyweight entries added
                  {healthResult.bodySkipped > 0 && `, ${healthResult.bodySkipped} already on file`}
                </li>
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={removeImportedWorkouts}
            className="inline-flex items-center gap-1.5 text-xs text-fg-3 active:text-fg-2"
          >
            <IconTrash size={14} /> Remove imported workouts
          </button>
        </Section>

        <Section title="AI coach">
          <p className="text-xs text-fg-3 -mt-1">
            Chat with a coach that can see your sessions, PRs, and weekly volume.
            Your Anthropic API key is stored only on this device and used to call
            Claude directly. Get a key at console.anthropic.com.
          </p>
          <Field label="Anthropic API key">
            <TextInput
              type="password"
              autoComplete="off"
              value={keyInput}
              placeholder="sk-ant-..."
              onChange={(e) => {
                setKeyInput(e.target.value)
                setKeySaved(false)
              }}
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                void updateSettings({ anthropicApiKey: keyInput.trim() || undefined })
                setKeySaved(true)
              }}
            >
              Save key
            </Button>
            {keySaved && <span className="text-xs text-volt-dim">Saved</span>}
            {settings.anthropicApiKey && (
              <button
                type="button"
                className="text-xs text-fg-3 active:text-fg-2"
                onClick={() => {
                  setKeyInput('')
                  setKeySaved(false)
                  void updateSettings({ anthropicApiKey: undefined })
                }}
              >
                Remove key
              </button>
            )}
          </div>
          <Field label="Model">
            <SegmentedControl<string>
              value={settings.coachModel || DEFAULT_COACH_MODEL}
              onChange={(m) => void updateSettings({ coachModel: m })}
              options={COACH_MODELS.map((m) => ({ value: m.id, label: m.label.split(' ')[0] }))}
              className="w-full"
            />
          </Field>
          <Button variant="secondary" full onClick={() => navigate({ name: 'coach' })}>
            <IconSparkles size={18} /> Open coach
          </Button>
        </Section>

        <Section title="Exercises">
          <Button variant="secondary" full onClick={() => navigate({ name: 'exercises' })}>
            <IconLibrary size={18} /> Exercise library
          </Button>
        </Section>

        <Section title="About">
          <p className="text-sm text-fg-2">
            Rack is a local-first, offline workout tracker. No account, no
            cloud, no tracking. Version 1.0.
          </p>
        </Section>
      </div>

      {/* Choose import mode */}
      <Sheet
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title="Import backup"
        footer={
          <div className="flex gap-2">
            <Button variant="subtle" full onClick={() => void runImport('merge')}>
              Merge
            </Button>
            <Button variant="danger" full onClick={() => void runImport('replace')}>
              Replace all
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-2">
          <strong className="text-fg-1">Merge</strong> adds and updates records from
          the file, keeping what you already have.
          <br />
          <br />
          <strong className="text-danger">Replace all</strong> wipes current data
          first, then imports the file. This cannot be undone.
        </p>
      </Sheet>

      {/* Import result */}
      <Sheet open={result !== null} onClose={() => setResult(null)} title="Import complete">
        {result && (
          <div className="space-y-1 text-sm text-fg-2">
            <p>Imported successfully:</p>
            <ul className="list-disc pl-5 mt-2 space-y-0.5">
              <li>{result.exercises} exercises</li>
              <li>{result.routines} routines</li>
              <li>{result.sessions} sessions</li>
              <li>{result.bodyMetrics} body measurements</li>
            </ul>
            <Button variant="primary" full className="mt-4" onClick={() => setResult(null)}>
              Done
            </Button>
          </div>
        )}
      </Sheet>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-sm font-semibold text-fg-2 uppercase tracking-wider">{title}</h2>
      {children}
    </Card>
  )
}
