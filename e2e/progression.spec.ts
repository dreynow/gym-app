import { test, expect } from '@playwright/test'
import { autoAcceptDialogs, gotoHome, navTo, logSet } from './helpers'

test.describe('Double progression', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('suggests adding weight after topping the rep range, and applies it', async ({ page }) => {
    await gotoHome(page)

    // Lower A leads with Back Squat (4 sets, 5 to 7 reps). Top it out at 100x7.
    await page.getByRole('button', { name: /Start Lower A/ }).click()
    await expect(page).toHaveURL(/#\/workout/)
    await logSet(page, 'Back Squat', 1, 100, 7)
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    await expect(page).toHaveURL(/#\/session\//)

    // Start the routine again (no gotoHome, so the history is kept).
    await navTo(page, 'Train')
    await page.getByRole('button', { name: /Start Lower A/ }).click()
    await expect(page).toHaveURL(/#\/workout/)

    // The progression hint appears on Back Squat with the next weight.
    await expect(page.getByText(/Topped 7 reps last time/)).toBeVisible()
    await expect(page.getByText(/102\.5/)).toBeVisible()

    // Apply fills the suggested weight into the sets.
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByLabel('Back Squat set 1 weight')).toHaveValue('102.5')
  })
})
