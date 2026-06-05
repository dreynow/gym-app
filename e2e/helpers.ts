import { type Page, expect } from '@playwright/test'

/** Auto-accept window.confirm dialogs (delete / discard / finish-empty). */
export function autoAcceptDialogs(page: Page) {
  page.on('dialog', (d) => d.accept())
}

/** Open the app fresh and wait for the seeded routines to render. */
export async function gotoHome(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Start Empty Workout' })).toBeVisible()
}

export async function navTo(page: Page, tab: 'Train' | 'History' | 'Progress' | 'Body' | 'Library') {
  await page.getByRole('button', { name: tab, exact: true }).click()
}

/** Start an empty workout and add a single exercise by name via the picker. */
export async function startEmptyWithExercise(page: Page, exerciseName: string) {
  await page.getByRole('button', { name: 'Start Empty Workout' }).click()
  await expect(page).toHaveURL(/#\/workout/)
  // Empty-state "Add exercise" or the bottom one, whichever is present.
  await page.getByRole('button', { name: /Add exercise/ }).first().click()
  await page.getByPlaceholder('Search exercises').fill(exerciseName)
  await page.getByRole('button', { name: new RegExp(exerciseName, 'i') }).first().click()
  await page.getByRole('button', { name: /Add 1 exercise/ }).click()
  await expect(page.getByRole('heading', { name: exerciseName })).toBeVisible()
}

/** Fill one set's weight + reps and tick it done. */
export async function logSet(
  page: Page,
  exerciseName: string,
  setNo: number,
  weight: number,
  reps: number,
) {
  await page.getByLabel(`${exerciseName} set ${setNo} weight`).fill(String(weight))
  await page.getByLabel(`${exerciseName} set ${setNo} reps`).fill(String(reps))
  // The first not-yet-done set's check button.
  await page.getByRole('button', { name: 'Mark set done' }).first().click()
}
