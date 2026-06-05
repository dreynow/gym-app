import type { Equipment, Exercise, MuscleGroup, Routine } from './types'

/**
 * Seed content shipped on first launch. Everything here is editable and
 * removable by the user afterwards — these are just sensible starting points,
 * never hardcoded into app logic.
 */

type SeedExercise = {
  id: string
  name: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  rest?: number
  usesBarbell?: boolean
}

const ex = (
  id: string,
  name: string,
  muscleGroup: MuscleGroup,
  equipment: Equipment,
  opts: { rest?: number; usesBarbell?: boolean } = {},
): SeedExercise => ({ id, name, muscleGroup, equipment, ...opts })

/** The starter library: everything referenced by the seed routines, plus a
 * few common extras so the library feels populated from day one. */
export const SEED_EXERCISES: SeedExercise[] = [
  // Legs
  ex('back-squat', 'Back Squat', 'quads', 'barbell', { rest: 180, usesBarbell: true }),
  ex('romanian-deadlift', 'Romanian Deadlift', 'hamstrings', 'barbell', { rest: 150, usesBarbell: true }),
  ex('deadlift', 'Deadlift', 'hamstrings', 'barbell', { rest: 210, usesBarbell: true }),
  ex('leg-press', 'Leg Press', 'quads', 'machine', { rest: 120 }),
  ex('seated-leg-curl', 'Seated Leg Curl', 'hamstrings', 'machine', { rest: 90 }),
  ex('leg-extension', 'Leg Extension', 'quads', 'machine', { rest: 90 }),
  ex('bulgarian-split-squat', 'Bulgarian Split Squat', 'quads', 'dumbbell', { rest: 120 }),
  ex('hip-thrust', 'Hip Thrust', 'glutes', 'barbell', { rest: 120, usesBarbell: true }),
  ex('standing-calf-raise', 'Standing Calf Raise', 'calves', 'machine', { rest: 75 }),
  ex('seated-calf-raise', 'Seated Calf Raise', 'calves', 'machine', { rest: 75 }),

  // Push
  ex('barbell-bench-press', 'Barbell Bench Press', 'chest', 'barbell', { rest: 180, usesBarbell: true }),
  ex('incline-dumbbell-press', 'Incline Dumbbell Press', 'chest', 'dumbbell', { rest: 120 }),
  ex('seated-db-shoulder-press', 'Seated Dumbbell Shoulder Press', 'shoulders', 'dumbbell', { rest: 120 }),
  ex('overhead-press', 'Overhead Press', 'shoulders', 'barbell', { rest: 150, usesBarbell: true }),
  ex('lateral-raise', 'Lateral Raise', 'shoulders', 'dumbbell', { rest: 60 }),
  ex('cable-fly', 'Cable Fly', 'chest', 'cable', { rest: 75 }),
  ex('triceps-pushdown', 'Triceps Pushdown', 'triceps', 'cable', { rest: 75 }),

  // Pull
  ex('pull-up', 'Pull-Up', 'back', 'bodyweight', { rest: 150 }),
  ex('lat-pulldown', 'Lat Pulldown', 'back', 'cable', { rest: 90 }),
  ex('barbell-row', 'Barbell Row', 'back', 'barbell', { rest: 150, usesBarbell: true }),
  ex('chest-supported-row', 'Chest-Supported Row', 'back', 'machine', { rest: 120 }),
  ex('face-pull', 'Face Pull', 'shoulders', 'cable', { rest: 60 }),
  ex('incline-db-curl', 'Incline Dumbbell Curl', 'biceps', 'dumbbell', { rest: 75 }),

  // Core
  ex('hanging-leg-raise', 'Hanging Leg Raise', 'core', 'bodyweight', { rest: 75 }),
  ex('ab-wheel', 'Ab Wheel Rollout', 'core', 'other', { rest: 75 }),
  ex('plank', 'Plank', 'core', 'bodyweight', { rest: 60 }),

  // A few common extras for the library
  ex('dumbbell-bench-press', 'Dumbbell Bench Press', 'chest', 'dumbbell', { rest: 120 }),
  ex('goblet-squat', 'Goblet Squat', 'quads', 'dumbbell', { rest: 90 }),
  ex('seated-cable-row', 'Seated Cable Row', 'back', 'cable', { rest: 120 }),
  ex('hammer-curl', 'Hammer Curl', 'biceps', 'dumbbell', { rest: 75 }),
  ex('barbell-curl', 'Barbell Curl', 'biceps', 'barbell', { rest: 75, usesBarbell: true }),
  ex('skullcrusher', 'Skullcrusher', 'triceps', 'barbell', { rest: 90, usesBarbell: true }),
]

export function buildSeedExercises(): Exercise[] {
  return SEED_EXERCISES.map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment,
    isCustom: false,
    defaultRestSeconds: e.rest ?? 120,
    usesBarbell: e.usesBarbell ?? false,
  }))
}

type SeedRoutineItem = [exerciseId: string, sets: number, low: number, high: number, notes?: string]

const ROUTINE_DEFS: { id: string; name: string; category: string; items: SeedRoutineItem[] }[] = [
  {
    id: 'routine-lower-a',
    name: 'Lower A (strength)',
    category: 'Upper / Lower',
    items: [
      ['back-squat', 4, 5, 7],
      ['romanian-deadlift', 3, 8, 10],
      ['leg-press', 3, 10, 12],
      ['seated-leg-curl', 3, 10, 12],
      ['standing-calf-raise', 4, 10, 15],
      ['hanging-leg-raise', 3, 12, 15],
    ],
  },
  {
    id: 'routine-upper-a',
    name: 'Upper A (push focus)',
    category: 'Upper / Lower',
    items: [
      ['barbell-bench-press', 4, 5, 7],
      ['pull-up', 3, 8, 10, 'Assisted or weighted'],
      ['seated-db-shoulder-press', 3, 8, 10],
      ['chest-supported-row', 3, 10, 12],
      ['lateral-raise', 3, 12, 15],
      ['triceps-pushdown', 3, 10, 12],
    ],
  },
  {
    id: 'routine-lower-b',
    name: 'Lower B (hypertrophy)',
    category: 'Upper / Lower',
    items: [
      ['deadlift', 3, 4, 6],
      ['bulgarian-split-squat', 3, 8, 10, 'Per leg'],
      ['hip-thrust', 3, 8, 12],
      ['leg-extension', 3, 12, 15],
      ['seated-calf-raise', 4, 12, 20],
      ['ab-wheel', 3, 8, 15, 'Ab wheel or plank'],
    ],
  },
  {
    id: 'routine-upper-b',
    name: 'Upper B (pull focus)',
    category: 'Upper / Lower',
    items: [
      ['incline-dumbbell-press', 4, 8, 10],
      ['barbell-row', 4, 6, 8],
      ['lat-pulldown', 3, 10, 12],
      ['overhead-press', 3, 10, 12],
      ['cable-fly', 3, 12, 15],
      ['face-pull', 3, 15, 20],
      ['incline-db-curl', 3, 10, 12],
    ],
  },
]

export function buildSeedRoutines(): Routine[] {
  const now = new Date().toISOString()
  return ROUTINE_DEFS.map((r, idx) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    order: idx,
    items: r.items.map(([exerciseId, targetSets, repLow, repHigh, notes]) => ({
      exerciseId,
      targetSets,
      repLow,
      repHigh,
      notes,
    })),
    createdAt: now,
    updatedAt: now,
  }))
}
