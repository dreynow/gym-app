import { useMemo, useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { calcPlates } from '../lib/calc'
import { num } from '../lib/format'
import { Button, Field, Sheet, TextInput } from './ui'

/** Color per plate denomination, loosely following competition plate colors. */
function plateColor(kg: number): string {
  if (kg >= 25) return 'bg-danger/80 text-white'
  if (kg >= 20) return 'bg-blue-500/80 text-white'
  if (kg >= 15) return 'bg-yellow-500/80 text-on-volt'
  if (kg >= 10) return 'bg-green-500/80 text-white'
  if (kg >= 5) return 'bg-surface-4 text-fg-1'
  return 'bg-surface-4 text-fg-1'
}

export function PlateCalculator({
  open,
  onClose,
  initialTargetKg,
}: {
  open: boolean
  onClose: () => void
  initialTargetKg?: number | null
}) {
  const settings = useSettings()
  const [target, setTarget] = useState<string>('')
  const [bar, setBar] = useState<number>(settings.defaultBarKg)

  // Initialise the target from the calling exercise's working weight.
  const effectiveTarget = target === '' ? (initialTargetKg ?? 0) : Number(target)

  const layout = useMemo(
    () => calcPlates(effectiveTarget, bar, settings.plateInventoryKg),
    [effectiveTarget, bar, settings.plateInventoryKg],
  )

  // Group identical plates: [20,20,10] -> [{kg:20,count:2},{kg:10,count:1}].
  const grouped = useMemo(() => {
    const map = new Map<number, number>()
    for (const p of layout.perSide) map.set(p, (map.get(p) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [layout.perSide])

  return (
    <Sheet open={open} onClose={onClose} title="Plate calculator">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target weight (kg)">
            <TextInput
              type="number"
              inputMode="decimal"
              value={target}
              placeholder={initialTargetKg ? num(initialTargetKg) : '60'}
              onChange={(e) => setTarget(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Bar weight (kg)">
            <TextInput
              type="number"
              inputMode="decimal"
              value={bar}
              onChange={(e) => setBar(Math.max(0, Number(e.target.value) || 0))}
            />
          </Field>
        </div>

        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-xs text-fg-2 mb-3 text-center">Load per side</p>
          {grouped.length === 0 ? (
            <p className="text-center text-fg-2 py-6">
              {effectiveTarget <= bar
                ? 'Just the bar, no plates needed.'
                : 'Enter a weight above.'}
            </p>
          ) : (
            <div className="flex items-end justify-center gap-1.5 min-h-24">
              {layout.perSide.map((kg, i) => (
                <div
                  key={i}
                  className={`grid place-items-center rounded-md font-bold text-xs ${plateColor(kg)}`}
                  style={{
                    width: 26,
                    height: 40 + Math.min(60, kg * 2.4),
                  }}
                >
                  {num(kg)}
                </div>
              ))}
            </div>
          )}

          {grouped.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {grouped.map(([kg, count]) => (
                <span
                  key={kg}
                  className="text-sm font-medium px-2.5 py-1 rounded-lg bg-surface-3"
                >
                  {count} × {num(kg)}kg
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-fg-2">Total on bar</span>
          <span className="font-semibold tabular-nums">{num(layout.achievableKg)} kg</span>
        </div>
        {layout.remainderKg > 0 && (
          <p className="text-xs text-warning">
            Can't make exact weight with your plates. Off by{' '}
            {num(layout.remainderKg * 2)} kg total. Adjust plates in Settings.
          </p>
        )}

        <Button variant="subtle" full onClick={onClose}>
          Done
        </Button>
      </div>
    </Sheet>
  )
}
