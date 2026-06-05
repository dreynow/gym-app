import { test, expect } from '@playwright/test'
import { autoAcceptDialogs, gotoHome, navTo } from './helpers'

test.describe('Routines (programs) are fully dynamic', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('create a routine, rename it, add an exercise, and tweak targets', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: 'New', exact: true }).click()
    await expect(page).toHaveURL(/#\/routine\//)

    await page.getByLabel('Routine name').fill('My Test Routine')

    await page.getByRole('button', { name: /Add exercise/ }).click()
    await page.getByPlaceholder('Search exercises').fill('Hip Thrust')
    await page.getByRole('button', { name: /Hip Thrust/ }).first().click()
    await page.getByRole('button', { name: /Add 1 exercise/ }).click()
    await expect(page.getByRole('heading', { name: 'Hip Thrust' })).toBeVisible()

    // Bump the target sets via the stepper (no crash, value changes).
    await page.getByRole('button', { name: 'Increase' }).first().click()

    // Back on Train the new routine shows up with its name.
    await navTo(page, 'Train')
    await expect(page.getByRole('heading', { name: 'My Test Routine' })).toBeVisible()
  })

  test('start a seeded routine and land in the workout pre-filled', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: /Start Lower A/ }).click()
    await expect(page).toHaveURL(/#\/workout/)
    // Lower A leads with Back Squat.
    await expect(page.getByRole('heading', { name: 'Back Squat' })).toBeVisible()
  })

  test('delete a routine', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: 'New', exact: true }).click()
    await page.getByLabel('Routine name').fill('Throwaway Routine')
    await page.getByRole('button', { name: 'Delete routine' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page).toHaveURL(/#\/$|\/$/)
    await expect(page.getByRole('heading', { name: 'Throwaway Routine' })).toHaveCount(0)
  })
})
