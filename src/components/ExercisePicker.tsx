import { useMemo, useState } from 'react'
import type { Exercise } from '../db/types'
import { useExercises } from '../hooks/useExercises'
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../lib/labels'
import { Button, cx, Sheet, TextInput } from './ui'
import { IconPlus, IconSearch } from './Icons'
import { ExerciseForm } from './ExerciseForm'

/** Searchable exercise picker. Single-select picks immediately; multi-select
 * accumulates a selection and confirms with a footer button. */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  multiSelect = false,
}: {
  open: boolean
  onClose: () => void
  onPick: (exercises: Exercise[]) => void
  multiSelect?: boolean
}) {
  const exercises = useExercises()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return exercises
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        MUSCLE_LABEL[e.muscleGroup].toLowerCase().includes(q) ||
        EQUIPMENT_LABEL[e.equipment].toLowerCase().includes(q),
    )
  }, [exercises, query])

  function pick(exercise: Exercise) {
    if (multiSelect) {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(exercise.id)) next.delete(exercise.id)
        else next.add(exercise.id)
        return next
      })
    } else {
      onPick([exercise])
      reset()
      onClose()
    }
  }

  function reset() {
    setQuery('')
    setSelected(new Set())
  }

  function confirmMulti() {
    const chosen = exercises.filter((e) => selected.has(e.id))
    onPick(chosen)
    reset()
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={() => {
          reset()
          onClose()
        }}
        title="Add exercise"
        footer={
          multiSelect ? (
            <Button variant="primary" full disabled={selected.size === 0} onClick={confirmMulti}>
              Add {selected.size > 0 ? `${selected.size} ` : ''}
              {selected.size === 1 ? 'exercise' : 'exercises'}
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-3">
          <div className="relative">
            <IconSearch
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3"
            />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises"
              className="pl-10"
            />
          </div>

          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 w-full text-volt-dim text-sm font-medium py-2"
          >
            <IconPlus size={18} /> Create new exercise
          </button>

          <div className="space-y-1 -mx-1">
            {filtered.map((e) => {
              const isSel = selected.has(e.id)
              return (
                <button
                  key={e.id}
                  onClick={() => pick(e)}
                  className={cx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                    isSel ? 'bg-volt/15' : 'active:bg-surface-2',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{e.name}</div>
                    <div className="text-xs text-fg-3">
                      {MUSCLE_LABEL[e.muscleGroup]} · {EQUIPMENT_LABEL[e.equipment]}
                    </div>
                  </div>
                  {multiSelect && (
                    <span
                      className={cx(
                        'h-6 w-6 rounded-md border flex items-center justify-center text-xs',
                        isSel
                          ? 'bg-volt border-volt text-on-volt'
                          : 'border-line-2',
                      )}
                    >
                      {isSel ? '✓' : ''}
                    </span>
                  )}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="text-center text-fg-2 text-sm py-6">
                No matches. Create a new exercise above.
              </p>
            )}
          </div>
        </div>
      </Sheet>

      <ExerciseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialName={query}
        onSaved={(ex) => {
          if (multiSelect) {
            setSelected((prev) => new Set(prev).add(ex.id))
          } else {
            onPick([ex])
            reset()
            onClose()
          }
        }}
      />
    </>
  )
}
