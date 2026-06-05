import { test, expect } from '@playwright/test'
import { gotoHome, navTo } from './helpers'

test.describe('Meal logging', () => {
  test('add meals, see daily totals, and delete', async ({ page }) => {
    await gotoHome(page)
    await navTo(page, 'Meals')
    await expect(page.getByText('No meals logged')).toBeVisible()

    async function addMeal(name: string, kcal: string, protein: string) {
      await page.getByLabel('Meal', { exact: true }).fill(name)
      await page.getByLabel('Calories', { exact: true }).fill(kcal)
      await page.getByLabel('Protein (g)', { exact: true }).fill(protein)
      await page.getByRole('button', { name: 'Add meal' }).click()
    }

    await addMeal('Chicken and rice', '600', '45')
    await expect(page.getByText('Chicken and rice')).toBeVisible()
    await expect(page.getByText('600 kcal · 45g protein')).toBeVisible()

    await addMeal('Protein shake', '250', '30')
    // Daily totals add up: 850 kcal, 75g protein.
    await expect(page.getByText('850')).toBeVisible()
    await expect(page.getByText('75g')).toBeVisible()

    // Delete a meal and the total drops.
    await page
      .getByRole('button', { name: 'Delete meal' })
      .first()
      .click()
    await expect(page.getByText('Protein shake')).toHaveCount(0)
    await expect(page.getByText('600', { exact: true })).toBeVisible()
  })
})
