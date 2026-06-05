import { useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Session } from '../db/types'
import { db } from '../db/db'
import { useExerciseMap } from '../hooks/useExercises'
import { useSettings } from '../hooks/useSettings'
import { navigate } from '../lib/router'
import { countWorkingSets, sessionVolume } from '../lib/calc'
import { displayWeight, formatDurationShort, relativeDate, unitLabel } from '../lib/format'
import { computeTrainingStats, dayKey, monthGrid } from '../lib/streaks'
import { Header } from '../components/Header'
import { Card, cx, EmptyState, Pill, SegmentedControl, Spinner } from '../components/ui'
import {
  IconChevronLeft,
  IconChevronRight,
  IconFlame,
  IconHeart,
  IconHistory,
  IconTrophy,
} from '../components/Icons'

export function HistoryScreen() {
  const settings = useSettings()
  const exMap = useExerciseMap()
  const [view, setView] = useState<'list' | 'calendar'>('list')
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
      <div className="p-4 space-y-4">
        <SegmentedControl<'list' | 'calendar'>
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
          className="w-full"
        />

        {sessions === undefined ? (
          <Spinner />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<IconHistory size={40} />}
            title="No workouts logged yet"
            subtitle="Finished workouts show up here with volume and PRs."
          />
        ) : view === 'calendar' ? (
          <CalendarView sessions={sessions} />
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
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-fg-3">
                      <span>{formatDurationShort(s.durationSeconds)}</span>
                      {volume > 0 ? (
                        <>
                          <span>{sets} sets</span>
                          <span>
                            {displayWeight(volume, settings.units)} {unitLabel(settings.units)} volume
                          </span>
                        </>
                      ) : (
                        sets > 0 && <span>{sets} sets</span>
                      )}
                      {s.heartRateAvgBpm != null && (
                        <span className="inline-flex items-center gap-1">
                          <IconHeart size={12} className="text-danger" />
                          <span className="tabular-nums">{s.heartRateAvgBpm}</span> bpm
                        </span>
                      )}
                      {s.activeEnergyKcal != null && (
                        <span className="inline-flex items-center gap-1">
                          <IconFlame size={12} className="text-warning" />
                          <span className="tabular-nums">{s.activeEnergyKcal}</span> kcal
                        </span>
                      )}
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

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function CalendarView({ sessions }: { sessions: Session[] }) {
  const now = new Date()
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))

  const stats = useMemo(
    () => computeTrainingStats(sessions.map((s) => new Date(s.dateISO)), now),
    // now is recreated each render but only its day matters; sessions drives it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions],
  )
  const sessionByDay = useMemo(() => {
    const m = new Map<string, string>()
    // sessions are newest-first; keep the latest of a day for tap-through.
    for (const s of sessions) m.set(dayKey(new Date(s.dateISO)), s.id)
    return m
  }, [sessions])

  const grid = monthGrid(month.getFullYear(), month.getMonth())
  const todayKey = dayKey(now)
  const atCurrentMonth =
    month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()
  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Week streak"
          value={String(stats.weekStreak)}
          icon={<IconFlame size={14} className="text-volt" />}
        />
        <StatTile label="This week" value={String(stats.thisWeek)} />
        <StatTile label="This month" value={String(stats.thisMonth)} />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            aria-label="Previous month"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="size-8 rounded-full flex items-center justify-center text-fg-2 active:bg-surface-2"
          >
            <IconChevronLeft size={18} />
          </button>
          <span className="font-semibold">{monthLabel}</span>
          <button
            aria-label="Next month"
            disabled={atCurrentMonth}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="size-8 rounded-full flex items-center justify-center text-fg-2 active:bg-surface-2 disabled:opacity-30"
          >
            <IconChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-2xs text-fg-3">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const k = dayKey(day)
            const trained = stats.trainedDays.has(k)
            const inMonth = day.getMonth() === month.getMonth()
            const isToday = k === todayKey
            const sid = sessionByDay.get(k)
            return (
              <button
                key={k}
                disabled={!sid}
                onClick={() => sid && navigate({ name: 'session', id: sid })}
                className={cx(
                  'aspect-square rounded-md flex items-center justify-center text-sm font-mono tabular-nums',
                  trained
                    ? 'bg-volt text-on-volt font-semibold'
                    : inMonth
                      ? 'text-fg-2'
                      : 'text-fg-3/40',
                  isToday && !trained && 'ring-1 ring-line-3',
                )}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>
      </Card>

      {stats.longestWeekStreak > 1 && (
        <p className="text-xs text-fg-3 text-center">
          Longest run: {stats.longestWeekStreak} weeks in a row.
        </p>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="bg-surface-1 border border-line-2 rounded-xl p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-lg font-bold tabular-nums">
        {icon}
        {value}
      </div>
      <div className="text-[11px] text-fg-3">{label}</div>
    </div>
  )
}
