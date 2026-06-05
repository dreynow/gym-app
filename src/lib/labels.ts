import type { Equipment, MuscleGroup, SetType } from '../db/types'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'forearms',
  'fullbody',
]

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
  fullbody: 'Full body',
}

export const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
]

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  other: 'Other',
}

export const SET_TYPES: SetType[] = ['warmup', 'working', 'drop', 'failure']

export const SET_TYPE_LABEL: Record<SetType, string> = {
  warmup: 'Warmup',
  working: 'Working',
  drop: 'Drop set',
  failure: 'To failure',
}

/** Single-letter badge shown on each set row. */
export const SET_TYPE_SHORT: Record<SetType, string> = {
  warmup: 'W',
  working: '',
  drop: 'D',
  failure: 'F',
}

// Nicer names for a few Apple Health workout types; the rest fall back to a
// CamelCase-to-sentence-case split.
const ACTIVITY_LABEL_OVERRIDES: Record<string, string> = {
  TraditionalStrengthTraining: 'Strength training',
  FunctionalStrengthTraining: 'Functional strength',
  HighIntensityIntervalTraining: 'HIIT',
  CoreTraining: 'Core training',
  SwimBikeRun: 'Triathlon',
}

/** Friendly, sentence-case label for an Apple Health workout activity type. */
export function formatActivityType(raw: string): string {
  if (!raw) return 'Workout'
  if (ACTIVITY_LABEL_OVERRIDES[raw]) return ACTIVITY_LABEL_OVERRIDES[raw]
  // "CardioDance" -> "Cardio dance", "JumpRope" -> "Jump rope".
  const spaced = raw.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
