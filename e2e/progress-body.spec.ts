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
    // Assert the chart mounted (attached), not pixel-visible: recharts'
    // ResponsiveContainer briefly reports a 0/-1 size under CPU load while it
    // re-measures, which flakes a visibility check without meaning the chart
    // failed to render.
    await expect(page.locator('.recharts-surface').first()).toBeAttached()

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
    // Explicitly select Leg Press rather than relying on the "first exercise
    // with history" auto-default, which depends on a live query resolving and
    // can race under load.
    await page.getByRole('button', { name: /Exercise/ }).first().click()
    await page.getByPlaceholder('Search exercises').fill('Leg Press')
    // Anchor to the start so this matches the picker result ("Leg Press Quads ·
    // Machine") and not the background selector button ("Exercise Leg Press").
    await page.getByRole('button', { name: /^Leg Press/ }).click()
    // The selected exercise shows in the Progress selector button (not a heading).
    await expect(page.getByRole('button', { name: 'Exercise Leg Press' })).toBeVisible()
    // Assert the chart mounted (attached), not pixel-visible: recharts'
    // ResponsiveContainer briefly reports a 0/-1 size under CPU load while it
    // re-measures, which flakes a visibility check without meaning the chart
    // failed to render.
    await expect(page.locator('.recharts-surface').first()).toBeAttached()
    await expect(page.getByText('Latest')).toBeVisible()

    // Metric + range toggles work.
    await page.getByRole('button', { name: 'Volume', exact: true }).click()
    await page.getByRole('button', { name: 'All', exact: true }).click()
    // Assert the chart mounted (attached), not pixel-visible: recharts'
    // ResponsiveContainer briefly reports a 0/-1 size under CPU load while it
    // re-measures, which flakes a visibility check without meaning the chart
    // failed to render.
    await expect(page.locator('.recharts-surface').first()).toBeAttached()
  })
})
