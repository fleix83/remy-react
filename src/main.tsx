import { createRoot } from 'react-dom/client'
import { Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/react-query'
import './i18n' // init the i18n runtime before anything renders
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </QueryClientProvider>,
)
