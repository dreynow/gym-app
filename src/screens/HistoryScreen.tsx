import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useExerciseMap } from '../hooks/useExercises'
import { useSettings } from '../hooks/useSettings'
import { navigate } from '../lib/router'
import { countWorkingSets, sessionVolume } from '../lib/calc'
import { displayWeight, formatDurationShort, relativeDate, unitLabel } from '../lib/format'
import { Header } from '../components/Header'
import { Card, EmptyState, Pill, Spinner } from '../components/ui'
import { IconChevronRight, IconHistory, IconTrophy } from '../components/Icons'

export function HistoryScreen() {
  const settings = useSettings()
  const exMap = useExerciseMap()
  const sessions = useLiveQuery(async () => {
    const all = await db.sessions.toArray()
    return all.filter((s) => s.finished).sort((a, b) => b.dateISO.localeCompare(a.dateISO))
  }, [])
  const prCounts = useLiveQuery(async () => {
    const prs = await db.prs.toArray()
    const map = new Map<string, number>()
    for (const pr of prs) map.set(pr.sessionId, (map.get(pr.sessionId) ?? 0) + 1)
    return map
  }, [])

  return (
    <>
      <Header title="History" subtitle="Your past sessions" />
      <div className="p-4">
        {sessions === undefined ? (
          <Spinner />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<IconHistory size={40} />}
            title="No workouts logged yet"
            subtitle="Finished workouts show up here with volume and PRs."
          />
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const sets = s.entries.reduce((n, e) => n + countWorkingSets(e), 0)
              const volume = sessionVolume(s)
              const prCount = prCounts?.get(s.id) ?? 0
              const names = s.entries
                .map((e) => exMap.get(e.exerciseId)?.name)
                .filter(Boolean) as string[]
              return (
                <Card key={s.id}>
                  <button
                    onClick={() => navigate({ name: 'session', id: s.id })}
                    className="w-full text-left p-4 active:bg-surface-2 transition-colors rounded-2xl"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">
                            {s.routineName ?? 'Workout'}
                          </h3>
                          {prCount > 0 && (
                            <Pill tone="pr">
                              <IconTrophy size={12} /> {prCount}
                            </Pill>
                          )}
                        </div>
                        <p className="text-xs text-fg-2">{relativeDate(s.dateISO)}</p>
                      </div>
                      <IconChevronRight size={18} className="text-fg-3 shrink-0" />
                    </div>
                    <p className="text-sm text-fg-2 mt-2 line-clamp-1">
                      {names.join(', ') || 'No exercises'}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-fg-3">
                      <span>{formatDurationShort(s.durationSeconds)}</span>
                      <span>{sets} sets</span>
                      <span>
                        {displayWeight(volume, settings.units)} {unitLabel(settings.units)} volume
                      </span>
                    </div>
                  </button>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
