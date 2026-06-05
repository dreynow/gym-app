import { describe, it, expect } from 'vitest'
import {
  matchWorkoutsToSessions,
  parseAppleDate,
  parseAppleHealthExport,
  parseAppleHealthStream,
} from './appleHealth'

/** A ReadableStream that emits the given string chunks, as the browser would. */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(enc.encode(chunks[i++]))
      else controller.close()
    },
  })
}

/** Split a string into n roughly-equal chunks (to land mid-element). */
function chunk(s: string, n: number): string[] {
  const size = Math.ceil(s.length / n)
  const out: string[] = []
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size))
  return out
}

// Mirrors the real export shape: a workout with WorkoutEvent children + HR
// avg/max + active energy in kcal, a non-watch workout with no HR, real-format
// BodyMass records, and a BodyMassIndex (BMI) record that must NOT be read as
// bodyweight.
const REAL_SHAPE = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_GB">
  <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Health" unit="kg" startDate="2022-04-25 18:41:03 +0100" endDate="2022-04-25 18:41:03 +0100" value="90.5"/>
  <Record type="HKQuantityTypeIdentifierBodyMassIndex" sourceName="Health" unit="count" startDate="2019-09-24 10:47:00 +0100" endDate="2019-09-24 10:47:00 +0100" value="24.17"/>
  <Record type="HKQuantityTypeIdentifierHeartRate" unit="count/min" startDate="2026-05-01 18:10:00 +0100" value="140"/>
  <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="45" durationUnit="min" sourceName="Apple Watch" startDate="2026-05-01 18:00:00 +0100" endDate="2026-05-01 18:45:00 +0100">
    <MetadataEntry key="HKIndoorWorkout" value="1"/>
    <WorkoutEvent type="HKWorkoutEventTypePause" date="2026-05-01 18:20:00 +0100"/>
    <WorkoutEvent type="HKWorkoutEventTypeResume" date="2026-05-01 18:21:00 +0100"/>
    <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" startDate="2026-05-01 18:00:00 +0100" endDate="2026-05-01 18:45:00 +0100" average="132.6" minimum="80" maximum="171" unit="count/min"/>
    <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" startDate="2026-05-01 18:00:00 +0100" endDate="2026-05-01 18:45:00 +0100" sum="412.4" unit="kcal"/>
  </Workout>
  <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="27.2" durationUnit="min" sourceName="Nike Run Club" startDate="2026-05-02 08:00:00 +0100" endDate="2026-05-02 08:27:00 +0100">
    <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" startDate="2026-05-02 08:00:00 +0100" endDate="2026-05-02 08:27:00 +0100" sum="203.2" unit="kcal"/>
  </Workout>
</HealthData>`

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

describe('real-format export', () => {
  const data = parseAppleHealthExport(REAL_SHAPE)

  it('reads HR + energy from a watch workout and energy-only from a non-watch one', () => {
    expect(data.workouts).toHaveLength(2)
    const strength = data.workouts.find((w) => w.activityType === 'TraditionalStrengthTraining')!
    expect(strength.hrAvgBpm).toBe(133)
    expect(strength.hrMaxBpm).toBe(171)
    expect(strength.energyKcal).toBe(412)
    const run = data.workouts.find((w) => w.activityType === 'Running')!
    expect(run.hrAvgBpm).toBeNull() // no watch HR for Nike Run Club
    expect(run.energyKcal).toBe(203)
  })

  it('does not import a BodyMassIndex (BMI) record as bodyweight', () => {
    // Only the real BodyMass record (90.5kg) should appear, not the BMI 24.17.
    expect(data.bodyMass).toHaveLength(1)
    expect(data.bodyMass[0].weightKg).toBe(90.5)
  })
})

describe('parseAppleHealthStream', () => {
  it('matches the whole-string parse even when elements span chunk boundaries', async () => {
    const expected = parseAppleHealthExport(REAL_SHAPE)
    // 7 chunks guarantees splits land inside tags and across element seams.
    const streamed = await parseAppleHealthStream(streamOf(chunk(REAL_SHAPE, 7)))
    expect(streamed).toEqual(expected)
  })

  it('handles a single giant chunk and an empty stream', async () => {
    const whole = await parseAppleHealthStream(streamOf([REAL_SHAPE]))
    expect(whole.workouts).toHaveLength(2)
    const empty = await parseAppleHealthStream(streamOf([]))
    expect(empty).toEqual({ workouts: [], bodyMass: [] })
  })
})
