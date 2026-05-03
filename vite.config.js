import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/reed': {
        target: 'https://www.reed.co.uk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/reed/, '/api/1.0'),
        headers: {
          'Authorization': 'Basic ' + Buffer.from('5c50d4a2-b7da-44bb-b88d-ceeb1e4d4cc2:').toString('base64')
        }
      },
      '/api/adzuna': {
        target: 'https://api.adzuna.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/adzuna/, '/v1/api')
      }
    }
  }
})
