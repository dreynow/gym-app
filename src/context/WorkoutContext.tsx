import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { db } from '../db/db'
import {
  saveSession,
  startSession as buildSession,
} from '../db/repo'
import { recordSessionPRs } from '../lib/pr'
import type {
  Exercise,
  Routine,
  Session,
  SessionEntry,
  SetType,
  WorkoutSet,
} from '../db/types'

interface RestTimer {
  /** Epoch ms when the rest ends, or null when idle. */
  endsAt: number | null
  totalSeconds: number
  exerciseId: string | null
}

interface WorkoutContextValue {
  session: Session | null
  active: boolean
  elapsedSeconds: number
  rest: RestTimer
  restRemaining: number

  startWorkout: (routine: Routine | null) => Promise<void>
  resumeIfAny: () => Promise<void>
  discardWorkout: () => Promise<void>
  finishWorkout: () => Promise<{ sessionId: string; prCount: number } | null>

  addExercise: (exercise: Exercise) => void
  removeEntry: (entryIndex: number) => void
  setEntryNotes: (entryIndex: number, notes: string) => void

  addSet: (entryIndex: number) => void
  updateSet: (entryIndex: number, setIndex: number, patch: Partial<WorkoutSet>) => void
  removeSet: (entryIndex: number, setIndex: number) => void
  toggleSetDone: (entryIndex: number, setIndex: number, restSeconds: number) => void

  startRest: (seconds: number, exerciseId: string | null) => void
  adjustRest: (deltaSeconds: number) => void
  skipRest: () => void
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null)

const emptySet = (type: SetType = 'working'): WorkoutSet => ({
  weightKg: null,
  reps: null,
  rpe: null,
  type,
  done: false,
})

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [rest, setRest] = useState<RestTimer>({
    endsAt: null,
    totalSeconds: 0,
    exerciseId: null,
  })

  // A single 1s tick drives both the elapsed clock and the rest countdown.
  useEffect(() => {
    if (!session && rest.endsAt == null) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [session, rest.endsAt])

  // Persist any in-progress session immediately so a crash/reload can resume.
  useEffect(() => {
    if (session && !session.finished) {
      void saveSession(session)
    }
  }, [session])

  const resumeIfAny = useCallback(async () => {
    const all = await db.sessions.toArray()
    const inProgress = all
      .filter((s) => !s.finished)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
    if (inProgress) setSession(inProgress)
  }, [])

  const startWorkout = useCallback(async (routine: Routine | null) => {
    // Clear any abandoned in-progress sessions so we never stack two.
    const all = await db.sessions.toArray()
    await Promise.all(
      all.filter((s) => !s.finished).map((s) => db.sessions.delete(s.id)),
    )
    const fresh = await buildSession(routine)
    await saveSession(fresh)
    setSession(fresh)
    setRest({ endsAt: null, totalSeconds: 0, exerciseId: null })
  }, [])

  const discardWorkout = useCallback(async () => {
    if (session) await db.sessions.delete(session.id)
    setSession(null)
    setRest({ endsAt: null, totalSeconds: 0, exerciseId: null })
  }, [session])

  const elapsedSeconds = useMemo(() => {
    if (!session) return 0
    return Math.floor((now - new Date(session.startedAt).getTime()) / 1000)
  }, [session, now])

  const finishWorkout = useCallback(async () => {
    if (!session) return null
    // Strip blank sets, then drop entries left with nothing logged, so saved
    // history reflects only what was actually performed.
    const entries = session.entries
      .map((e) => ({
        ...e,
        sets: e.sets.filter((s) => s.weightKg != null || s.reps != null),
      }))
      .filter((e) => e.sets.length > 0)
    const finished: Session = {
      ...session,
      entries,
      durationSeconds: Math.max(0, elapsedSeconds),
      finished: true,
    }
    await saveSession(finished)
    const prs = await recordSessionPRs(finished)
    setSession(null)
    setRest({ endsAt: null, totalSeconds: 0, exerciseId: null })
    return { sessionId: finished.id, prCount: prs.length }
  }, [session, elapsedSeconds])

  // ---- entry / set mutations (all immutable) ----

  const mutate = useCallback((fn: (s: Session) => Session) => {
    setSession((prev) => (prev ? fn(prev) : prev))
  }, [])

  const addExercise = useCallback(
    (exercise: Exercise) => {
      mutate((s) => {
        const entry: SessionEntry = {
          exerciseId: exercise.id,
          sets: [emptySet()],
        }
        return { ...s, entries: [...s.entries, entry] }
      })
    },
    [mutate],
  )

  const removeEntry = useCallback(
    (entryIndex: number) => {
      mutate((s) => ({
        ...s,
        entries: s.entries.filter((_, i) => i !== entryIndex),
      }))
    },
    [mutate],
  )

  const setEntryNotes = useCallback(
    (entryIndex: number, notes: string) => {
      mutate((s) => ({
        ...s,
        entries: s.entries.map((e, i) => (i === entryIndex ? { ...e, notes } : e)),
      }))
    },
    [mutate],
  )

  const addSet = useCallback(
    (entryIndex: number) => {
      mutate((s) => ({
        ...s,
        entries: s.entries.map((e, i) => {
          if (i !== entryIndex) return e
          // Empty set, inheriting only the set type. Weight/reps stay blank;
          // the row shows the previous numbers as a placeholder to guide entry.
          const prev = e.sets[e.sets.length - 1]
          return { ...e, sets: [...e.sets, emptySet(prev?.type ?? 'working')] }
        }),
      }))
    },
    [mutate],
  )

  const updateSet = useCallback(
    (entryIndex: number, setIndex: number, patch: Partial<WorkoutSet>) => {
      mutate((s) => ({
        ...s,
        entries: s.entries.map((e, i) => {
          if (i !== entryIndex) return e
          return {
            ...e,
            sets: e.sets.map((set, j) => (j === setIndex ? { ...set, ...patch } : set)),
          }
        }),
      }))
    },
    [mutate],
  )

  const removeSet = useCallback(
    (entryIndex: number, setIndex: number) => {
      mutate((s) => ({
        ...s,
        entries: s.entries.map((e, i) => {
          if (i !== entryIndex) return e
          return { ...e, sets: e.sets.filter((_, j) => j !== setIndex) }
        }),
      }))
    },
    [mutate],
  )

  const startRest = useCallback((seconds: number, exerciseId: string | null) => {
    if (seconds <= 0) return
    setRest({ endsAt: Date.now() + seconds * 1000, totalSeconds: seconds, exerciseId })
  }, [])

  const skipRest = useCallback(() => {
    setRest({ endsAt: null, totalSeconds: 0, exerciseId: null })
  }, [])

  const adjustRest = useCallback((deltaSeconds: number) => {
    setRest((r) => {
      if (r.endsAt == null) return r
      const newEndsAt = Math.max(Date.now(), r.endsAt + deltaSeconds * 1000)
      return { ...r, endsAt: newEndsAt }
    })
  }, [])

  const toggleSetDone = useCallback(
    (entryIndex: number, setIndex: number, restSeconds: number) => {
      // Decide whether this set is becoming "done" from the CURRENT committed
      // state, before dispatching the update — the setState updater runs later,
      // so we can't read a flag mutated inside it. (This is what makes the rest
      // timer reliably start on completion.)
      const entry = session?.entries[entryIndex]
      const target = entry?.sets[setIndex]
      const willBeDone = target ? !target.done : false

      mutate((s) => {
        const entries = s.entries.map((e, i) => {
          if (i !== entryIndex) return e
          const sets = e.sets.map((set, j) => {
            if (j !== setIndex) return set
            if (set.done) return { ...set, done: false }
            // One-tap repeat: ticking an untouched set adopts the previous
            // set's numbers so identical sets need zero typing.
            const prior = e.sets[j - 1]
            const weightKg = set.weightKg ?? prior?.weightKg ?? null
            const reps = set.reps ?? prior?.reps ?? null
            return { ...set, done: true, weightKg, reps }
          })
          // Auto-create the next empty set when completing the last one.
          if (willBeDone && setIndex === e.sets.length - 1) {
            sets.push(emptySet(sets[sets.length - 1].type))
          }
          return { ...e, sets }
        })
        return { ...s, entries }
      })

      if (willBeDone && restSeconds > 0) {
        startRest(restSeconds, entry?.exerciseId ?? null)
      }
    },
    [mutate, session, startRest],
  )

  const restRemaining = useMemo(() => {
    if (rest.endsAt == null) return 0
    return Math.max(0, Math.round((rest.endsAt - now) / 1000))
  }, [rest.endsAt, now])

  // Fire a vibration + clear when the rest timer hits zero.
  const wasResting = useRef(false)
  useEffect(() => {
    const resting = rest.endsAt != null
    if (resting && restRemaining === 0) {
      if ('vibrate' in navigator) navigator.vibrate?.([120, 60, 120])
      setRest({ endsAt: null, totalSeconds: 0, exerciseId: null })
    }
    wasResting.current = resting
  }, [restRemaining, rest.endsAt])

  const value: WorkoutContextValue = {
    session,
    active: !!session,
    elapsedSeconds,
    rest,
    restRemaining,
    startWorkout,
    resumeIfAny,
    discardWorkout,
    finishWorkout,
    addExercise,
    removeEntry,
    setEntryNotes,
    addSet,
    updateSet,
    removeSet,
    toggleSetDone,
    startRest,
    adjustRest,
    skipRest,
  }

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
}

export function useWorkout(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext)
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider')
  return ctx
}
