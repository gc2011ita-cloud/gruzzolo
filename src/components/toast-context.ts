import { createContext, useContext } from 'react'

export interface ToastOptions {
  message: string
  actionLabel?: string
  onAction?: () => void
  /** Durata in millisecondi (predefinita 5000). */
  duration?: number
}

export const ToastContext = createContext<(toast: ToastOptions) => void>(() => {})

export function useToast(): (toast: ToastOptions) => void {
  return useContext(ToastContext)
}
