import type { Session } from '../db/types'
import { lbToKg } from './calc'

/**
 * Parser + matcher for Apple Health exports (the `export.xml` inside the
 * "Export All Health Data" zip). Deliberately regex-based rather than
 * DOM-based: the file can be hundreds of MB (millions of raw samples), so we
 * scan only the handful of element types we care about and never build a DOM.
 *
 * For heart rate and energy we read each workout's pre-aggregated
 * `<WorkoutStatistics>` (avg/max/sum) instead of the raw sample stream, which
 * keeps this fast and light even on a phone.
 */

export interface HealthWorkout {
  startISO: string
  endISO: string
  startMs: number
  endMs: number
  durationSec: number
  hrAvgBpm: number | null
  hrMaxBpm: number | null
  energyKcal: number | null
  activityType: string
}

export interface HealthBodyMass {
  dateISO: string
  weightKg: number
}

export interface AppleHealthData {
  workouts: HealthWorkout[]
  bodyMass: HealthBodyMass[]
}

/** Apple dates look like "2026-05-01 07:30:00 +0100"; normalise to ISO. */
export function parseAppleDate(value: string | null | undefined): string | null {
  if (!value) return null
  const m = value.match(
    /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s*([+-]\d{2}):?(\d{2})?/,
  )
  if (!m) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const [, date, time, tzH, tzM = '00'] = m
  const iso = `${date}T${time}${tzH}:${tzM}`
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`))
  return m ? m[1] : null
}

function numAttr(tag: string, name: string): number | null {
  const v = attr(tag, name)
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const HR_TYPE = 'HKQuantityTypeIdentifierHeartRate'
const ENERGY_TYPE = 'HKQuantityTypeIdentifierActiveEnergyBurned'
const BODY_MASS_TYPE = 'HKQuantityTypeIdentifierBodyMass'

export function parseAppleHealthExport(xml: string): AppleHealthData {
  const workouts: HealthWorkout[] = []

  // Each <Workout ...> ... </Workout> (workouts always carry child elements).
  const workoutRe = /<Workout\b([^>]*)>([\s\S]*?)<\/Workout>/g
  for (let m = workoutRe.exec(xml); m; m = workoutRe.exec(xml)) {
    const open = m[1]
    const body = m[2]
    const startISO = parseAppleDate(attr(open, 'startDate'))
    const endISO = parseAppleDate(attr(open, 'endDate'))
    if (!startISO || !endISO) continue

    let hrAvgBpm: number | null = null
    let hrMaxBpm: number | null = null
    let energyKcal: number | null = null

    const statRe = /<WorkoutStatistics\b([^>]*)\/?>/g
    for (let s = statRe.exec(body); s; s = statRe.exec(body)) {
      const stat = s[1]
      const type = attr(stat, 'type')
      if (type === HR_TYPE) {
        hrAvgBpm = numAttr(stat, 'average')
        hrMaxBpm = numAttr(stat, 'maximum')
      } else if (type === ENERGY_TYPE) {
        energyKcal = numAttr(stat, 'sum')
      }
    }

    // Older exports put total energy on the Workout element itself.
    if (energyKcal == null) {
      const total = numAttr(open, 'totalEnergyBurned')
      if (total != null) energyKcal = total
    }

    const startMs = new Date(startISO).getTime()
    const endMs = new Date(endISO).getTime()
    let durationSec = Math.round((endMs - startMs) / 1000)
    const durAttr = numAttr(open, 'duration')
    if ((!durationSec || durationSec < 0) && durAttr != null) {
      const unit = attr(open, 'durationUnit')
      durationSec = Math.round(durAttr * (unit === 'min' ? 60 : unit === 'h' ? 3600 : 1))
    }

    workouts.push({
      startISO,
      endISO,
      startMs,
      endMs,
      durationSec,
      hrAvgBpm: hrAvgBpm != null ? Math.round(hrAvgBpm) : null,
      hrMaxBpm: hrMaxBpm != null ? Math.round(hrMaxBpm) : null,
      energyKcal: energyKcal != null ? Math.round(energyKcal) : null,
      activityType: (attr(open, 'workoutActivityType') ?? '').replace('HKWorkoutActivityType', ''),
    })
  }

  // Body mass records (self-closing or with children — attributes are in the
  // opening tag either way).
  const bodyMass: HealthBodyMass[] = []
  const recordRe = /<Record\b([^>]*)>/g
  for (let m = recordRe.exec(xml); m; m = recordRe.exec(xml)) {
    const tag = m[1]
    if (!tag.includes(BODY_MASS_TYPE)) continue
    const dateISO = parseAppleDate(attr(tag, 'startDate'))
    const value = numAttr(tag, 'value')
    if (!dateISO || value == null) continue
    const unit = (attr(tag, 'unit') ?? 'kg').toLowerCase()
    const weightKg = unit.startsWith('lb') ? lbToKg(value) : value
    bodyMass.push({ dateISO, weightKg: Math.round(weightKg * 10) / 10 })
  }

  return { workouts, bodyMass }
}

export interface SessionHealthPatch {
  heartRateAvgBpm: number | null
  heartRateMaxBpm: number | null
  activeEnergyKcal: number | null
  healthSource: string
}

/** Overlap in ms between two [start,end] ranges (0 if disjoint). */
function overlapMs(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
}

/**
 * Match watch workouts to logged sessions by time overlap. Each session is
 * attached the single workout it overlaps most (if any). Returns the per-session
 * patch plus counts for a summary.
 */
export function matchWorkoutsToSessions(
  workouts: HealthWorkout[],
  sessions: Pick<Session, 'id' | 'startedAt' | 'durationSeconds' | 'dateISO'>[],
): { patches: Map<string, SessionHealthPatch>; matched: number; unmatched: number } {
  const patches = new Map<string, SessionHealthPatch>()
  const bestOverlap = new Map<string, number>()
  const usedWorkouts = new Set<HealthWorkout>()

  for (const w of workouts) {
    let bestSessionId: string | null = null
    let best = 0
    for (const s of sessions) {
      const start = new Date(s.startedAt || s.dateISO).getTime()
      const end = start + Math.max(0, s.durationSeconds) * 1000
      // Allow a small slop so a session logged with no/short duration still
      // matches a workout that started around the same time (5 min window).
      const ov = overlapMs(w.startMs, w.endMs, start - 300_000, end + 300_000)
      if (ov > best) {
        best = ov
        bestSessionId = s.id
      }
    }
    if (bestSessionId && best > 0 && best > (bestOverlap.get(bestSessionId) ?? 0)) {
      bestOverlap.set(bestSessionId, best)
      patches.set(bestSessionId, {
        heartRateAvgBpm: w.hrAvgBpm,
        heartRateMaxBpm: w.hrMaxBpm,
        activeEnergyKcal: w.energyKcal,
        healthSource: 'apple-health',
      })
      usedWorkouts.add(w)
    }
  }

  return {
    patches,
    matched: usedWorkouts.size,
    unmatched: workouts.length - usedWorkouts.size,
  }
}
