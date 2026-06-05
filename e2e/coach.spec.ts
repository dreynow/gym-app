import { test, expect } from '@playwright/test'
import { gotoHome, navTo } from './helpers'

// First turn: the model calls log_meal. Second turn: it confirms in text.
const TOOL_SSE = [
  'event: content_block_start',
  'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"log_meal","input":{}}}',
  '',
  'event: content_block_delta',
  'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"name\\":\\"Chicken wrap\\",\\"calories\\":600,\\"proteinG\\":45}"}}',
  '',
  'event: content_block_stop',
  'data: {"type":"content_block_stop","index":0}',
  '',
  'event: message_delta',
  'data: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}',
  '',
  'event: message_stop',
  'data: {"type":"message_stop"}',
  '',
  '',
].join('\n')

const DONE_SSE = [
  'event: content_block_delta',
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Logged it. You are at 600 calories today."}}',
  '',
  'event: message_delta',
  'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}',
  '',
  'event: message_stop',
  'data: {"type":"message_stop"}',
  '',
  '',
].join('\n')

const SSE = [
  'event: message_start',
  'data: {"type":"message_start"}',
  '',
  'event: content_block_delta',
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Your quad volume "}}',
  '',
  'event: content_block_delta',
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"looks solid."}}',
  '',
  'event: message_stop',
  'data: {"type":"message_stop"}',
  '',
  '',
].join('\n')

test.describe('AI coach', () => {
  test('set key, chat with a mocked stream, and persist across reload', async ({ page }) => {
    // Mock Claude so no real key/cost is needed.
    await page.route('https://api.anthropic.com/**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: SSE,
      }),
    )

    await gotoHome(page)

    // Coach is gated on a key.
    await page.getByRole('button', { name: 'AI coach' }).click()
    await expect(page.getByText('Connect your AI coach')).toBeVisible()

    // Add a key in Settings.
    await page.getByRole('button', { name: 'Add API key in Settings' }).click()
    await page.getByLabel('Anthropic API key').fill('sk-ant-test')
    await page.getByRole('button', { name: 'Save key' }).click()
    await expect(page.getByText('Saved')).toBeVisible()

    // Open the coach and send a message.
    await page.getByRole('button', { name: 'Open coach' }).click()
    await expect(page.getByText('Ask your coach')).toBeVisible()
    await page.getByPlaceholder('Ask your coach…').fill('How is my volume?')
    await page.getByRole('button', { name: 'Send' }).click()

    // The streamed reply and the echoed question both render.
    await expect(page.getByText('Your quad volume looks solid.')).toBeVisible()
    await expect(page.getByText('How is my volume?')).toBeVisible()

    // Conversation persists across a reload (still on the coach route).
    await page.reload()
    await expect(page.getByText('Your quad volume looks solid.')).toBeVisible()
    await expect(page.getByText('How is my volume?')).toBeVisible()
  })

  test('logs a meal via the tool, behind a confirmation', async ({ page }) => {
    // First API call returns a tool_use; second returns the text confirmation.
    let calls = 0
    await page.route('https://api.anthropic.com/**', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: calls++ === 0 ? TOOL_SSE : DONE_SSE,
      }),
    )

    await gotoHome(page)
    await page.getByRole('button', { name: 'AI coach' }).click()
    await page.getByRole('button', { name: 'Add API key in Settings' }).click()
    await page.getByLabel('Anthropic API key').fill('sk-ant-test')
    await page.getByRole('button', { name: 'Save key' }).click()
    await page.getByRole('button', { name: 'Open coach' }).click()

    await page.getByPlaceholder('Ask your coach…').fill('I had a chicken wrap, log it')
    await page.getByRole('button', { name: 'Send' }).click()

    // The styled confirm dialog appears with the estimated macros.
    await expect(page.getByText('Log this meal?')).toBeVisible()
    await expect(page.getByText(/Chicken wrap/)).toBeVisible()
    await page.getByRole('button', { name: 'Log meal' }).click()

    // The coach acknowledges, and the meal is now in the diary.
    await expect(page.getByText('Logged it. You are at 600 calories today.')).toBeVisible()
    await page.getByRole('button', { name: 'Back' }).click()
    await navTo(page, 'Meals')
    await expect(page.getByText('Chicken wrap')).toBeVisible()
    await expect(page.getByText('600 kcal · 45g protein')).toBeVisible()
  })
})
