import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { deleteMeal, newMeal, saveMeal } from '../db/repo'
import { dayKey } from '../lib/streaks'
import { dayLabel, mealTotals, shiftDayKey } from '../lib/meals'
import { num } from '../lib/format'
import { Header } from '../components/Header'
import { Button, Card, EmptyState, Field, IconButton, TextInput } from '../components/ui'
import {
  IconChevronLeft,
  IconChevronRight,
  IconFlame,
  IconMeal,
  IconPlus,
  IconTrash,
} from '../components/Icons'

export function MealsScreen() {
  const [day, setDay] = useState(() => dayKey(new Date()))
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')

  const meals = useLiveQuery(
    () => db.meals.where('day').equals(day).reverse().sortBy('createdAt'),
    [day],
    [],
  )
  const totals = mealTotals(meals ?? [])
  const today = dayKey(new Date())
  const canAdd = name.trim() !== '' && calories.trim() !== '' && Number(calories) >= 0

  async function add() {
    if (!canAdd) return
    await saveMeal(
      newMeal({
        day,
        name: name.trim(),
        calories: Math.round(Number(calories)) || 0,
        proteinG: Math.round(Number(protein)) || 0,
      }),
    )
    setName('')
    setCalories('')
    setProtein('')
  }

  return (
    <>
      <Header title="Meals" subtitle="Calories and protein" />
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <IconButton label="Previous day" onClick={() => setDay((d) => shiftDayKey(d, -1))}>
            <IconChevronLeft size={20} />
          </IconButton>
          <span className="font-semibold">{dayLabel(day)}</span>
          <IconButton
            label="Next day"
            disabled={day >= today}
            onClick={() => setDay((d) => shiftDayKey(d, 1))}
          >
            <IconChevronRight size={20} />
          </IconButton>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-1 border border-line-2 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-2xl font-bold font-mono tabular-nums">
              <IconFlame size={18} className="text-warning" />
              {num(totals.calories, 0)}
            </div>
            <div className="text-xs text-fg-3 mt-0.5">calories</div>
          </div>
          <div className="bg-surface-1 border border-line-2 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold font-mono tabular-nums text-volt">
              {num(totals.proteinG, 0)}
              <span className="text-base text-fg-2">g</span>
            </div>
            <div className="text-xs text-fg-3 mt-0.5">protein</div>
          </div>
        </div>

        <Card className="p-4 space-y-3">
          <Field label="Meal">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chicken and rice"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calories">
              <TextInput
                type="number"
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="kcal"
              />
            </Field>
            <Field label="Protein (g)">
              <TextInput
                type="number"
                inputMode="numeric"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="g"
              />
            </Field>
          </div>
          <Button variant="primary" full disabled={!canAdd} onClick={() => void add()}>
            <IconPlus size={18} /> Add meal
          </Button>
        </Card>

        {meals && meals.length === 0 ? (
          <EmptyState
            icon={<IconMeal size={40} />}
            title="No meals logged"
            subtitle="Add what you ate to track calories and protein for the day."
          />
        ) : (
          <div className="space-y-2">
            {(meals ?? []).map((m) => (
              <Card key={m.id} className="p-3.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-xs text-fg-3 font-mono tabular-nums">
                    {num(m.calories, 0)} kcal · {num(m.proteinG, 0)}g protein
                  </div>
                </div>
                <IconButton
                  label="Delete meal"
                  variant="ghost"
                  onClick={() => void deleteMeal(m.id)}
                >
                  <IconTrash size={18} />
                </IconButton>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
