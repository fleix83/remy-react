import React, { useEffect, useState } from 'react'
import { useToastStore } from '../../stores/toast.store'
import type { ToastItem, ToastType } from '../../stores/toast.store'

// Warm-theme palette per variant: soft tinted surface + saturated accent for the icon
const VARIANTS: Record<ToastType, { bg: string; accent: string; icon: React.ReactNode }> = {
  success: {
    bg: '#edf8f0',
    accent: '#3fae6a',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  error: {
    bg: '#fdeeee',
    accent: '#f55252',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    )
  },
  info: {
    bg: '#fff9e2',
    accent: 'var(--primary)',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8h.01M12 12v5" />
      </svg>
    )
  }
}

const Toast: React.FC<{ item: ToastItem }> = ({ item }) => {
  const dismiss = useToastStore(state => state.dismiss)
  const [entered, setEntered] = useState(false)

  // Mount hidden, then animate in on the next frame (transform/opacity only)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const visible = entered && !item.leaving
  const variant = VARIANTS[item.type]

  return (
    <div
      role={item.type === 'error' ? 'alert' : 'status'}
      onClick={() => dismiss(item.id)}
      className={`pointer-events-auto flex w-full md:w-auto md:max-w-sm cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(20,66,32,0.14)] transition-[transform,opacity] duration-300 ease-out will-change-transform ${
        visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-3 opacity-0 scale-[0.97]'
      }`}
      style={{ backgroundColor: variant.bg }}
    >
      <span
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: variant.accent }}
      >
        {variant.icon}
      </span>
      <span className="text-sm font-semibold leading-snug text-[var(--type)]">
        {item.message}
      </span>
    </div>
  )
}

const ToastContainer: React.FC = () => {
  const toasts = useToastStore(state => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:top-6 md:items-end"
    >
      {toasts.map(item => (
        <Toast key={item.id} item={item} />
      ))}
    </div>
  )
}

export default ToastContainer
