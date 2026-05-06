import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Plesk deploys dist/ contents to root
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Hint Rollup to peel off the heaviest libs into their own chunks so
    // they're cached independently and don't bloat the main bundle on first
    // paint. Lazy-loaded routes still produce their own chunks automatically.
    rollupOptions: {
      output: {
        manualChunks: {
          'tiptap': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-blockquote',
            '@tiptap/extension-bold',
            '@tiptap/extension-italic',
            '@tiptap/extension-link',
            '@tiptap/extension-underline',
          ],
          'supabase': ['@supabase/supabase-js'],
          'react-query': ['@tanstack/react-query'],
          'date': ['date-fns', 'react-day-picker'],
        },
      },
    },
  },
})
