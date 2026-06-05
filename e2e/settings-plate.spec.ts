import { test, expect } from '@playwright/test'
import { autoAcceptDialogs, gotoHome, navTo, startEmptyWithExercise } from './helpers'

test.describe('Settings', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('plate inventory: add and remove a plate', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: 'Settings' }).click()

    await page.getByPlaceholder(/Add plate/).fill('0.5')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Remove 0.5kg plate' })).toBeVisible()

    await page.getByRole('button', { name: 'Remove 0.5kg plate' }).click()
    await expect(page.getByRole('button', { name: 'Remove 0.5kg plate' })).toHaveCount(0)
  })

  test('switching units to lb is reflected in the body entry form', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Pounds (lb)', exact: true }).click()

    await navTo(page, 'Body')
    await page.getByRole('button', { name: 'Add entry' }).first().click()
    await expect(page.getByText('Weight (lb)')).toBeVisible()
  })

  test('export produces a JSON backup download', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export backup/ }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/ironlog-backup-.*\.json/)
  })
})

test.describe('Plate calculator', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('computes plates per side for a barbell lift', async ({ page }) => {
    await gotoHome(page)
    await startEmptyWithExercise(page, 'Back Squat')
    await page.getByRole('button', { name: 'Plate calculator' }).click()
    await page.getByLabel('Target weight (kg)').fill('100')
    // (100 - 20 bar) / 2 = 40 per side. Greedy from the default inventory
    // (25, 20, 15, ...) loads 25 + 15 per side, totalling 100kg on the bar.
    await expect(page.getByText('1 × 25kg')).toBeVisible()
    await expect(page.getByText('1 × 15kg')).toBeVisible()
    await expect(page.getByText('100 kg')).toBeVisible()
  })
})
