import { useEffect, useRef, type ReactNode } from 'react'
import { t } from '../i18n'

interface Props {
  title: string
  children?: ReactNode
  confirmLabel: string
  destructive?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Finestra di conferma accessibile (focus sul pulsante Annulla, Esc per chiudere). */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  destructive,
  confirmDisabled,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-sm rounded-3xl bg-surface p-5 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        {children && <div className="mt-2 text-[0.95rem] text-muted">{children}</div>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="pressable min-h-11 rounded-xl bg-surface-2 font-semibold"
          >
            {t().common.cancel}
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
            className={`pressable min-h-11 rounded-xl font-semibold text-white disabled:opacity-40 ${
              destructive ? 'bg-[#c2002a]' : 'bg-accent'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
