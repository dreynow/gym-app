import { describe, it, expect } from 'vitest'
import { formatActivityType } from './labels'

describe('formatActivityType', () => {
  it('uses friendly overrides for common types', () => {
    expect(formatActivityType('TraditionalStrengthTraining')).toBe('Strength training')
    expect(formatActivityType('FunctionalStrengthTraining')).toBe('Functional strength')
    expect(formatActivityType('HighIntensityIntervalTraining')).toBe('HIIT')
  })

  it('splits CamelCase into sentence case otherwise', () => {
    expect(formatActivityType('Running')).toBe('Running')
    expect(formatActivityType('CardioDance')).toBe('Cardio dance')
    expect(formatActivityType('JumpRope')).toBe('Jump rope')
  })

  it('falls back to "Workout" for empty input', () => {
    expect(formatActivityType('')).toBe('Workout')
  })
})
