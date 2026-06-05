import { test, expect } from '@playwright/test'
import { autoAcceptDialogs, gotoHome, navTo, startEmptyWithExercise, logSet } from './helpers'

test.describe('Body metrics', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('add a measurement, see it charted, then delete it', async ({ page }) => {
    await gotoHome(page)
    await navTo(page, 'Body')

    await page.getByRole('button', { name: 'Add entry' }).first().click()
    await page.getByLabel('Weight (kg)').fill('82')
    await page.getByLabel('Waist (cm)').fill('84')
    await page.getByRole('button', { name: 'Add entry' }).last().click()

    // Latest stat + an entry row appear, and the trend chart renders.
    await expect(page.getByText('Today')).toBeVisible()
    await expect(page.locator('.recharts-surface').first()).toBeVisible()

    // Delete the entry.
    await page.getByRole('button', { name: 'Delete entry' }).first().click()
    await expect(page.getByText('No measurements yet')).toBeVisible()
  })
})

test.describe('Progress charts', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('after logging, the exercise trend renders with stats', async ({ page }) => {
    await gotoHome(page)
    await startEmptyWithExercise(page, 'Leg Press')
    await logSet(page, 'Leg Press', 1, 200, 10)
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    await expect(page).toHaveURL(/#\/session\//)

    await navTo(page, 'Progress')
    // Defaults to the first exercise with history (Leg Press) and draws a chart.
    await expect(page.getByRole('heading', { name: 'Leg Press' })).toBeVisible()
    await expect(page.locator('.recharts-surface').first()).toBeVisible()
    await expect(page.getByText('Latest')).toBeVisible()

    // Metric + range toggles work.
    await page.getByRole('button', { name: 'Volume', exact: true }).click()
    await page.getByRole('button', { name: 'All', exact: true }).click()
    await expect(page.locator('.recharts-surface').first()).toBeVisible()
  })
})
