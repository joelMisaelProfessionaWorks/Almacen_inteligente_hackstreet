import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const backend = env.BACKEND_URL || 'http://localhost:8000'

  // /api/* -> backend (quita el prefijo). Así el celular solo habla con este servidor
  // por HTTPS y no hay "localhost" ni contenido mixto de por medio.
  const proxy = {
    '/api': {
      target: backend,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  }

  return {
    // basicSsl: certificado autofirmado -> getUserMedia (cámara) funciona en el celular.
    plugins: [react()],
    server: { host: true, port: 5174, strictPort: true, allowedHosts: true, proxy },
    preview: { host: true, port: 5174, strictPort: true, allowedHosts: true, proxy },
  }
})