import { useEffect, useMemo, useState } from 'react'
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
import { deleteBodyMetric, newBodyMetric, saveBodyMetric } from '../db/repo'
import type { BodyMetric } from '../db/types'
import { useSettings } from '../hooks/useSettings'
import { kgToLb, lbToKg } from '../lib/calc'
import { displayWeight, num, relativeDate, toDateInputValue, unitLabel } from '../lib/format'
import { Header } from '../components/Header'
import {
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Pill,
  SegmentedControl,
  Sheet,
  TextInput,
} from '../components/ui'
import { IconBody, IconPlus, IconTrash } from '../components/Icons'

type View = 'weight' | 'waist'
const WEEK_MS = 7 * 86_400_000

export function BodyScreen() {
  const settings = useSettings()
  const units = settings.units
  const [view, setView] = useState<View>('weight')
  const [editing, setEditing] = useState<BodyMetric | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const metrics = useLiveQuery(
    () => db.bodyMetrics.orderBy('dateISO').toArray(),
    [],
    [] as BodyMetric[],
  )

  // Weight line uses a trailing 7-day rolling average to smooth daily noise.
  const weightData = useMemo(() => {
    const points = metrics
      .filter((m) => m.weightKg != null)
      .map((m) => ({ ts: new Date(m.dateISO).getTime(), kg: m.weightKg! }))
      .sort((a, b) => a.ts - b.ts)
    return points.map((p) => {
      const windowPts = points.filter((q) => q.ts <= p.ts && q.ts > p.ts - WEEK_MS)
      const avgKg = windowPts.reduce((s, q) => s + q.kg, 0) / windowPts.length
      return {
        ts: p.ts,
        label: new Date(p.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        raw: round(units === 'lb' ? kgToLb(p.kg) : p.kg),
        avg: round(units === 'lb' ? kgToLb(avgKg) : avgKg),
      }
    })
  }, [metrics, units])

  const waistData = useMemo(
    () =>
      metrics
        .filter((m) => m.waistCm != null)
        .map((m) => ({
          ts: new Date(m.dateISO).getTime(),
          label: new Date(m.dateISO).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          waist: round(m.waistCm!),
        }))
        .sort((a, b) => a.ts - b.ts),
    [metrics],
  )

  const latest = metrics[metrics.length - 1]
  const chartData = view === 'weight' ? weightData : waistData
  const lineKey = view === 'weight' ? 'avg' : 'waist'

  function openAdd() {
    setEditing(null)
    setSheetOpen(true)
  }
  function openEdit(m: BodyMetric) {
    setEditing(m)
    setSheetOpen(true)
  }

  return (
    <>
      <Header
        title="Body"
        subtitle="Weight and waist trends"
        action={
          <IconButton label="Add entry" variant="primary" onClick={openAdd}>
            <IconPlus size={20} />
          </IconButton>
        }
      />

      <div className="p-4 space-y-4">
        {latest && (
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-4">
              <div className="text-xs text-faint">Latest weight</div>
              <div className="text-2xl font-bold tabular-nums">
                {displayWeight(latest.weightKg, units)}{' '}
                <span className="text-sm text-muted font-normal">{unitLabel(units)}</span>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-faint">Latest waist</div>
              <div className="text-2xl font-bold tabular-nums">
                {latest.waistCm != null ? num(latest.waistCm) : '—'}{' '}
                <span className="text-sm text-muted font-normal">cm</span>
              </div>
            </Card>
          </div>
        )}

        <SegmentedControl<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'weight', label: `Weight (7d avg)` },
            { value: 'waist', label: 'Waist' },
          ]}
          className="w-full"
        />

        <Card className="p-3 pt-4">
          {chartData.length === 0 ? (
            <p className="text-center text-muted py-16 text-sm">
              No {view} entries yet.
            </p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData as Record<string, number | string>[]}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid stroke="#2a2a3a" vertical={false} />
                  <XAxis dataKey="label" stroke="#6b6b80" fontSize={11} tickLine={false} minTickGap={24} />
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
                  />
                  {view === 'weight' && (
                    <Line
                      type="monotone"
                      dataKey="raw"
                      stroke="#3a3a4f"
                      strokeWidth={1}
                      dot={{ r: 1.5, fill: '#3a3a4f' }}
                      isAnimationActive={false}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey={lineKey}
                    stroke={view === 'weight' ? '#b6f43a' : '#38e0d0'}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">
            Entries
          </h2>
          {metrics.length === 0 ? (
            <EmptyState
              icon={<IconBody size={40} />}
              title="No measurements yet"
              subtitle="Log your weight and waist to track the trend."
              action={
                <Button variant="primary" onClick={openAdd}>
                  <IconPlus size={18} /> Add entry
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {[...metrics].reverse().map((m) => (
                <Card key={m.id} className="flex items-center gap-3 p-3">
                  <button onClick={() => openEdit(m)} className="flex-1 text-left">
                    <div className="text-sm font-medium">{relativeDate(m.dateISO)}</div>
                    <div className="flex gap-2 mt-1">
                      {m.weightKg != null && (
                        <Pill tone="volt">
                          {displayWeight(m.weightKg, units)} {unitLabel(units)}
                        </Pill>
                      )}
                      {m.waistCm != null && <Pill tone="cyan">{num(m.waistCm)} cm</Pill>}
                      {m.bodyFatPct != null && <Pill tone="muted">{num(m.bodyFatPct)}% bf</Pill>}
                    </div>
                  </button>
                  <IconButton
                    label="Delete entry"
                    variant="danger"
                    onClick={() => void deleteBodyMetric(m.id)}
                  >
                    <IconTrash size={18} />
                  </IconButton>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <BodyMetricSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        existing={editing}
      />
    </>
  )
}

function BodyMetricSheet({
  open,
  onClose,
  existing,
}: {
  open: boolean
  onClose: () => void
  existing: BodyMetric | null
}) {
  const settings = useSettings()
  const units = settings.units
  const [date, setDate] = useState('')
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [bodyFat, setBodyFat] = useState('')

  // Reset the form whenever the sheet opens or the target entry changes.
  useEffect(() => {
    if (!open) return
    setDate(toDateInputValue(existing?.dateISO ?? new Date().toISOString()))
    setWeight(
      existing?.weightKg != null
        ? num(units === 'lb' ? kgToLb(existing.weightKg) : existing.weightKg, 2)
        : '',
    )
    setWaist(existing?.waistCm != null ? String(existing.waistCm) : '')
    setBodyFat(existing?.bodyFatPct != null ? String(existing.bodyFatPct) : '')
  }, [open, existing, units])

  async function save() {
    const weightNum = weight === '' ? null : Number(weight)
    const weightKg = weightNum == null ? null : units === 'lb' ? lbToKg(weightNum) : weightNum
    const dateISO = new Date(`${date}T12:00:00`).toISOString()
    const metric: BodyMetric = existing
      ? {
          ...existing,
          dateISO,
          weightKg,
          waistCm: waist === '' ? null : Number(waist),
          bodyFatPct: bodyFat === '' ? null : Number(bodyFat),
        }
      : newBodyMetric({
          dateISO,
          weightKg,
          waistCm: waist === '' ? null : Number(waist),
          bodyFatPct: bodyFat === '' ? null : Number(bodyFat),
        })
    await saveBodyMetric(metric)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={existing ? 'Edit entry' : 'Log measurement'}
      footer={
        <Button variant="primary" full onClick={save}>
          {existing ? 'Save' : 'Add entry'}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Weight (${unitLabel(units)})`}>
            <TextInput
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Waist (cm)">
            <TextInput
              type="number"
              inputMode="decimal"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
        <Field label="Body fat % (optional)">
          <TextInput
            type="number"
            inputMode="decimal"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            placeholder="optional"
          />
        </Field>
      </div>
    </Sheet>
  )
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
