import { useState } from 'react'
import { saveExercise } from '../db/repo'
import type { Exercise, SessionEntry, SetType, WorkoutSet } from '../db/types'
import { useWorkout } from '../context/WorkoutContext'
import { useLastSession } from '../hooks/useLastSession'
import { useAllTimeBests } from '../hooks/useBests'
import { useSettings } from '../hooks/useSettings'
import { epley1RM, isLogged } from '../lib/calc'
import { displayWeight, formatDuration, num, relativeDate, unitLabel } from '../lib/format'
import { kgToLb, lbToKg } from '../lib/calc'
import { SET_TYPE_LABEL, SET_TYPES, SET_TYPE_SHORT } from '../lib/labels'
import { Button, Card, cx, IconButton, Pill, Sheet, Stepper } from './ui'
import { PlateCalculator } from './PlateCalculator'
import {
  IconCalculator,
  IconCheck,
  IconMore,
  IconNote,
  IconTimer,
  IconTrash,
  IconTrophy,
} from './Icons'

interface Props {
  entryIndex: number
  entry: SessionEntry
  exercise: Exercise | undefined
  sessionDateISO: string
}

const SET_BADGE_TONE: Record<SetType, string> = {
  warmup: 'text-warn',
  working: 'text-fg',
  drop: 'text-cyan-accent',
  failure: 'text-danger',
}

export function WorkoutExerciseCard({ entryIndex, entry, exercise, sessionDateISO }: Props) {
  const { updateSet, addSet, removeSet, toggleSetDone, removeEntry, setEntryNotes } = useWorkout()
  const settings = useSettings()
  const last = useLastSession(entry.exerciseId, sessionDateISO)
  const priorBests = useAllTimeBests(entry.exerciseId, sessionDateISO)

  const [menuOpen, setMenuOpen] = useState(false)
  const [plateOpen, setPlateOpen] = useState(false)
  const [showNote, setShowNote] = useState(!!entry.notes)
  const [setMenu, setSetMenu] = useState<number | null>(null)

  const units = settings.units
  const rest = exercise?.defaultRestSeconds ?? settings.defaultRestSeconds

  // Working-set numbering ignores warmups (1, 2, 3 ...).
  let workingCount = 0
  const setLabels = entry.sets.map((s) => {
    if (s.type === 'warmup') return 'W'
    workingCount += 1
    return String(workingCount)
  })

  function setRest(seconds: number) {
    if (!exercise) return
    void saveExercise({ ...exercise, defaultRestSeconds: seconds })
  }

  // Convert between stored kg and the displayed unit for the inputs.
  function toDisplay(kg: number | null): string {
    if (kg == null) return ''
    return num(units === 'lb' ? kgToLb(kg) : kg, 2)
  }
  function fromDisplay(value: string): number | null {
    if (value.trim() === '') return null
    const n = Number(value)
    if (!Number.isFinite(n)) return null
    return units === 'lb' ? lbToKg(n) : n
  }

  function isSetPR(set: WorkoutSet): boolean {
    if (!isLogged(set)) return false
    const w = set.weightKg!
    const e = epley1RM(set.weightKg!, set.reps!)
    return w > priorBests.weight + 1e-6 || e > priorBests.e1rm + 1e-6
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{exercise?.name ?? 'Unknown exercise'}</h3>
          <p className="text-xs text-faint">
            {last ? `Last: ${relativeDate(last.session.dateISO)}` : 'No previous data'}
            {' · '}
            {formatDuration(rest)} rest
          </p>
        </div>
        {exercise?.usesBarbell && (
          <IconButton label="Plate calculator" onClick={() => setPlateOpen(true)}>
            <IconCalculator size={20} />
          </IconButton>
        )}
        <IconButton label="Exercise options" onClick={() => setMenuOpen(true)}>
          <IconMore size={20} />
        </IconButton>
      </div>

      {showNote && (
        <div className="px-4 pb-2">
          <input
            value={entry.notes ?? ''}
            onChange={(e) => setEntryNotes(entryIndex, e.target.value)}
            placeholder="Note for this exercise"
            className="w-full h-9 px-3 rounded-lg bg-ink-800 text-sm border border-ink-700 focus:outline-none focus:border-volt-500 placeholder:text-faint"
          />
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-[1.9rem_1fr_3.4rem_3.4rem_2.6rem] gap-1.5 px-4 pb-1 text-[11px] uppercase tracking-wide text-faint">
        <span className="text-center">Set</span>
        <span>Last</span>
        <span className="text-center">{unitLabel(units)}</span>
        <span className="text-center">Reps</span>
        <span className="text-center">Done</span>
      </div>

      <div className="space-y-1.5 px-4">
        {entry.sets.map((set, setIndex) => {
          const prevSet = last?.entry.sets.filter((s) => s.type !== 'warmup')[
            set.type === 'warmup' ? -1 : Number(setLabels[setIndex]) - 1
          ]
          const prevText =
            prevSet && isLogged(prevSet)
              ? `${displayWeight(prevSet.weightKg, units)}×${prevSet.reps}`
              : '—'
          const pr = isSetPR(set)
          return (
            <div
              key={setIndex}
              className={cx(
                'grid grid-cols-[1.9rem_1fr_3.4rem_3.4rem_2.6rem] gap-1.5 items-center rounded-lg',
                set.done && 'bg-volt-500/10',
              )}
            >
              <button
                onClick={() => setSetMenu(setIndex)}
                className={cx(
                  'h-11 grid place-items-center font-bold text-sm rounded-lg active:bg-ink-700',
                  SET_BADGE_TONE[set.type],
                )}
              >
                {setLabels[setIndex]}
              </button>

              <div className="flex items-center gap-1 min-w-0 text-sm text-faint truncate">
                {prevText}
                {pr && <IconTrophy size={13} className="text-pr shrink-0" />}
              </div>

              <input
                type="number"
                inputMode="decimal"
                value={toDisplay(set.weightKg)}
                placeholder={prevSet ? displayWeight(prevSet.weightKg, units) : '0'}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateSet(entryIndex, setIndex, { weightKg: fromDisplay(e.target.value) })}
                className="h-11 w-full text-center rounded-lg bg-ink-800 border border-ink-700 focus:outline-none focus:border-volt-500 font-medium"
              />
              <input
                type="number"
                inputMode="numeric"
                value={set.reps ?? ''}
                placeholder={prevSet?.reps != null ? String(prevSet.reps) : '0'}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  updateSet(entryIndex, setIndex, {
                    reps: e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value))),
                  })
                }
                className="h-11 w-full text-center rounded-lg bg-ink-800 border border-ink-700 focus:outline-none focus:border-volt-500 font-medium"
              />
              <button
                onClick={() => toggleSetDone(entryIndex, setIndex, rest)}
                aria-label={set.done ? 'Mark set not done' : 'Mark set done'}
                className={cx(
                  'h-11 w-full grid place-items-center rounded-lg transition-colors',
                  set.done ? 'bg-volt-500 text-ink-950' : 'bg-ink-800 text-faint active:bg-ink-700',
                )}
              >
                <IconCheck size={20} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-3">
        <Button variant="subtle" full size="sm" onClick={() => addSet(entryIndex)}>
          + Add set
        </Button>
      </div>

      {/* Per-set menu: type + remove */}
      <Sheet open={setMenu !== null} onClose={() => setSetMenu(null)} title="Set type">
        <div className="space-y-1">
          {SET_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => {
                if (setMenu !== null) updateSet(entryIndex, setMenu, { type: t })
                setSetMenu(null)
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-ink-800 text-left"
            >
              <span className={cx('w-6 text-center font-bold', SET_BADGE_TONE[t])}>
                {SET_TYPE_SHORT[t] || '•'}
              </span>
              <span>{SET_TYPE_LABEL[t]}</span>
            </button>
          ))}
          <button
            onClick={() => {
              if (setMenu !== null) removeSet(entryIndex, setMenu)
              setSetMenu(null)
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-ink-800 text-left text-danger"
          >
            <IconTrash size={18} className="ml-0.5" /> Remove set
          </button>
        </div>
      </Sheet>

      {/* Exercise menu */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={exercise?.name ?? 'Exercise'}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <IconTimer size={18} className="text-cyan-accent" /> Rest timer
            </span>
            <div className="flex items-center gap-2">
              <Stepper value={rest} min={0} max={600} step={15} onChange={setRest} />
              <span className="text-sm text-faint w-12 tabular-nums">{formatDuration(rest)}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setShowNote(true)
              setMenuOpen(false)
            }}
            className="w-full flex items-center gap-3 px-1 py-2 text-left"
          >
            <IconNote size={18} className="text-muted" /> Add a note
          </button>
          {exercise?.usesBarbell && (
            <button
              onClick={() => {
                setMenuOpen(false)
                setPlateOpen(true)
              }}
              className="w-full flex items-center gap-3 px-1 py-2 text-left"
            >
              <IconCalculator size={18} className="text-muted" /> Plate calculator
            </button>
          )}
          <button
            onClick={() => {
              if (confirm('Remove this exercise from the workout?')) removeEntry(entryIndex)
              setMenuOpen(false)
            }}
            className="w-full flex items-center gap-3 px-1 py-2 text-left text-danger"
          >
            <IconTrash size={18} /> Remove exercise
          </button>
        </div>
      </Sheet>

      <PlateCalculator
        open={plateOpen}
        onClose={() => setPlateOpen(false)}
        initialTargetKg={topWorkingWeight(entry)}
      />

      {/* Live PR hint */}
      {entry.sets.some(isSetPR) && (
        <div className="px-4 pb-3 -mt-1">
          <Pill tone="pr">
            <IconTrophy size={12} /> On track for a PR
          </Pill>
        </div>
      )}
    </Card>
  )
}

function topWorkingWeight(entry: SessionEntry): number | null {
  const weights = entry.sets.filter((s) => s.weightKg != null).map((s) => s.weightKg!)
  return weights.length ? Math.max(...weights) : null
}
