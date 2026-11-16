import path from "path"
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig, loadEnv } from 'vite'
import { mockApiPlugin } from './dev/mock-api.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_')

  return {
    plugins: [mockApiPlugin(env.VITE_API_BASE_URL), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
        "@Assets": path.resolve(import.meta.dirname, "./src/assets"),
      },
    },
  }
})
