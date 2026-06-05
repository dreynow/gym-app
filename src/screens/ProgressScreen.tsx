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
import { useExercises } from '../hooks/useExercises'
import { useSettings } from '../hooks/useSettings'
import { bestsForEntry } from '../lib/pr'
import { kgToLb } from '../lib/calc'
import { num, unitLabel } from '../lib/format'
import { Header } from '../components/Header'
import { Card, EmptyState, SegmentedControl } from '../components/ui'
import { ExercisePicker } from '../components/ExercisePicker'
import { IconChart, IconChevronRight } from '../components/Icons'

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
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full flex items-center justify-between bg-ink-850 border border-ink-700/60 rounded-2xl px-4 py-3.5 active:bg-ink-800"
        >
          <div className="text-left">
            <div className="text-xs text-faint">Exercise</div>
            <div className="font-semibold">
              {activeExercise?.name ?? 'Select an exercise'}
            </div>
          </div>
          <IconChevronRight size={20} className="text-faint" />
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
                <p className="text-center text-muted py-16 text-sm">
                  No data in this range. Log this exercise to see a trend.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="#2a2a3a" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#6b6b80"
                        fontSize={11}
                        tickLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        stroke="#6b6b80"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#15151f',
                          border: '1px solid #2a2a3a',
                          borderRadius: 12,
                          fontSize: 13,
                        }}
                        labelStyle={{ color: '#9a9aae' }}
                        formatter={(value) => [
                          fmt(Number(value), metric, settings.units),
                          METRIC_LABEL[metric],
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey={metric}
                        stroke="#b6f43a"
                        strokeWidth={2.5}
                        dot={{ r: 2.5, fill: '#b6f43a' }}
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
    <div className="bg-ink-850 border border-ink-700/60 rounded-xl p-3 text-center">
      <div
        className={`text-base font-bold tabular-nums ${
          tone === 'up' ? 'text-volt-400' : tone === 'down' ? 'text-danger' : 'text-fg'
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  )
}
