import { useRef, useState } from 'react'
import { updateSettings } from '../db/repo'
import type { Units } from '../db/types'
import { useSettings } from '../hooks/useSettings'
import {
  downloadBackup,
  importBackup,
  type ImportMode,
  type ImportResult,
} from '../lib/backup'
import { num } from '../lib/format'
import { Header } from '../components/Header'
import {
  Button,
  Card,
  Field,
  SegmentedControl,
  Sheet,
  Stepper,
  TextInput,
} from '../components/ui'
import { IconDownload, IconPlus, IconUpload, IconX } from '../components/Icons'

export function SettingsScreen() {
  const settings = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newPlate, setNewPlate] = useState('')

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
              <span className="text-sm text-faint w-12 tabular-nums">
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
          <p className="text-xs text-faint -mt-1">
            Used by the plate calculator to work out what to load per side.
          </p>
          <div className="flex flex-wrap gap-2">
            {settings.plateInventoryKg.map((kg) => (
              <span
                key={kg}
                className="inline-flex items-center gap-1.5 bg-ink-700 rounded-lg pl-3 pr-1.5 py-1.5 text-sm font-medium"
              >
                {num(kg)}
                <button
                  onClick={() => removePlate(kg)}
                  aria-label={`Remove ${kg}kg plate`}
                  className="h-5 w-5 grid place-items-center rounded-md bg-ink-600 active:bg-ink-500"
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
          <p className="text-xs text-faint -mt-1">
            Everything is stored only on this device. Export a backup regularly,
            and use it to move your history to another device.
          </p>
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

        <Section title="About">
          <p className="text-sm text-muted">
            Ironlog is a local-first, offline workout tracker. No account, no
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
        <p className="text-sm text-muted">
          <strong className="text-fg">Merge</strong> adds and updates records from
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
          <div className="space-y-1 text-sm text-muted">
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
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">{title}</h2>
      {children}
    </Card>
  )
}
