import { useWorkout } from '../context/WorkoutContext'
import { formatDuration } from '../lib/format'
import { IconTimer, IconX } from './Icons'

/** Prominent rest countdown. Renders only while resting; one-tap +/- 15s and
 * skip, with a progress bar that drains as rest elapses. */
export function RestTimerBar() {
  const { rest, restRemaining, adjustRest, skipRest } = useWorkout()
  if (rest.endsAt == null) return null

  const pct = rest.totalSeconds > 0 ? (restRemaining / rest.totalSeconds) * 100 : 0
  const low = restRemaining <= 10

  return (
    <div className="sticky top-14 z-20 mx-auto max-w-md px-3 pt-2">
      <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-ink-700">
        <div
          className={`absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear ${
            low ? 'bg-danger/25' : 'bg-cyan-accent/20'
          }`}
          style={{ width: `${pct}%` }}
        />
        <div className="relative flex items-center gap-2 px-3 py-2.5">
          <IconTimer size={20} className={low ? 'text-danger' : 'text-cyan-accent'} />
          <span
            className={`font-mono text-2xl font-bold tabular-nums ${
              low ? 'text-danger' : 'text-fg'
            }`}
          >
            {formatDuration(restRemaining)}
          </span>
          <span className="text-xs text-faint">rest</span>
          <div className="flex-1" />
          <button
            onClick={() => adjustRest(-15)}
            className="h-9 px-2.5 rounded-lg bg-ink-700 active:bg-ink-600 text-sm font-semibold tabular-nums"
          >
            -15
          </button>
          <button
            onClick={() => adjustRest(15)}
            className="h-9 px-2.5 rounded-lg bg-ink-700 active:bg-ink-600 text-sm font-semibold tabular-nums"
          >
            +15
          </button>
          <button
            onClick={skipRest}
            aria-label="Skip rest"
            className="h-9 w-9 grid place-items-center rounded-lg bg-ink-700 active:bg-ink-600"
          >
            <IconX size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
