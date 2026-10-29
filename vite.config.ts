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
    server: {
      // La recarga automática al guardar va encendida. Quien no pueda usar el websocket de Vite
      // (por ejemplo, al abrir la web desde otro dispositivo) la apaga con VITE_DISABLE_HMR=true en su .env.
      hmr: env.VITE_DISABLE_HMR === 'true' ? false : undefined,
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
        "@Assets": path.resolve(import.meta.dirname, "./src/assets"),
      },
    },
  }
})
