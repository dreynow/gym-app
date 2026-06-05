import { test, expect } from '@playwright/test'
import { gotoHome, navTo } from './helpers'

test.describe('App shell, seeding and navigation', () => {
  test('loads, seeds the four routines, and brands as Rack', async ({ page }) => {
    await gotoHome(page)
    await expect(page.getByRole('heading', { name: 'Rack', level: 1 })).toBeVisible()
    for (const r of ['Lower A (strength)', 'Upper A (push focus)', 'Lower B (hypertrophy)', 'Upper B (pull focus)']) {
      await expect(page.getByRole('heading', { name: r })).toBeVisible()
    }
  })

  test('bottom nav reaches every screen', async ({ page }) => {
    await gotoHome(page)

    await navTo(page, 'History')
    await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible()

    await navTo(page, 'Progress')
    await expect(page.getByRole('heading', { name: 'Progress', level: 1 })).toBeVisible()

    await navTo(page, 'Body')
    await expect(page.getByRole('heading', { name: 'Body', level: 1 })).toBeVisible()

    await navTo(page, 'Library')
    await expect(page.getByRole('heading', { name: 'Library', level: 1 })).toBeVisible()
    // The seeded library should have a healthy count of exercises.
    await expect(page.getByText(/\d+ exercises/)).toBeVisible()

    await navTo(page, 'Train')
    await expect(page.getByRole('button', { name: 'Start Empty Workout' })).toBeVisible()
  })

  test('settings screen opens from the Train header', async ({ page }) => {
    await gotoHome(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
    await expect(page.getByText('Units & defaults')).toBeVisible()
    await expect(page.getByText('Plate inventory', { exact: false })).toBeVisible()
  })

  test('ships PWA head tags (manifest is generated in the production build)', async ({ page }) => {
    await gotoHome(page)
    // The web manifest itself is injected only in the production build; in dev
    // we verify the static install metadata that lives in index.html.
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1)
    const theme = await page.locator('meta[name="theme-color"]').getAttribute('content')
    expect(theme?.toUpperCase()).toBe('#0B0B0D')
    await expect(page).toHaveTitle(/Rack/)
  })
})
