import { defineConfig } from 'vitest/config'

// Unit tests for the pure logic (calculations, PR detection, Apple Health
// parsing). Node environment, no DOM or plugins needed — fast and isolated
// from the app's Vite/PWA build config.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
