import { test, expect } from '@playwright/test'
import { gotoHome } from './helpers'

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
})
