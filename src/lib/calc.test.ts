import { describe, it, expect } from 'vitest'
import {
  calcPlates,
  entryBestE1RM,
  epley1RM,
  kgToLb,
  lbToKg,
  setVolume,
  topSetWeight,
} from './calc'
import type { SessionEntry, WorkoutSet } from '../db/types'

const set = (weightKg: number | null, reps: number | null, type: WorkoutSet['type'] = 'working'): WorkoutSet => ({
  weightKg,
  reps,
  rpe: null,
  type,
  done: true,
})

const entry = (sets: WorkoutSet[]): SessionEntry => ({ exerciseId: 'x', sets })

describe('epley1RM', () => {
  it('returns the weight for a single rep', () => {
    expect(epley1RM(100, 1)).toBe(100)
  })
  it('applies the Epley formula for multi-rep sets', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.667, 2)
    expect(epley1RM(60, 10)).toBeCloseTo(80, 5)
  })
  it('is zero for empty/invalid input', () => {
    expect(epley1RM(0, 5)).toBe(0)
    expect(epley1RM(100, 0)).toBe(0)
  })
})

describe('set + entry maths', () => {
  it('computes set volume and ignores blanks', () => {
    expect(setVolume(set(100, 5))).toBe(500)
    expect(setVolume(set(null, 5))).toBe(0)
    expect(setVolume(set(100, null))).toBe(0)
  })
  it('finds the top set weight and best e1RM across an entry', () => {
    const e = entry([set(60, 5, 'warmup'), set(100, 5), set(90, 8)])
    expect(topSetWeight(e)).toBe(100)
    // 90x8 -> 114, 100x5 -> 116.67, so best is the 100x5 set.
    expect(entryBestE1RM(e)).toBeCloseTo(116.667, 2)
  })
})

describe('calcPlates (greedy, 20kg bar, standard kg inventory)', () => {
  const inv = [25, 20, 15, 10, 5, 2.5, 1.25]

  it('loads two plates per side for 100kg', () => {
    const r = calcPlates(100, 20, inv)
    expect(r.perSide).toEqual([25, 15])
    expect(r.remainderKg).toBe(0)
    expect(r.achievableKg).toBe(100)
  })
  it('just the bar when target <= bar', () => {
    const r = calcPlates(20, 20, inv)
    expect(r.perSide).toEqual([])
    expect(r.achievableKg).toBe(20)
  })
  it('reports the remainder when plates cannot make the exact weight', () => {
    const r = calcPlates(101, 20, inv)
    // 40.5 per side -> 25 + 15 = 40, 0.5 left per side.
    expect(r.perSide).toEqual([25, 15])
    expect(r.remainderKg).toBeCloseTo(0.5, 5)
    expect(r.achievableKg).toBeCloseTo(100, 5)
  })
})

describe('unit conversion', () => {
  it('round-trips kg <-> lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2)
    expect(lbToKg(kgToLb(100))).toBeCloseTo(100, 6)
  })
})
