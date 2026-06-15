import { create } from 'zustand'

export interface ConfirmOptions {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Renders the confirm button in red for destructive actions */
  danger?: boolean
}

interface PendingConfirm {
  options: ConfirmOptions
  resolve: (confirmed: boolean) => void
}

interface ConfirmState {
  pending: PendingConfirm | null
  leaving: boolean
  request: (options: ConfirmOptions) => Promise<boolean>
  settle: (confirmed: boolean) => void
}

const LEAVE_DURATION = 180

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  pending: null,
  leaving: false,

  request: (options) => {
    // A second request while one is open cancels the first
    get().pending?.resolve(false)
    return new Promise<boolean>((resolve) => {
      set({ pending: { options, resolve }, leaving: false })
    })
  },

  settle: (confirmed) => {
    const { pending, leaving } = get()
    if (!pending || leaving) return
    // Resolve immediately so the action starts while the dialog fades out
    pending.resolve(confirmed)
    set({ leaving: true })
    setTimeout(() => set({ pending: null, leaving: false }), LEAVE_DURATION)
  }
}))

// Imperative drop-in replacement for window.confirm()
export const confirmDialog = (options: ConfirmOptions | string): Promise<boolean> =>
  useConfirmStore.getState().request(typeof options === 'string' ? { message: options } : options)