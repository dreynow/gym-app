import { useEffect, useState } from 'react'
import { archiveExercise, newExercise, saveExercise } from '../db/repo'
import type { Equipment, Exercise, MuscleGroup } from '../db/types'
import {
  EQUIPMENT,
  EQUIPMENT_LABEL,
  MUSCLE_GROUPS,
  MUSCLE_LABEL,
} from '../lib/labels'
import { Button, Field, Sheet, TextInput } from './ui'
import { useConfirm } from './ConfirmDialog'
import { Select } from './Select'

/** Create or edit an exercise. Pass `existing` to edit; omit to create new.
 * Calls `onSaved` with the saved exercise (handy for "create then pick"). */
export function ExerciseForm({
  open,
  onClose,
  existing,
  initialName,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  existing?: Exercise
  initialName?: string
  onSaved?: (exercise: Exercise) => void
}) {
  const confirm = useConfirm()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup>('fullbody')
  const [equipment, setEquipment] = useState<Equipment>('other')
  const [rest, setRest] = useState(120)
  const [usesBarbell, setUsesBarbell] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(existing?.name ?? initialName ?? '')
    setMuscle(existing?.muscleGroup ?? 'fullbody')
    setEquipment(existing?.equipment ?? 'other')
    setRest(existing?.defaultRestSeconds ?? 120)
    setUsesBarbell(existing?.usesBarbell ?? false)
  }, [open, existing, initialName])

  // Auto-suggest the barbell flag when the equipment is a barbell.
  useEffect(() => {
    if (equipment === 'barbell') setUsesBarbell(true)
  }, [equipment])

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    const exercise: Exercise = existing
      ? { ...existing, name: trimmed, muscleGroup: muscle, equipment, defaultRestSeconds: rest, usesBarbell }
      : newExercise({ name: trimmed, muscleGroup: muscle, equipment, defaultRestSeconds: rest, usesBarbell })
    await saveExercise(exercise)
    onSaved?.(exercise)
    onClose()
  }

  async function archive() {
    if (!existing) return
    if (
      !(await confirm({
        message: `Archive "${existing.name}"? It stays in past workouts but is hidden from pickers.`,
        confirmLabel: 'Archive',
      }))
    )
      return
    await archiveExercise(existing.id)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={existing ? 'Edit exercise' : 'New exercise'}
      footer={
        <div className="space-y-2">
          <Button variant="primary" full onClick={save} disabled={!name.trim()}>
            {existing ? 'Save changes' : 'Create exercise'}
          </Button>
          {existing && (
            <Button variant="danger" full onClick={archive}>
              Archive exercise
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Incline Bench Press"
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Muscle group">
            <Select
              value={muscle}
              onChange={setMuscle}
              options={MUSCLE_GROUPS.map((m) => ({ value: m, label: MUSCLE_LABEL[m] }))}
            />
          </Field>
          <Field label="Equipment">
            <Select
              value={equipment}
              onChange={setEquipment}
              options={EQUIPMENT.map((e) => ({ value: e, label: EQUIPMENT_LABEL[e] }))}
            />
          </Field>
        </div>
        <Field label="Default rest (seconds)" hint="Used to auto-start the rest timer.">
          <TextInput
            type="number"
            inputMode="numeric"
            value={rest}
            onChange={(e) => setRest(Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
        <label className="flex items-center justify-between py-2">
          <span className="text-sm">Uses a barbell (plate calculator)</span>
          <input
            type="checkbox"
            checked={usesBarbell}
            onChange={(e) => setUsesBarbell(e.target.checked)}
            className="h-6 w-6 accent-volt"
          />
        </label>
      </div>
    </Sheet>
  )
}
