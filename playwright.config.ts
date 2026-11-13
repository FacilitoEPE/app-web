import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4174'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    ...(process.env.EPE_E2E_BROWSER && { launchOptions: { executablePath: process.env.EPE_E2E_BROWSER } }),
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4174 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: '/mock-api', VITE_API_CONTRACT: 'v1', VITE_DISABLE_HMR: 'true' },
  },
})
