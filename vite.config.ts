import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    open: false,
    proxy: {
      // Proxy para a API de Permisso/ANTT para contornar problemas de CORS
      '/api-permisso': {
        target: 'https://permisso-api.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-permisso/, ''),
        secure: true,
      }
    }
  },
  build: {
    // Aumenta o limite de aviso de tamanho do chunk para 1000kB (1MB)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          datefns: ['date-fns'],
          xlsx: ['xlsx'],
          icons: ['lucide-react']
        }
      }
    }
  }
})