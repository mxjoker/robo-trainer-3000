import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// In production VITE_API_URL is the full Render backend URL (no trailing slash)
// In dev it's unset and calls go through Vite's proxy as /api/...
const apiBase = process.env.VITE_API_URL || 'http://localhost:3001/api'
const apiPattern = new RegExp(`^${apiBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    proxy: { '/api': 'http://localhost:3001' }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    globals: true
  }
})
