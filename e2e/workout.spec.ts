import { test, expect } from '@playwright/test'
import { autoAcceptDialogs, gotoHome, navTo, startEmptyWithExercise, logSet } from './helpers'

test.describe('Active workout: the core logging loop', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('log a set, auto-next set + rest timer, finish, and bag a PR', async ({ page }) => {
    await gotoHome(page)
    await startEmptyWithExercise(page, 'Back Squat')

    // Log set 1.
    await logSet(page, 'Back Squat', 1, 100, 5)

    // Completing the last set auto-creates set 2 and starts the rest timer.
    await expect(page.getByLabel('Back Squat set 2 weight')).toBeVisible()
    await expect(page.getByText('Rest', { exact: true })).toBeVisible()

    // Rest controls.
    await page.getByRole('button', { name: '+15' }).click()
    await page.getByRole('button', { name: 'Skip rest' }).click()
    await expect(page.getByText('Rest', { exact: true })).toBeHidden()

    // Log set 2, then finish.
    await logSet(page, 'Back Squat', 2, 100, 5)
    await page.getByRole('button', { name: 'Finish', exact: true }).click()

    // Lands on the session detail with PR badges (first time doing it).
    await expect(page).toHaveURL(/#\/session\//)
    await expect(page.getByText(/personal record/)).toBeVisible()
    await expect(page.getByText(/Back Squat:/).first()).toBeVisible()
    // Two working sets logged.
    await expect(page.getByText('100 kg × 5').first()).toBeVisible()
  })

  test('shows last session numbers to beat, and detects a new PR', async ({ page }) => {
    await gotoHome(page)

    // First session.
    await startEmptyWithExercise(page, 'Barbell Bench Press')
    await logSet(page, 'Barbell Bench Press', 1, 60, 8)
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    await expect(page).toHaveURL(/#\/session\//)

    // Second session: the card should surface last time's 60x8 to beat.
    await navTo(page, 'Train')
    await startEmptyWithExercise(page, 'Barbell Bench Press')
    await expect(page.getByText('60×8')).toBeVisible()

    // Beat it.
    await logSet(page, 'Barbell Bench Press', 1, 65, 8)
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    await expect(page.getByText(/personal record/)).toBeVisible()
  })

  test('one-tap repeat: ticking a blank set adopts the previous set values', async ({ page }) => {
    await gotoHome(page)
    await startEmptyWithExercise(page, 'Deadlift')
    await logSet(page, 'Deadlift', 1, 120, 5)
    // Set 2 is blank; tick it done without typing -> should adopt 120 x 5.
    await page.getByRole('button', { name: 'Mark set done' }).first().click()
    await expect(page.getByLabel('Deadlift set 2 weight')).toHaveValue('120')
    await expect(page.getByLabel('Deadlift set 2 reps')).toHaveValue('5')
  })

  test('discarding a workout returns to Train with nothing saved', async ({ page }) => {
    await gotoHome(page)
    await startEmptyWithExercise(page, 'Overhead Press')
    await logSet(page, 'Overhead Press', 1, 40, 8)
    await page.getByRole('button', { name: 'Workout options' }).click()
    await page.getByRole('button', { name: 'Discard workout' }).click()
    await expect(page.getByRole('button', { name: 'Start Empty Workout' })).toBeVisible()
    await navTo(page, 'History')
    await expect(page.getByText('No workouts logged yet')).toBeVisible()
  })
})

test.describe('History', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('finished workout appears, opens, and can be deleted', async ({ page }) => {
    await gotoHome(page)
    await startEmptyWithExercise(page, 'Lat Pulldown')
    await logSet(page, 'Lat Pulldown', 1, 50, 12)
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    await expect(page).toHaveURL(/#\/session\//)

    await navTo(page, 'History')
    const card = page.getByRole('button', { name: /Lat Pulldown/ })
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/#\/session\//)

    await page.getByRole('button', { name: 'Delete workout' }).click()
    await expect(page).toHaveURL(/#\/history/)
    await expect(page.getByText('No workouts logged yet')).toBeVisible()
  })
})
