import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  leaving: boolean
}

const LEAVE_DURATION = 220
const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3200,
  info: 3800,
  error: 5000
}

let nextId = 1

interface ToastState {
  toasts: ToastItem[]
  show: (type: ToastType, message: string, duration?: number) => void
  dismiss: (id: number) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (type, message, duration) => {
    const id = nextId++
    set(state => ({
      // Keep at most 3 toasts on screen
      toasts: [...state.toasts.slice(-2), { id, type, message, leaving: false }]
    }))
    setTimeout(() => get().dismiss(id), duration ?? DEFAULT_DURATION[type])
  },

  dismiss: (id) => {
    const item = get().toasts.find(t => t.id === id)
    if (!item || item.leaving) return
    set(state => ({
      toasts: state.toasts.map(t => t.id === id ? { ...t, leaving: true } : t)
    }))
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
    }, LEAVE_DURATION)
  }
}))

// Imperative helper usable outside React components
export const toast = {
  success: (message: string, duration?: number) => useToastStore.getState().show('success', message, duration),
  error: (message: string, duration?: number) => useToastStore.getState().show('error', message, duration),
  info: (message: string, duration?: number) => useToastStore.getState().show('info', message, duration)
}