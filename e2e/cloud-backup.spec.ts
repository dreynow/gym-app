import { test, expect } from '@playwright/test'
import { gotoHome, navTo } from './helpers'

test.describe('Encrypted cloud backup', () => {
  test('back up, delete data, then restore it', async ({ page }) => {
    // Mock the user's backup endpoint: store the blob on put, return it on get.
    let stored: string | null = null
    await page.route('https://backup.test/**', (route) => {
      const body = JSON.parse(route.request().postData() || '{}')
      if (body.action === 'put') {
        stored = body.blob
        return route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        })
      }
      return route.fulfill({
        status: stored ? 200 : 404,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blob: stored }),
      })
    })

    await gotoHome(page)

    // Create some distinctive data.
    await navTo(page, 'Meals')
    await page.getByLabel('Meal', { exact: true }).fill('Roundtrip meal')
    await page.getByLabel('Calories', { exact: true }).fill('500')
    await page.getByLabel('Protein (g)', { exact: true }).fill('40')
    await page.getByRole('button', { name: 'Add meal' }).click()
    await expect(page.getByText('Roundtrip meal')).toBeVisible()

    // Configure cloud backup and back up.
    await openSettings(page)
    await page.getByLabel('Backup endpoint URL').fill('https://backup.test/')
    await page.getByLabel('Passphrase').fill('roundtrip-pass')
    await page.getByRole('button', { name: 'Back up now' }).click()
    await expect(page.getByText('Backed up to the cloud.')).toBeVisible()

    // Delete the data.
    await navTo(page, 'Meals')
    await page.getByRole('button', { name: 'Delete meal' }).first().click()
    await expect(page.getByText('Roundtrip meal')).toHaveCount(0)

    // Restore from the cloud and confirm the meal comes back.
    await openSettings(page)
    await page.getByRole('button', { name: 'Restore', exact: true }).click()
    // The confirm dialog adds a second "Restore" button (rendered last).
    await page.getByRole('button', { name: 'Restore', exact: true }).last().click()
    await expect(page.getByText(/Restored backup/)).toBeVisible()

    await navTo(page, 'Meals')
    await expect(page.getByText('Roundtrip meal')).toBeVisible()
    await expect(page.getByText('500 kcal · 40g protein')).toBeVisible()
  })
})

async function openSettings(page: import('@playwright/test').Page) {
  await navTo(page, 'Train')
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
}
