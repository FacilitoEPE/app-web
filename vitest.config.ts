import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@Assets': path.resolve(import.meta.dirname, './src/assets'),
    },
  },
  test: {
    env: { VITE_API_CONTRACT: 'legacy', VITE_API_BASE_URL: '' },
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'dev/**/*.test.ts'],
    testTimeout: 20000,
  },
})
