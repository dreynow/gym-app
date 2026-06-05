import { useWorkout } from '../context/WorkoutContext'
import { formatDuration } from '../lib/format'
import { IconX } from './Icons'

/** Prominent rest countdown. Renders only while resting; floating card with a
 * conic progress ring, big mono time, one-tap +/- 15s and skip. */
export function RestTimerBar() {
  const { rest, restRemaining, adjustRest, skipRest } = useWorkout()
  if (rest.endsAt == null) return null

  const frac = rest.totalSeconds > 0 ? restRemaining / rest.totalSeconds : 0
  const low = restRemaining <= 10
  const ringColor = low ? 'var(--color-danger)' : 'var(--color-volt)'

  return (
    <div className="sticky top-14 z-20 mx-auto max-w-md px-3 pt-2">
      <div className="flex items-center gap-3 rounded-xl bg-surface-1 border border-line-3 shadow-lg px-3 py-2.5">
        {/* Conic progress ring draining clockwise */}
        <div
          className="relative h-11 w-11 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(${ringColor} ${frac * 360}deg, var(--color-surface-3) 0deg)`,
          }}
        >
          <div className="absolute inset-[3px] rounded-full bg-surface-1" />
        </div>
        <div className="flex flex-col">
          <span className="t-label">Rest</span>
          <span
            className={`font-mono font-semibold text-2xl leading-none tabular-nums ${
              low ? 'text-danger' : 'text-fg-1'
            }`}
            style={{ fontFeatureSettings: '"tnum" 1, "zero" 1' }}
          >
            {formatDuration(restRemaining)}
          </span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => adjustRest(-15)}
          className="h-9 px-2.5 rounded-md bg-surface-2 active:bg-surface-3 text-sm font-semibold font-mono tabular-nums"
        >
          -15
        </button>
        <button
          onClick={() => adjustRest(15)}
          className="h-9 px-2.5 rounded-md bg-surface-2 active:bg-surface-3 text-sm font-semibold font-mono tabular-nums"
        >
          +15
        </button>
        <button
          onClick={skipRest}
          aria-label="Skip rest"
          className="h-9 w-9 grid place-items-center rounded-md bg-surface-2 active:bg-surface-3"
        >
          <IconX size={18} />
        </button>
      </div>
    </div>
  )
}
