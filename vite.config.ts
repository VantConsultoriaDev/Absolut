import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    open: false
  },
  build: {
    // Aumenta o limite de aviso de tamanho do chunk para 1000kB (1MB)
    chunkSizeWarningLimit: 1000
  }
})