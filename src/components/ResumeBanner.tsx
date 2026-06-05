import { useWorkout } from '../context/WorkoutContext'
import { navigate } from '../lib/router'
import { formatDuration } from '../lib/format'
import { IconPlay } from './Icons'

/** Floating "workout in progress" bar shown above the bottom nav whenever a
 * session is active but the user has navigated away from the logging screen. */
export function ResumeBanner() {
  const { active, elapsedSeconds, session } = useWorkout()
  if (!active) return null
  const exerciseCount = session?.entries.length ?? 0
  return (
    <button
      onClick={() => navigate({ name: 'workout' })}
      className="fixed bottom-[68px] inset-x-0 z-30 mx-auto max-w-md px-3"
    >
      <div className="flex items-center gap-3 bg-volt text-on-volt rounded-2xl px-4 py-3 shadow-lg shadow-volt-deep/20">
        <IconPlay size={20} />
        <div className="flex-1 text-left">
          <div className="font-semibold text-sm leading-tight">Workout in progress</div>
          <div className="text-xs opacity-80">
            {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
          </div>
        </div>
        <span className="font-mono font-bold tabular-nums">{formatDuration(elapsedSeconds)}</span>
      </div>
    </button>
  )
}
