import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4174'
const fullStack = process.env.EPE_E2E_FULL_STACK === '1'
const api = 'http://127.0.0.1:4175'

export default defineConfig({
  testDir: './e2e',
  testMatch: fullStack ? 'full-stack.spec.ts' : 'qa.spec.ts',
  workers: 1,
  use: {
    baseURL,
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    ...(process.env.EPE_E2E_BROWSER && { launchOptions: { executablePath: process.env.EPE_E2E_BROWSER } }),
  },
  webServer: [{
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4174 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: fullStack ? api : '/mock-api', VITE_API_CONTRACT: 'v1', VITE_DISABLE_HMR: 'true' },
  }, ...(fullStack ? [{
    command: 'node e2e/serve-backend.mjs',
    url: `${api}/health`,
    reuseExistingServer: false,
  }] : [])],
})
