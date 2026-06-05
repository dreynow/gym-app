import { useEffect, useState } from 'react'
import { db } from '../db/db'
import { deleteRoutine, makeRoutineItem, saveRoutine } from '../db/repo'
import type { Exercise, Routine, RoutineItem } from '../db/types'
import { useExerciseMap } from '../hooks/useExercises'
import { navigate } from '../lib/router'
import { Header } from '../components/Header'
import { Button, Card, IconButton, Spinner, Stepper, TextInput } from '../components/ui'
import { Field } from '../components/ui'
import { ExercisePicker } from '../components/ExercisePicker'
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconTrash,
} from '../components/Icons'

export function RoutineEditScreen({ id }: { id: string }) {
  const exMap = useExerciseMap()
  const [routine, setRoutine] = useState<Routine | null | undefined>(undefined)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Load once into local state; we own edits here and persist on each change.
  useEffect(() => {
    let cancelled = false
    void db.routines.get(id).then((r) => {
      if (!cancelled) setRoutine(r ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  function update(next: Routine) {
    setRoutine(next)
    void saveRoutine(next)
  }

  function patchItem(index: number, patch: Partial<RoutineItem>) {
    if (!routine) return
    update({
      ...routine,
      items: routine.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    })
  }

  function removeItem(index: number) {
    if (!routine) return
    update({ ...routine, items: routine.items.filter((_, i) => i !== index) })
  }

  function moveItem(index: number, dir: -1 | 1) {
    if (!routine) return
    const target = index + dir
    if (target < 0 || target >= routine.items.length) return
    const items = [...routine.items]
    ;[items[index], items[target]] = [items[target], items[index]]
    update({ ...routine, items })
  }

  function addExercises(exercises: Exercise[]) {
    if (!routine) return
    const existingIds = new Set(routine.items.map((it) => it.exerciseId))
    const toAdd = exercises
      .filter((e) => !existingIds.has(e.id))
      .map((e) => makeRoutineItem(e.id))
    update({ ...routine, items: [...routine.items, ...toAdd] })
  }

  async function remove() {
    if (!routine) return
    if (!confirm(`Delete "${routine.name}"? This cannot be undone.`)) return
    await deleteRoutine(routine.id)
    navigate({ name: 'routines' })
  }

  if (routine === undefined) return <Spinner />
  if (routine === null) {
    return (
      <>
        <Header title="Routine" back={{ name: 'routines' }} />
        <p className="p-6 text-muted">This routine no longer exists.</p>
      </>
    )
  }

  return (
    <>
      <Header
        title="Edit Routine"
        back={{ name: 'routines' }}
        action={
          <IconButton label="Delete routine" variant="danger" onClick={remove}>
            <IconTrash size={20} />
          </IconButton>
        }
      />

      <div className="p-4 space-y-5">
        <div className="space-y-3">
          <Field label="Routine name">
            <TextInput
              value={routine.name}
              onChange={(e) => update({ ...routine, name: e.target.value })}
              placeholder="e.g. Upper A"
            />
          </Field>
          <Field label="Category (optional)">
            <TextInput
              value={routine.category ?? ''}
              onChange={(e) => update({ ...routine, category: e.target.value })}
              placeholder="e.g. Upper / Lower"
            />
          </Field>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">
            Exercises
          </h2>
          <div className="space-y-3">
            {routine.items.map((item, index) => {
              const ex = exMap.get(item.exerciseId)
              return (
                <Card key={`${item.exerciseId}-${index}`} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">
                        {ex?.name ?? 'Unknown exercise'}
                      </h3>
                    </div>
                    <div className="flex items-center shrink-0">
                      <IconButton
                        label="Move up"
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0}
                        className="h-8 w-8"
                      >
                        <IconChevronLeft size={18} className="rotate-90" />
                      </IconButton>
                      <IconButton
                        label="Move down"
                        onClick={() => moveItem(index, 1)}
                        disabled={index === routine.items.length - 1}
                        className="h-8 w-8"
                      >
                        <IconChevronRight size={18} className="rotate-90" />
                      </IconButton>
                      <IconButton
                        label="Remove"
                        variant="danger"
                        onClick={() => removeItem(index)}
                        className="h-8 w-8"
                      >
                        <IconTrash size={16} />
                      </IconButton>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-muted">Sets</span>
                    <Stepper
                      value={item.targetSets}
                      min={1}
                      max={12}
                      onChange={(v) => patchItem(index, { targetSets: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted">Rep range</span>
                    <div className="flex items-center gap-2">
                      <Stepper
                        value={item.repLow}
                        min={1}
                        max={item.repHigh}
                        onChange={(v) => patchItem(index, { repLow: v })}
                      />
                      <span className="text-faint">to</span>
                      <Stepper
                        value={item.repHigh}
                        min={item.repLow}
                        max={50}
                        onChange={(v) => patchItem(index, { repHigh: v })}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <TextInput
                      value={item.notes ?? ''}
                      onChange={(e) => patchItem(index, { notes: e.target.value })}
                      placeholder="Notes (optional)"
                    />
                  </div>
                </Card>
              )
            })}
          </div>

          <Button
            variant="secondary"
            full
            className="mt-3"
            onClick={() => setPickerOpen(true)}
          >
            <IconPlus size={18} /> Add exercise
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercises}
        multiSelect
      />
    </>
  )
}
