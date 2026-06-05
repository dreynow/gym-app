import { test, expect } from '@playwright/test'
import { autoAcceptDialogs, gotoHome, navTo, startEmptyWithExercise, logSet } from './helpers'

const healthInput = 'input[type="file"][accept*="xml"]'

test.describe('Apple Health import (Option A)', () => {
  test.beforeEach(({ page }) => autoAcceptDialogs(page))

  test('imports bodyweight records into the Body log', async ({ page }) => {
    const xml = `<?xml version="1.0"?>
      <HealthData>
        <Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" startDate="2026-05-01 07:00:00 +0100" value="77.7"/>
      </HealthData>`

    await gotoHome(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator(healthInput).setInputFiles({
      name: 'export.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(xml),
    })
    await expect(page.getByText(/bodyweight entries added/)).toBeVisible()

    await navTo(page, 'Body')
    // Shows in both the "latest" card and the dated entry row.
    await expect(page.getByRole('button', { name: /Fri, May 1.*77\.7 kg/ })).toBeVisible()
  })

  test('attaches heart rate + calories to an overlapping session', async ({ page }) => {
    await gotoHome(page)
    await startEmptyWithExercise(page, 'Back Squat')
    await logSet(page, 'Back Squat', 1, 100, 5)
    await page.getByRole('button', { name: 'Finish', exact: true }).click()
    await expect(page).toHaveURL(/#\/session\//)

    // A workout whose window spans "now" (ISO dates parse via the fallback path)
    // so it overlaps the session we just logged.
    const start = new Date(Date.now() - 60_000).toISOString()
    const end = new Date(Date.now() + 60_000).toISOString()
    const xml = `<?xml version="1.0"?>
      <HealthData>
        <Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="2" durationUnit="min" startDate="${start}" endDate="${end}" sourceName="Apple Watch">
          <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" average="145" maximum="180" unit="count/min"/>
          <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="510" unit="kcal"/>
        </Workout>
      </HealthData>`

    await navTo(page, 'Train')
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator(healthInput).setInputFiles({
      name: 'export.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(xml),
    })
    await expect(page.getByText(/1 of 1 workouts matched/)).toBeVisible()

    // Open the session and see the watch stats.
    await navTo(page, 'History')
    await page.getByRole('button', { name: /Back Squat/ }).first().click()
    await expect(page.getByText('Apple Watch')).toBeVisible()
    await expect(page.getByText('145')).toBeVisible()
    await expect(page.getByText('avg bpm')).toBeVisible()
    await expect(page.getByText('510')).toBeVisible()
  })

  test('backfills a non-overlapping workout as a history session', async ({ page }) => {
    // A past workout that overlaps no logged session; with backfill on (default)
    // it becomes a standalone history entry carrying HR/calories but no lifts.
    const xml = `<?xml version="1.0"?>
      <HealthData>
        <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30" durationUnit="min" startDate="2025-01-15 08:00:00 +0000" endDate="2025-01-15 08:30:00 +0000" sourceName="Apple Watch">
          <WorkoutStatistics type="HKQuantityTypeIdentifierHeartRate" average="150" maximum="175" unit="count/min"/>
          <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="320" unit="kcal"/>
        </Workout>
      </HealthData>`

    await gotoHome(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator(healthInput).setInputFiles({
      name: 'export.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(xml),
    })
    await expect(page.getByText(/1 workouts added to history/)).toBeVisible()

    await navTo(page, 'History')
    await expect(page.getByRole('heading', { name: 'Running' })).toBeVisible()
    await expect(page.getByText('150')).toBeVisible() // HR on the row
  })
})
