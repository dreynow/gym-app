import { describe, it, expect } from 'vitest'
import {
  matchWorkoutsToSessions,
  parseAppleDate,
  parseAppleHealthExport,
} from './appleHealth'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_GB">
  <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale" unit="kg" startDate="2026-05-01 07:00:00 +0100" endDate="2026-05-01 07:00:00 +0100" value="82.5"/>
  <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale" unit="lb" startDate="2026-05-02 07:00:00 +0100" endDate="2026-05-02 07:00:00 +0100" value="180"/>
  <Record type="HKQuantityTypeIdentifierHeartRate" unit="count/min" startDate="2026-05-01 18:10:00 +0100" value="140"/>
  <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="45" durationUnit="min" startDate="2026-05-01 18:00:00 +0100" endDate="2026-05-01 18:45:00 +0100" sourceName="Apple Watch">
    <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" average="132.6" minimum="80" maximum="171" unit="count/min"/>
    <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="412.4" unit="kcal"/>
    <MetadataEntry key="HKIndoorWorkout" value="1"/>
  </Workout>
</HealthData>`

describe('parseAppleDate', () => {
  it('normalises Apple timestamps to ISO/UTC', () => {
    // 18:00 +0100 is 17:00 UTC.
    expect(parseAppleDate('2026-05-01 18:00:00 +0100')).toBe('2026-05-01T17:00:00.000Z')
  })
  it('returns null for junk', () => {
    expect(parseAppleDate('not a date')).toBeNull()
    expect(parseAppleDate(null)).toBeNull()
  })
})

describe('parseAppleHealthExport', () => {
  const data = parseAppleHealthExport(SAMPLE)

  it('reads per-workout HR + energy from WorkoutStatistics', () => {
    expect(data.workouts).toHaveLength(1)
    const w = data.workouts[0]
    expect(w.hrAvgBpm).toBe(133) // rounded from 132.6
    expect(w.hrMaxBpm).toBe(171)
    expect(w.energyKcal).toBe(412)
    expect(w.durationSec).toBe(45 * 60)
    expect(w.activityType).toBe('TraditionalStrengthTraining')
  })

  it('reads bodyweight records and converts lb to kg', () => {
    expect(data.bodyMass).toHaveLength(2)
    expect(data.bodyMass[0].weightKg).toBe(82.5)
    expect(data.bodyMass[1].weightKg).toBeCloseTo(81.6, 1) // 180 lb
  })
})

describe('matchWorkoutsToSessions', () => {
  const { workouts } = parseAppleHealthExport(SAMPLE)

  it('attaches a workout to the session it overlaps', () => {
    const sessions = [
      { id: 's1', startedAt: '2026-05-01T17:05:00.000Z', durationSeconds: 1800, dateISO: '2026-05-01T17:05:00.000Z' },
    ]
    const { patches, matched, unmatched } = matchWorkoutsToSessions(workouts, sessions)
    expect(matched).toBe(1)
    expect(unmatched).toBe(0)
    const patch = patches.get('s1')!
    expect(patch.heartRateAvgBpm).toBe(133)
    expect(patch.activeEnergyKcal).toBe(412)
    expect(patch.healthSource).toBe('apple-health')
  })

  it('leaves non-overlapping sessions untouched', () => {
    const sessions = [
      { id: 's2', startedAt: '2026-04-01T10:00:00.000Z', durationSeconds: 1800, dateISO: '2026-04-01T10:00:00.000Z' },
    ]
    const { patches, matched, unmatched } = matchWorkoutsToSessions(workouts, sessions)
    expect(patches.size).toBe(0)
    expect(matched).toBe(0)
    expect(unmatched).toBe(1)
  })
})
