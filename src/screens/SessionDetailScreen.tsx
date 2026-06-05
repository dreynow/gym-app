import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { deleteSession } from '../db/repo'
import type { PrRecord } from '../db/types'
import { useExerciseMap } from '../hooks/useExercises'
import { useSettings } from '../hooks/useSettings'
import { navigate } from '../lib/router'
import { countWorkingSets, entryVolume, isLogged } from '../lib/calc'
import {
  displayWeight,
  formatDateTime,
  formatDurationShort,
  num,
  unitLabel,
} from '../lib/format'
import { PR_LABEL } from '../lib/pr'
import { SET_TYPE_LABEL } from '../lib/labels'
import { Header } from '../components/Header'
import { Card, cx, IconButton, Pill, Spinner } from '../components/ui'
import { IconTrash, IconTrophy } from '../components/Icons'

export function SessionDetailScreen({ id }: { id: string }) {
  const settings = useSettings()
  const exMap = useExerciseMap()
  const session = useLiveQuery(() => db.sessions.get(id), [id])
  const prs = useLiveQuery(
    () => db.prs.where('id').startsWith(`${id}:`).toArray(),
    [id],
    [] as PrRecord[],
  )
  const units = settings.units

  if (session === undefined) return <Spinner />
  if (session === null) {
    return (
      <>
        <Header title="Workout" back={{ name: 'history' }} />
        <p className="p-6 text-fg-2">This workout no longer exists.</p>
      </>
    )
  }

  const totalVolume = session.entries.reduce((sum, e) => sum + entryVolume(e), 0)
  const totalSets = session.entries.reduce((n, e) => n + countWorkingSets(e), 0)

  // Group PRs by exercise for badge display.
  const prByExercise = new Map<string, PrRecord[]>()
  for (const pr of prs ?? []) {
    const list = prByExercise.get(pr.exerciseId) ?? []
    list.push(pr)
    prByExercise.set(pr.exerciseId, list)
  }

  async function remove() {
    if (!confirm('Delete this workout permanently?')) return
    await deleteSession(id)
    navigate({ name: 'history' })
  }

  return (
    <>
      <Header
        title={session.routineName ?? 'Workout'}
        subtitle={formatDateTime(session.dateISO)}
        back={{ name: 'history' }}
        action={
          <IconButton label="Delete workout" variant="danger" onClick={remove}>
            <IconTrash size={20} />
          </IconButton>
        }
      />

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Duration" value={formatDurationShort(session.durationSeconds)} />
          <Stat label="Sets" value={String(totalSets)} />
          <Stat
            label={`Volume (${unitLabel(units)})`}
            value={displayWeight(totalVolume, units)}
          />
        </div>

        {(prs?.length ?? 0) > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-volt font-semibold mb-2">
              <IconTrophy size={18} /> {prs!.length} personal {prs!.length === 1 ? 'record' : 'records'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(prs ?? []).map((pr) => (
                <Pill key={pr.id} tone="pr">
                  {exMap.get(pr.exerciseId)?.name}: {PR_LABEL[pr.kind]}
                </Pill>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {session.entries.map((entry, i) => {
            const ex = exMap.get(entry.exerciseId)
            const entryPRs = prByExercise.get(entry.exerciseId) ?? []
            return (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{ex?.name ?? 'Unknown exercise'}</h3>
                  {entryPRs.length > 0 && (
                    <IconTrophy size={16} className="text-volt shrink-0" />
                  )}
                </div>
                {entry.notes && <p className="text-sm text-fg-2 mt-1">{entry.notes}</p>}
                <div className="mt-2 space-y-1">
                  {entry.sets.filter(isLogged).map((set, j) => (
                    <div key={j} className="flex items-center gap-3 text-sm">
                      <span
                        className={cx(
                          'w-14 text-xs',
                          set.type === 'warmup' ? 'text-warning' : 'text-fg-3',
                        )}
                      >
                        {SET_TYPE_LABEL[set.type]}
                      </span>
                      <span className="font-medium tabular-nums">
                        {displayWeight(set.weightKg, units)} {unitLabel(units)} × {set.reps}
                      </span>
                      {set.rpe != null && (
                        <span className="text-fg-3 text-xs">RPE {num(set.rpe)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-1 border border-line-2 rounded-xl p-3 text-center">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-fg-3">{label}</div>
    </div>
  )
}
