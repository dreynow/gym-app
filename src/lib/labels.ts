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
