import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastOptions } from './toast-context'

interface ActiveToast extends ToastOptions {
  id: number
}

/** Un solo avviso alla volta, sopra la tab bar, con eventuale azione (es. "Annulla"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ActiveToast | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const seq = useRef(0)

  const show = useCallback((options: ToastOptions) => {
    window.clearTimeout(timer.current)
    const id = ++seq.current
    setToast({ ...options, id })
    timer.current = window.setTimeout(
      () => setToast((cur) => (cur?.id === id ? null : cur)),
      options.duration ?? 5000,
    )
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-safe lg:bottom-6 lg:pl-60"
      >
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-[#1c1c1e] py-2 pr-2 pl-4 text-white shadow-xl dark:bg-[#3a3a3c]"
          >
            <p className="flex-1 py-2 text-[0.95rem]">{toast.message}</p>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                className="pressable min-h-11 rounded-xl px-3 font-semibold text-[#5eead4]"
                onClick={() => {
                  toast.onAction?.()
                  setToast(null)
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
