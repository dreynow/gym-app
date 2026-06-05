import { test, expect } from '@playwright/test'
import { autoAcceptDialogs, gotoHome, navTo, startEmptyWithExercise, logSet } from './helpers'

test.describe('History calendar and streaks', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('logging a workout shows up in the calendar with stats', async ({ page }) => {
    await gotoHome(page)
    await startEmptyWithExercise(page, 'Back Squat')
    await logSet(page, 'Back Squat', 1, 120, 5)
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    await expect(page).toHaveURL(/#\/session\//)

    await navTo(page, 'History')
    await page.getByRole('button', { name: 'Calendar', exact: true }).click()

    // Stat tiles render.
    await expect(page.getByText('Week streak')).toBeVisible()
    await expect(page.getByText('This week')).toBeVisible()
    await expect(page.getByText('This month')).toBeVisible()

    // The current month grid renders (long month name + year).
    const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    await expect(page.getByText(monthLabel)).toBeVisible()

    // Today's cell is a trained day, so tapping it opens that session.
    const today = String(new Date().getDate())
    await page.getByRole('button', { name: today, exact: true }).first().click()
    await expect(page).toHaveURL(/#\/session\//)
  })
})
