import { useState } from 'react'
import { useWorkout } from '../context/WorkoutContext'
import { useExerciseMap } from '../hooks/useExercises'
import { navigate } from '../lib/router'
import { formatDuration } from '../lib/format'
import { isLogged } from '../lib/calc'
import { Button, EmptyState, IconButton, Sheet } from '../components/ui'
import { ExercisePicker } from '../components/ExercisePicker'
import { RestTimerBar } from '../components/RestTimerBar'
import { WorkoutExerciseCard } from '../components/WorkoutExerciseCard'
import { IconDumbbell, IconMore, IconPlus, IconX } from '../components/Icons'

export function WorkoutScreen() {
  const {
    session,
    elapsedSeconds,
    addExercise,
    finishWorkout,
    discardWorkout,
  } = useWorkout()
  const exMap = useExerciseMap()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // If there's no active session (e.g. deep link / reload race), bounce home.
  if (!session) {
    return (
      <>
        <div className="h-14" />
        <EmptyState
          icon={<IconDumbbell size={40} />}
          title="No active workout"
          subtitle="Start one from the Train tab."
          action={
            <Button variant="primary" onClick={() => navigate({ name: 'routines' })}>
              Go to Train
            </Button>
          }
        />
      </>
    )
  }

  const loggedSets = session.entries.reduce(
    (n, e) => n + e.sets.filter(isLogged).length,
    0,
  )

  async function finish() {
    if (loggedSets === 0) {
      if (!confirm('No sets logged yet. Finish anyway?')) return
    }
    const result = await finishWorkout()
    setMenuOpen(false)
    if (result) navigate({ name: 'session', id: result.sessionId })
    else navigate({ name: 'history' })
  }

  async function discard() {
    if (confirm('Discard this workout? Logged sets will be lost.')) {
      await discardWorkout()
      navigate({ name: 'routines' })
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-line-1 safe-top">
        <div className="mx-auto max-w-md flex items-center gap-2 px-4 h-14">
          <IconButton label="Minimise" onClick={() => navigate({ name: 'routines' })} className="-ml-2">
            <IconX size={22} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight truncate">
              {session.routineName ?? 'Workout'}
            </h1>
            <p className="text-xs text-volt-dim font-mono tabular-nums">
              {formatDuration(elapsedSeconds)} · {loggedSets} sets
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={finish}>
            Finish
          </Button>
          <IconButton label="Workout options" onClick={() => setMenuOpen(true)}>
            <IconMore size={22} />
          </IconButton>
        </div>
      </header>

      <RestTimerBar />

      <div className="p-3 space-y-3">
        {session.entries.length === 0 ? (
          <EmptyState
            icon={<IconDumbbell size={40} />}
            title="Empty workout"
            subtitle="Add your first exercise to start logging."
            action={
              <Button variant="primary" onClick={() => setPickerOpen(true)}>
                <IconPlus size={18} /> Add exercise
              </Button>
            }
          />
        ) : (
          <>
            {session.entries.map((entry, index) => (
              <WorkoutExerciseCard
                key={`${entry.exerciseId}-${index}`}
                entryIndex={index}
                entry={entry}
                exercise={exMap.get(entry.exerciseId)}
                sessionDateISO={session.dateISO}
              />
            ))}
            <Button variant="secondary" full size="lg" onClick={() => setPickerOpen(true)}>
              <IconPlus size={20} /> Add exercise
            </Button>
          </>
        )}
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(list) => list.forEach(addExercise)}
        multiSelect
      />

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Workout">
        <div className="space-y-1">
          <Button variant="primary" full size="lg" onClick={finish}>
            Finish workout
          </Button>
          <button
            onClick={discard}
            className="w-full text-left px-1 py-3 text-danger"
          >
            Discard workout
          </button>
        </div>
      </Sheet>
    </>
  )
}
