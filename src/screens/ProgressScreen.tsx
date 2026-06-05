import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '../db/db'
import type { MuscleGroup, Units } from '../db/types'
import { useExercises } from '../hooks/useExercises'
import { useSettings } from '../hooks/useSettings'
import { bestsForEntry } from '../lib/pr'
import { kgToLb } from '../lib/calc'
import { addWeeks, muscleBreakdown, weekLabel, weekStart } from '../lib/muscleVolume'
import { MUSCLE_LABEL } from '../lib/labels'
import { displayWeight, num, unitLabel } from '../lib/format'
import { Header } from '../components/Header'
import { Card, EmptyState, SegmentedControl } from '../components/ui'
import { ExercisePicker } from '../components/ExercisePicker'
import {
  IconActivity,
  IconChart,
  IconChevronLeft,
  IconChevronRight,
} from '../components/Icons'

type Metric = 'e1rm' | 'weight' | 'volume'
type Range = '1m' | '3m' | '6m' | '1y' | 'all'

const RANGE_DAYS: Record<Range, number> = {
  '1m': 30,
  '3m': 91,
  '6m': 182,
  '1y': 365,
  all: Number.POSITIVE_INFINITY,
}

const METRIC_LABEL: Record<Metric, string> = {
  e1rm: 'Est. 1RM',
  weight: 'Top set',
  volume: 'Volume',
}

export function ProgressScreen() {
  const settings = useSettings()
  const exercises = useExercises()
  const [view, setView] = useState<'exercise' | 'muscle'>('exercise')
  const [exerciseId, setExerciseId] = useState<string | null>(null)
  const [metric, setMetric] = useState<Metric>('e1rm')
  const [range, setRange] = useState<Range>('3m')
  const [pickerOpen, setPickerOpen] = useState(false)

  // Default to the first exercise that actually has history.
  const exercisesWithHistory = useLiveQuery(async () => {
    const all = await db.sessions.toArray()
    const ids = new Set<string>()
    for (const s of all) if (s.finished) for (const e of s.entries) ids.add(e.exerciseId)
    return ids
  }, [])

  const activeId =
    exerciseId ??
    exercises.find((e) => exercisesWithHistory?.has(e.id))?.id ??
    exercises[0]?.id ??
    null

  const activeExercise = exercises.find((e) => e.id === activeId)
  const toUnit = (kg: number) => (settings.units === 'lb' ? kgToLb(kg) : kg)

  const data = useLiveQuery(async () => {
    if (!activeId) return []
    const all = await db.sessions.toArray()
    const cutoff =
      range === 'all' ? 0 : Date.now() - RANGE_DAYS[range] * 86_400_000
    return all
      .filter((s) => s.finished && new Date(s.dateISO).getTime() >= cutoff)
      .map((s) => {
        const entry = s.entries.find((e) => e.exerciseId === activeId)
        if (!entry) return null
        const b = bestsForEntry(entry)
        if (b.weight === 0 && b.e1rm === 0 && b.volume === 0) return null
        return {
          ts: new Date(s.dateISO).getTime(),
          label: new Date(s.dateISO).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          e1rm: Math.round(toUnit(b.e1rm) * 10) / 10,
          weight: Math.round(toUnit(b.weight) * 10) / 10,
          volume: Math.round(toUnit(b.volume)),
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => a.ts - b.ts)
  }, [activeId, range, settings.units])

  const summary = useMemo(() => {
    if (!data || data.length === 0) return null
    const first = data[0][metric]
    const last = data[data.length - 1][metric]
    const best = Math.max(...data.map((d) => d[metric]))
    return { first, last, best, delta: last - first }
  }, [data, metric])

  return (
    <>
      <Header title="Progress" subtitle="Track your lifts over time" />
      <div className="p-4 space-y-4">
        <SegmentedControl<'exercise' | 'muscle'>
          value={view}
          onChange={setView}
          options={[
            { value: 'exercise', label: 'Exercise' },
            { value: 'muscle', label: 'Muscle groups' },
          ]}
          className="w-full"
        />

        {view === 'muscle' ? (
          <MuscleGroupsView units={settings.units} />
        ) : (
          <>
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full flex items-center justify-between bg-surface-1 border border-line-2 rounded-2xl px-4 py-3.5 active:bg-surface-2"
        >
          <div className="text-left">
            <div className="text-xs text-fg-3">Exercise</div>
            <div className="font-semibold">
              {activeExercise?.name ?? 'Select an exercise'}
            </div>
          </div>
          <IconChevronRight size={20} className="text-fg-3" />
        </button>

        {!activeId ? (
          <EmptyState
            icon={<IconChart size={40} />}
            title="No exercises yet"
            subtitle="Add exercises and log workouts to see progress."
          />
        ) : (
          <>
            <SegmentedControl<Metric>
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'e1rm', label: METRIC_LABEL.e1rm },
                { value: 'weight', label: METRIC_LABEL.weight },
                { value: 'volume', label: METRIC_LABEL.volume },
              ]}
              className="w-full"
            />

            {summary && (
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Latest" value={fmt(summary.last, metric, settings.units)} />
                <Stat label="Best" value={fmt(summary.best, metric, settings.units)} />
                <Stat
                  label="Change"
                  value={`${summary.delta >= 0 ? '+' : ''}${fmt(summary.delta, metric, settings.units)}`}
                  tone={summary.delta >= 0 ? 'up' : 'down'}
                />
              </div>
            )}

            <Card className="p-3 pt-4">
              {!data || data.length === 0 ? (
                <p className="text-center text-fg-2 py-16 text-sm">
                  No data in this range. Log this exercise to see a trend.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#76767F"
                        fontSize={11}
                        tickLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        stroke="#76767F"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#141417',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 12,
                          fontSize: 13,
                        }}
                        labelStyle={{ color: '#ADADB5' }}
                        formatter={(value) => [
                          fmt(Number(value), metric, settings.units),
                          METRIC_LABEL[metric],
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey={metric}
                        stroke="#D6FF3F"
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: '#D6FF3F' }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <SegmentedControl<Range>
              value={range}
              onChange={setRange}
              options={[
                { value: '1m', label: '1M' },
                { value: '3m', label: '3M' },
                { value: '6m', label: '6M' },
                { value: '1y', label: '1Y' },
                { value: 'all', label: 'All' },
              ]}
              className="w-full"
            />
          </>
        )}
          </>
        )}
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(list) => list[0] && setExerciseId(list[0].id)}
      />
    </>
  )
}

function fmt(value: number, metric: Metric, units: ReturnType<typeof useSettings>['units']): string {
  const unit = unitLabel(units)
  if (metric === 'volume') return `${num(value, 0)} ${unit}`
  return `${num(value)} ${unit}`
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'up' | 'down'
}) {
  return (
    <div className="bg-surface-1 border border-line-2 rounded-xl p-3 text-center">
      <div
        className={`text-base font-bold tabular-nums ${
          tone === 'up' ? 'text-volt-dim' : tone === 'down' ? 'text-danger' : 'text-fg-1'
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-fg-3">{label}</div>
    </div>
  )
}

/** Weekly working-set volume per muscle group, with a week stepper. */
function MuscleGroupsView({ units }: { units: Units }) {
  const exercises = useExercises()
  const [weekOffset, setWeekOffset] = useState(0)
  const [metric, setMetric] = useState<'sets' | 'volume'>('sets')

  const muscleMap = useMemo(() => {
    const m = new Map<string, MuscleGroup>()
    for (const e of exercises) m.set(e.id, e.muscleGroup)
    return m
  }, [exercises])

  const ws = useMemo(() => addWeeks(weekStart(new Date()), weekOffset), [weekOffset])
  const wsMs = ws.getTime()
  const weekEndMs = useMemo(() => addWeeks(ws, 1).getTime(), [ws])

  const rows = useLiveQuery(
    async () => muscleBreakdown(await db.sessions.toArray(), muscleMap, wsMs, weekEndMs),
    [muscleMap, wsMs, weekEndMs],
  )

  const totalSets = (rows ?? []).reduce((n, r) => n + r.sets, 0)
  const maxVal = Math.max(
    1,
    ...(rows ?? []).map((r) => (metric === 'sets' ? r.sets : r.volumeKg)),
  )

  return (
    <>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Previous week"
          className="size-9 rounded-full bg-surface-1 border border-line-2 flex items-center justify-center active:bg-surface-2"
        >
          <IconChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="font-semibold">
            {weekOffset === 0 ? 'This week' : `Week of ${weekLabel(ws)}`}
          </div>
          <div className="text-xs text-fg-3 tabular-nums">{totalSets} hard sets</div>
        </div>
        <button
          onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
          disabled={weekOffset >= 0}
          aria-label="Next week"
          className="size-9 rounded-full bg-surface-1 border border-line-2 flex items-center justify-center active:bg-surface-2 disabled:opacity-30"
        >
          <IconChevronRight size={18} />
        </button>
      </div>

      <SegmentedControl<'sets' | 'volume'>
        value={metric}
        onChange={setMetric}
        options={[
          { value: 'sets', label: 'Sets' },
          { value: 'volume', label: 'Tonnage' },
        ]}
        className="w-full"
      />

      {rows === undefined ? null : rows.length === 0 ? (
        <EmptyState
          icon={<IconActivity size={40} />}
          title="No working sets this week"
          subtitle="Log some workouts to see volume per muscle group."
        />
      ) : (
        <Card className="p-4 space-y-3">
          {rows.map((r) => {
            const value = metric === 'sets' ? r.sets : r.volumeKg
            const pct = Math.round((value / maxVal) * 100)
            return (
              <div key={r.muscle}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm">{MUSCLE_LABEL[r.muscle]}</span>
                  <span className="font-mono tabular-nums text-sm font-semibold">
                    {metric === 'sets'
                      ? `${r.sets} ${r.sets === 1 ? 'set' : 'sets'}`
                      : `${displayWeight(r.volumeKg, units)} ${unitLabel(units)}`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full bg-volt" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </>
  )
}
