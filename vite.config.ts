import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Plesk deploys dist/ contents to root
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
