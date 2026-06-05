import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { newRoutine, saveRoutine } from '../db/repo'
import type { Routine } from '../db/types'
import { useWorkout } from '../context/WorkoutContext'
import { useExerciseMap } from '../hooks/useExercises'
import { navigate } from '../lib/router'
import { Header } from '../components/Header'
import { Button, Card, EmptyState, IconButton, Pill, Sheet, Spinner } from '../components/ui'
import {
  IconDumbbell,
  IconEdit,
  IconPlay,
  IconPlus,
  IconSettings,
} from '../components/Icons'

export function RoutinesScreen() {
  const routines = useLiveQuery(
    () => db.routines.orderBy('order').toArray(),
    [],
  )
  const exMap = useExerciseMap()
  const { active, startWorkout, discardWorkout } = useWorkout()
  const [pending, setPending] = useState<Routine | null | 'idle'>('idle')

  async function createRoutine() {
    const r = newRoutine('New Routine')
    await saveRoutine(r)
    navigate({ name: 'routine', id: r.id })
  }

  // `routine === null` means a blank workout; `Routine` means from template.
  function requestStart(routine: Routine | null) {
    if (active) {
      setPending(routine)
    } else {
      void begin(routine)
    }
  }

  async function begin(routine: Routine | null) {
    await startWorkout(routine)
    setPending('idle')
    navigate({ name: 'workout' })
  }

  return (
    <>
      <Header
        title="Rack"
        subtitle="Start a workout or manage routines"
        action={
          <IconButton label="Settings" onClick={() => navigate({ name: 'settings' })}>
            <IconSettings size={22} />
          </IconButton>
        }
      />

      <div className="p-4 space-y-4">
        <Button variant="primary" size="lg" full onClick={() => requestStart(null)}>
          <IconPlay size={20} /> Start Empty Workout
        </Button>

        <div className="flex items-center justify-between pt-1">
          <h2 className="text-sm font-semibold text-fg-2 uppercase tracking-wider">
            Routines
          </h2>
          <button
            onClick={createRoutine}
            className="inline-flex items-center gap-1 text-sm text-volt-dim font-medium"
          >
            <IconPlus size={16} /> New
          </button>
        </div>

        {routines === undefined ? (
          <Spinner />
        ) : routines.length === 0 ? (
          <EmptyState
            icon={<IconDumbbell size={40} />}
            title="No routines yet"
            subtitle="Create a reusable routine to start workouts faster."
            action={
              <Button variant="primary" onClick={createRoutine}>
                <IconPlus size={18} /> Create routine
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => {
              const names = routine.items
                .map((it) => exMap.get(it.exerciseId)?.name)
                .filter(Boolean) as string[]
              return (
                <Card key={routine.id} className="overflow-hidden">
                  <button
                    onClick={() => navigate({ name: 'routine', id: routine.id })}
                    className="w-full text-left px-4 pt-4 pb-3 active:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{routine.name}</h3>
                        {routine.category && (
                          <Pill tone="muted" className="mt-1">
                            {routine.category}
                          </Pill>
                        )}
                      </div>
                      <span className="text-fg-3 flex items-center gap-1 text-sm shrink-0">
                        <IconEdit size={15} /> Edit
                      </span>
                    </div>
                    <p className="text-sm text-fg-2 mt-2 line-clamp-2">
                      {names.length > 0
                        ? names.join(', ')
                        : 'No exercises yet, tap to add some.'}
                    </p>
                    <p className="text-xs text-fg-3 mt-1">
                      {routine.items.length}{' '}
                      {routine.items.length === 1 ? 'exercise' : 'exercises'}
                    </p>
                  </button>
                  <div className="px-4 pb-3">
                    <Button
                      variant="primary"
                      full
                      disabled={routine.items.length === 0}
                      onClick={() => requestStart(routine)}
                    >
                      <IconPlay size={18} /> Start {routine.name}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Sheet
        open={pending !== 'idle'}
        onClose={() => setPending('idle')}
        title="Workout in progress"
        footer={
          <div className="flex gap-2">
            <Button
              variant="subtle"
              full
              onClick={() => {
                setPending('idle')
                navigate({ name: 'workout' })
              }}
            >
              Resume current
            </Button>
            <Button
              variant="danger"
              full
              onClick={async () => {
                await discardWorkout()
                if (pending !== 'idle') await begin(pending)
              }}
            >
              Discard and start
            </Button>
          </div>
        }
      >
        <p className="text-fg-2 text-sm">
          You already have a workout running. Resume it, or discard it to start a
          new one.
        </p>
      </Sheet>
    </>
  )
}
