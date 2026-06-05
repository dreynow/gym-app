import { test, expect } from '@playwright/test'
import { autoAcceptDialogs, gotoHome, gotoExercises } from './helpers'

test.describe('Exercise library', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('search and muscle filter narrow the list', async ({ page }) => {
    await gotoHome(page)
    await gotoExercises(page)

    await page.getByPlaceholder('Search exercises').fill('squat')
    await expect(page.getByText('Back Squat')).toBeVisible()
    await expect(page.getByText('Lat Pulldown')).toHaveCount(0)

    await page.getByPlaceholder('Search exercises').fill('')
    await page.getByRole('button', { name: 'Chest', exact: true }).click()
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()
    await expect(page.getByText('Back Squat')).toHaveCount(0)
  })

  test('create a custom exercise, then edit it', async ({ page }) => {
    await gotoHome(page)
    await gotoExercises(page)

    await page.getByRole('button', { name: 'New exercise' }).click()
    await page.getByLabel('Name').fill('Zercher Squat')
    await page.getByRole('button', { name: 'Create exercise' }).click()

    await page.getByPlaceholder('Search exercises').fill('Zercher')
    await expect(page.getByText('Zercher Squat')).toBeVisible()
    await expect(page.getByText('Custom')).toBeVisible()

    // Edit it.
    await page.getByRole('button', { name: /Edit Zercher Squat/ }).click()
    await page.getByLabel('Name').fill('Zercher Front Squat')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.getByPlaceholder('Search exercises').fill('Zercher Front')
    await expect(page.getByText('Zercher Front Squat')).toBeVisible()
  })
})
