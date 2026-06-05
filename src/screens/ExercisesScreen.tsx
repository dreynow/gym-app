import { useMemo, useState } from 'react'
import type { Exercise, MuscleGroup } from '../db/types'
import { useExercises } from '../hooks/useExercises'
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../lib/labels'
import { Header } from '../components/Header'
import { Card, cx, EmptyState, IconButton, Pill, TextInput } from '../components/ui'
import { ExerciseForm } from '../components/ExerciseForm'
import { IconEdit, IconLibrary, IconPlus, IconSearch } from '../components/Icons'

export function ExercisesScreen() {
  const exercises = useExercises()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all')
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [creating, setCreating] = useState(false)

  // Only show filter chips for muscle groups that actually have exercises.
  const muscleOptions = useMemo(() => {
    const present = new Set(exercises.map((e) => e.muscleGroup))
    return (Object.keys(MUSCLE_LABEL) as MuscleGroup[]).filter((m) => present.has(m))
  }, [exercises])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises.filter((e) => {
      if (muscle !== 'all' && e.muscleGroup !== muscle) return false
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        EQUIPMENT_LABEL[e.equipment].toLowerCase().includes(q)
      )
    })
  }, [exercises, query, muscle])

  return (
    <>
      <Header
        title="Library"
        subtitle={`${exercises.length} exercises`}
        action={
          <IconButton label="New exercise" variant="primary" onClick={() => setCreating(true)}>
            <IconPlus size={20} />
          </IconButton>
        }
      />

      <div className="p-4 space-y-3">
        <div className="relative">
          <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <Chip active={muscle === 'all'} onClick={() => setMuscle('all')}>
            All
          </Chip>
          {muscleOptions.map((m) => (
            <Chip key={m} active={muscle === m} onClick={() => setMuscle(m)}>
              {MUSCLE_LABEL[m]}
            </Chip>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<IconLibrary size={40} />}
            title="No exercises found"
            subtitle="Try a different search, or create a custom exercise."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => (
              <Card key={e.id} className="flex items-center gap-3 p-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{e.name}</span>
                    {e.isCustom && <Pill tone="cyan">Custom</Pill>}
                  </div>
                  <div className="text-xs text-faint mt-0.5">
                    {MUSCLE_LABEL[e.muscleGroup]} · {EQUIPMENT_LABEL[e.equipment]}
                  </div>
                </div>
                <IconButton label={`Edit ${e.name}`} onClick={() => setEditing(e)}>
                  <IconEdit size={18} />
                </IconButton>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ExerciseForm open={creating} onClose={() => setCreating(false)} />
      <ExerciseForm
        open={editing !== null}
        onClose={() => setEditing(null)}
        existing={editing ?? undefined}
      />
    </>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'shrink-0 px-3 h-8 rounded-full text-sm font-medium transition-colors',
        active ? 'bg-volt-500 text-ink-950' : 'bg-ink-800 text-muted',
      )}
    >
      {children}
    </button>
  )
}
