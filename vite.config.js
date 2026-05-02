import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/StatNexus/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://ofxmxllxnkmdcbutnnhy.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/functions/v1/api'),
      },
    },
  },
})
