import { describe, it, expect } from 'vitest'
import type { Meal } from '../db/types'
import { dayLabel, mealTotals, shiftDayKey } from './meals'

const meal = (over: Partial<Meal>): Meal => ({
  id: 'm',
  day: '2026-06-05',
  name: 'Meal',
  calories: 0,
  proteinG: 0,
  createdAt: '2026-06-05T00:00:00.000Z',
  ...over,
})

describe('mealTotals', () => {
  it('sums calories and protein', () => {
    const totals = mealTotals([
      meal({ calories: 600, proteinG: 40 }),
      meal({ calories: 250, proteinG: 30 }),
    ])
    expect(totals).toEqual({ calories: 850, proteinG: 70 })
  })

  it('is zero for no meals', () => {
    expect(mealTotals([])).toEqual({ calories: 0, proteinG: 0 })
  })
})

describe('day key helpers', () => {
  it('shifts day keys across month boundaries', () => {
    expect(shiftDayKey('2026-06-01', -1)).toBe('2026-05-31')
    expect(shiftDayKey('2026-06-05', 1)).toBe('2026-06-06')
  })

  it('labels today and yesterday relative to a reference', () => {
    expect(dayLabel('2026-06-05', '2026-06-05')).toBe('Today')
    expect(dayLabel('2026-06-04', '2026-06-05')).toBe('Yesterday')
  })
})
