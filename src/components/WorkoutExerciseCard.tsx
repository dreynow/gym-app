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
import { suggestProgression } from '../lib/progression'
import { SET_TYPE_LABEL, SET_TYPES, SET_TYPE_SHORT } from '../lib/labels'
import { Button, Card, cx, IconButton, Pill, Sheet, Stepper } from './ui'
import { useConfirm } from './ConfirmDialog'
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
  /** Top of this exercise's rep range in the routine, for the progression hint. */
  repHigh?: number
}

const SET_BADGE_TONE: Record<SetType, string> = {
  warmup: 'text-warning',
  working: 'text-fg-1',
  drop: 'text-info',
  failure: 'text-danger',
}

export function WorkoutExerciseCard({
  entryIndex,
  entry,
  exercise,
  sessionDateISO,
  repHigh,
}: Props) {
  const { updateSet, addSet, removeSet, toggleSetDone, removeEntry, setEntryNotes } = useWorkout()
  const confirm = useConfirm()
  const settings = useSettings()
  const last = useLastSession(entry.exerciseId, sessionDateISO)
  const priorBests = useAllTimeBests(entry.exerciseId, sessionDateISO)

  // Double progression: if last time every working set topped the rep range,
  // suggest adding weight. Only shown until a set on this exercise is logged.
  const someLogged = entry.sets.some(isLogged)
  const progression = someLogged
    ? null
    : suggestProgression(last?.entry, repHigh, {
        usesBarbell: !!exercise?.usesBarbell,
        plateInventoryKg: settings.plateInventoryKg,
      })

  function applyProgression() {
    if (!progression) return
    entry.sets.forEach((s, i) => {
      if (!s.done) updateSet(entryIndex, i, { weightKg: progression.suggestedWeightKg })
    })
  }

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
          <p className="text-xs text-fg-3">
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

      {progression && (
        <button
          onClick={applyProgression}
          className="w-full flex items-center gap-2 px-4 pb-2.5 -mt-0.5 text-left active:opacity-80"
        >
          <span className="text-xs text-volt-dim">
            Topped {progression.repHigh} reps last time. Add weight: try{' '}
            {displayWeight(progression.suggestedWeightKg, units)} {unitLabel(units)}.
          </span>
          <span className="ml-auto shrink-0 text-2xs font-semibold bg-volt text-on-volt rounded-full px-2.5 py-0.5">
            Apply
          </span>
        </button>
      )}

      {showNote && (
        <div className="px-4 pb-2">
          <input
            value={entry.notes ?? ''}
            onChange={(e) => setEntryNotes(entryIndex, e.target.value)}
            placeholder="Note for this exercise"
            className="w-full h-9 px-3 rounded-lg bg-surface-2 text-sm border border-line-2 focus:outline-none focus:border-volt placeholder:text-fg-3"
          />
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-[1.9rem_1fr_3.4rem_3.4rem_2.6rem] gap-1.5 px-4 pb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-fg-3">
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
                'grid grid-cols-[1.9rem_1fr_3.4rem_3.4rem_2.6rem] gap-1.5 items-center rounded-md border',
                set.done ? 'bg-volt-ghost border-volt-line' : 'border-transparent',
              )}
            >
              <button
                onClick={() => setSetMenu(setIndex)}
                className={cx(
                  'h-11 grid place-items-center font-mono font-semibold text-sm rounded-md active:bg-surface-3',
                  SET_BADGE_TONE[set.type],
                )}
              >
                {setLabels[setIndex]}
              </button>

              <div className="flex items-center gap-1 min-w-0 font-mono text-sm text-fg-3 truncate tabular-nums">
                {prevText}
                {pr && <IconTrophy size={13} className="text-volt shrink-0" />}
              </div>

              <input
                type="number"
                inputMode="decimal"
                aria-label={`${exercise?.name ?? 'Exercise'} set ${setLabels[setIndex]} weight`}
                value={toDisplay(set.weightKg)}
                placeholder={prevSet ? displayWeight(prevSet.weightKg, units) : '0'}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateSet(entryIndex, setIndex, { weightKg: fromDisplay(e.target.value) })}
                className="h-11 w-full text-center rounded-md bg-surface-2 border border-line-2 focus:outline-none focus:border-volt-line font-mono font-semibold text-[17px] tabular-nums"
              />
              <input
                type="number"
                inputMode="numeric"
                aria-label={`${exercise?.name ?? 'Exercise'} set ${setLabels[setIndex]} reps`}
                value={set.reps ?? ''}
                placeholder={prevSet?.reps != null ? String(prevSet.reps) : '0'}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  updateSet(entryIndex, setIndex, {
                    reps: e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value))),
                  })
                }
                className="h-11 w-full text-center rounded-md bg-surface-2 border border-line-2 focus:outline-none focus:border-volt-line font-mono font-semibold text-[17px] tabular-nums"
              />
              <button
                onClick={() => toggleSetDone(entryIndex, setIndex, rest)}
                aria-label={set.done ? 'Mark set not done' : 'Mark set done'}
                className={cx(
                  'h-11 w-full grid place-items-center rounded-md transition-colors',
                  set.done ? 'bg-volt text-on-volt' : 'bg-surface-2 text-fg-3 active:bg-surface-3',
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
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-surface-2 text-left"
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
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-surface-2 text-left text-danger"
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
              <IconTimer size={18} className="text-info" /> Rest timer
            </span>
            <div className="flex items-center gap-2">
              <Stepper value={rest} min={0} max={600} step={15} onChange={setRest} />
              <span className="text-sm text-fg-3 w-12 tabular-nums">{formatDuration(rest)}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setShowNote(true)
              setMenuOpen(false)
            }}
            className="w-full flex items-center gap-3 px-1 py-2 text-left"
          >
            <IconNote size={18} className="text-fg-2" /> Add a note
          </button>
          {exercise?.usesBarbell && (
            <button
              onClick={() => {
                setMenuOpen(false)
                setPlateOpen(true)
              }}
              className="w-full flex items-center gap-3 px-1 py-2 text-left"
            >
              <IconCalculator size={18} className="text-fg-2" /> Plate calculator
            </button>
          )}
          <button
            onClick={() => {
              setMenuOpen(false)
              void confirm({
                message: 'Remove this exercise from the workout?',
                confirmLabel: 'Remove',
                danger: true,
              }).then((ok) => ok && removeEntry(entryIndex))
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
