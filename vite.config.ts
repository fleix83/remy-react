import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/remyreact/', // Set base path for subdirectory deployment
  server: {
    // Enable SPA fallback for dev server (handles client-side routing)
    historyApiFallback: {
      rewrites: [
        { from: /^\/remyreact\/.*/, to: '/remyreact/index.html' }
      ]
    }
  },
  preview: {
    // Enable SPA fallback for preview server too
    historyApiFallback: {
      rewrites: [
        { from: /^\/remyreact\/.*/, to: '/remyreact/index.html' }
      ]
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
