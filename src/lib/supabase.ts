import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Clear corrupt auth entries from localStorage to prevent parse stalls
try {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-'))
  for (const k of keys) {
    try {
      JSON.parse(localStorage.getItem(k)!)
    } catch {
      localStorage.removeItem(k)
    }
  }
} catch {
  // localStorage unavailable, ignore
}

// Bypass Web Locks to prevent orphaned-lock hangs (supabase-js #1594, #2111).
// Trade-off: tabs may race on token refresh, acceptable for a forum app.
const noOpLock: <T>(name: string, acquireTimeout: number, fn: () => T) => T =
  (_name, _acquireTimeout, fn) => fn()

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: noOpLock,
  }
})

export default supabase