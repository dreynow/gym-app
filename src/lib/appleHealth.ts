import type { Session } from '../db/types'
import { lbToKg } from './calc'

/**
 * Parser + matcher for Apple Health exports (the `export.xml` inside the
 * "Export All Health Data" zip). Deliberately regex-based rather than
 * DOM-based: the file can be hundreds of MB (millions of raw samples), so we
 * scan only the handful of element types we care about and never build a DOM.
 *
 * Real exports routinely exceed V8's max string length (~512MB), so the file
 * must never be read into a single string. `parseAppleHealthStream` consumes a
 * ReadableStream and processes complete elements as they arrive, keeping only a
 * small carry-over buffer. `parseAppleHealthExport` keeps the whole-string API
 * for tests and small inputs and shares the same element parsing.
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

/** Parse one `<Workout ...>...</Workout>` block. */
function parseWorkoutBlock(block: string): HealthWorkout | null {
  const gt = block.indexOf('>')
  if (gt === -1) return null
  const open = block.slice(0, gt) // "<Workout ...attrs..."
  const body = block.slice(gt + 1) // children (plus a trailing "</Workout>")

  const startISO = parseAppleDate(attr(open, 'startDate'))
  const endISO = parseAppleDate(attr(open, 'endDate'))
  if (!startISO || !endISO) return null

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

  return {
    startISO,
    endISO,
    startMs,
    endMs,
    durationSec,
    hrAvgBpm: hrAvgBpm != null ? Math.round(hrAvgBpm) : null,
    hrMaxBpm: hrMaxBpm != null ? Math.round(hrMaxBpm) : null,
    energyKcal: energyKcal != null ? Math.round(energyKcal) : null,
    activityType: (attr(open, 'workoutActivityType') ?? '').replace('HKWorkoutActivityType', ''),
  }
}

/** Parse a `<Record ...>` opening tag, returning a body-mass reading or null. */
function parseBodyMassOpenTag(tag: string): HealthBodyMass | null {
  // Exact type match: a substring check would also catch BodyMassIndex (BMI),
  // importing e.g. a BMI of 24.2 as a 24.2kg bodyweight.
  if (attr(tag, 'type') !== BODY_MASS_TYPE) return null
  const dateISO = parseAppleDate(attr(tag, 'startDate'))
  const value = numAttr(tag, 'value')
  if (!dateISO || value == null) return null
  const unit = (attr(tag, 'unit') ?? 'kg').toLowerCase()
  const weightKg = unit.startsWith('lb') ? lbToKg(value) : value
  return { dateISO, weightKg: Math.round(weightKg * 10) / 10 }
}

const WORKOUT_OPEN = '<Workout ' // trailing space excludes <WorkoutEvent>/<WorkoutStatistics>
const WORKOUT_CLOSE = '</Workout>'
const RECORD_OPEN = '<Record '
/** Longest opening token, used to size the cross-chunk carry-over. */
const MAX_TOKEN = WORKOUT_OPEN.length

interface Sink {
  workouts: HealthWorkout[]
  bodyMass: HealthBodyMass[]
}

/**
 * Pull every *complete* `<Workout>...</Workout>` and `<Record .../>` out of the
 * buffer into the sink, and return the unconsumed remainder (a partial element
 * at the tail, or a few chars in case an opening token was split mid-chunk).
 * Non-element text is dropped so memory stays bounded while streaming.
 */
function drainBuffer(buf: string, sink: Sink): string {
  let i = 0
  for (;;) {
    const wi = buf.indexOf(WORKOUT_OPEN, i)
    const ri = buf.indexOf(RECORD_OPEN, i)
    if (wi === -1 && ri === -1) {
      // No more elements; keep a short tail in case a token spans the boundary.
      return buf.slice(Math.max(i, buf.length - MAX_TOKEN))
    }
    const takeWorkout = ri === -1 || (wi !== -1 && wi < ri)
    if (takeWorkout) {
      const end = buf.indexOf(WORKOUT_CLOSE, wi)
      if (end === -1) return buf.slice(wi) // workout not closed yet
      const w = parseWorkoutBlock(buf.slice(wi, end + WORKOUT_CLOSE.length))
      if (w) sink.workouts.push(w)
      i = end + WORKOUT_CLOSE.length
    } else {
      const gt = buf.indexOf('>', ri)
      if (gt === -1) return buf.slice(ri) // record tag not closed yet
      const b = parseBodyMassOpenTag(buf.slice(ri, gt + 1))
      if (b) sink.bodyMass.push(b)
      i = gt + 1
    }
  }
}

export function parseAppleHealthExport(xml: string): AppleHealthData {
  const sink: Sink = { workouts: [], bodyMass: [] }
  drainBuffer(xml, sink)
  return sink
}

/**
 * Stream a (possibly multi-hundred-MB) export through the same element parser
 * without ever materialising it as one string. Safe for files far larger than
 * V8's max string length.
 */
export async function parseAppleHealthStream(
  stream: ReadableStream<Uint8Array>,
): Promise<AppleHealthData> {
  const sink: Sink = { workouts: [], bodyMass: [] }
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')
  let buf = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      buf = drainBuffer(buf, sink)
    }
    buf += decoder.decode()
    drainBuffer(buf, sink)
  } finally {
    reader.releaseLock()
  }
  return sink
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
): {
  patches: Map<string, SessionHealthPatch>
  matched: number
  unmatched: number
  /** Workouts that overlapped no existing session (candidates to backfill). */
  unmatchedWorkouts: HealthWorkout[]
} {
  const patches = new Map<string, SessionHealthPatch>()
  const bestOverlap = new Map<string, number>()
  const usedWorkouts = new Set<HealthWorkout>()
  const unmatchedWorkouts: HealthWorkout[] = []

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
    // No overlap with any session: nothing to enrich, so it can be backfilled.
    if (best === 0) unmatchedWorkouts.push(w)
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
    unmatchedWorkouts,
  }
}
