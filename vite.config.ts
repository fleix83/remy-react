import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Relative paths for subdirectory deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
