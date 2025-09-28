import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    hmr: {
      host: 'aff5f9aa-6aaa-442a-8e2c-80ff0587aeb0-00-3tdzaqrwy67jv.riker.replit.dev'
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})