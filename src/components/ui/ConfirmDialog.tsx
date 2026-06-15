import React, { useEffect, useState } from 'react'
import { useConfirmStore } from '../../stores/confirm.store'

// Themed replacement for window.confirm(), opened via confirmDialog(...).
// z-[55]: above regular modals (z-50, a confirm can be triggered from inside
// one) but below toasts (z-[60]).
const ConfirmDialog: React.FC = () => {
  const { pending, leaving, settle } = useConfirmStore()
  const [entered, setEntered] = useState(false)

  const open = pending !== null

  // Mount hidden, then animate in on the next frame (transform/opacity only)
  useEffect(() => {
    if (!open) {
      setEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') settle(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, settle])

  if (!pending) return null

  const { message, confirmLabel = 'Bestätigen', cancelLabel = 'Abbrechen', danger } = pending.options
  const visible = entered && !leaving

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-describedby="confirm-dialog-message"
    >
      {/* Backdrop: dark on mobile, warm cream blur on desktop (matches modals) */}
      <div
        className={`absolute inset-0 bg-black/50 md:bg-[#f8f5e6]/90 md:backdrop-blur-sm transition-opacity duration-200 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => settle(false)}
      />

      <div
        className={`relative w-full max-w-sm rounded-2xl bg-[#fff9e2] p-6 shadow-[0_8px_30px_rgba(20,66,32,0.12)] transition-[transform,opacity] duration-200 ease-out will-change-transform ${
          visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-[0.96]'
        }`}
      >
        <p id="confirm-dialog-message" className="mb-5 text-left text-base font-semibold text-[var(--post-title)]">
          {message}
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => settle(false)}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
          >
            {cancelLabel}
          </button>
          <button
            autoFocus
            onClick={() => settle(true)}
            className={`rounded-full px-5 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff9e2] ${
              danger
                ? 'bg-red-500 hover:bg-red-600 focus-visible:ring-red-300'
                : 'bg-[var(--primary)] hover:opacity-85 focus-visible:ring-[var(--primary)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
