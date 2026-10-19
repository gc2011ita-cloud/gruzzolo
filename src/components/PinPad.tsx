import { Delete } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fmt, t } from '../i18n'
import { PIN_MAX, PIN_MIN } from '../lib/pin'

interface Props {
  title: string
  subtitle?: string
  error?: string | null
  /** Se noto, il PIN viene inviato appena raggiunta questa lunghezza. */
  length?: number
  disabled?: boolean
  onComplete: (pin: string) => void
  /** Cambia quando bisogna svuotare i punti (es. dopo un errore). */
  resetKey?: number
}

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

/** Tastierino numerico in stile iOS, utilizzabile anche da tastiera fisica. */
export function PinPad({ title, subtitle, error, length, disabled, onComplete, resetKey }: Props) {
  const [pin, setPin] = useState('')
  const max = length ?? PIN_MAX

  useEffect(() => setPin(''), [resetKey])

  const press = useCallback(
    (key: string) => {
      if (disabled) return
      if (key === 'del') return setPin((p) => p.slice(0, -1))
      setPin((p) => (p.length >= max ? p : p + key))
    },
    [disabled, max],
  )

  // Con lunghezza nota, il PIN parte da solo all'ultima cifra, una sola volta per tentativo.
  const sent = useRef(false)
  useEffect(() => {
    if (!length || pin.length < length) {
      sent.current = false
      return
    }
    if (sent.current) return
    sent.current = true
    setTimeout(() => onComplete(pin), 80)
  }, [pin, length, onComplete])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
      else if (e.key === 'Enter' && !length && pin.length >= PIN_MIN) onComplete(pin)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press, length, pin, onComplete])

  const dots = length ?? Math.max(PIN_MIN, pin.length)

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div
        key={resetKey}
        className={`mt-6 flex h-4 gap-4 ${error ? 'animate-shake' : ''}`}
        role="status"
        aria-label={fmt(t().lock.entered, { n: pin.length })}
      >
        {Array.from({ length: dots }, (_, i) => (
          <span
            key={i}
            className={`size-3.5 rounded-full border-2 border-text ${i < pin.length ? 'bg-text' : ''}`}
          />
        ))}
      </div>
      <p role="alert" className="mt-3 h-5 text-sm text-expense">
        {error}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-x-6 gap-y-4">
        {keys.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : k === 'del' ? (
            <button
              key={i}
              type="button"
              aria-label={t().lock.deleteDigit}
              disabled={disabled || pin.length === 0}
              onClick={() => press('del')}
              className="pressable flex size-[76px] items-center justify-center rounded-full text-text disabled:opacity-30"
            >
              <Delete aria-hidden="true" className="size-7" />
            </button>
          ) : (
            <button
              key={i}
              type="button"
              aria-label={fmt(t().lock.digit, { n: k })}
              disabled={disabled}
              onClick={() => press(k)}
              className="pressable flex size-[76px] items-center justify-center rounded-full bg-surface-2 text-3xl font-medium tabular-nums disabled:opacity-40"
            >
              {k}
            </button>
          ),
        )}
      </div>
      {!length && (
        <button
          type="button"
          disabled={disabled || pin.length < PIN_MIN}
          onClick={() => onComplete(pin)}
          className="pressable mt-6 min-h-12 w-56 rounded-2xl bg-accent font-semibold text-white disabled:opacity-40"
        >
          {t().security.continue}
        </button>
      )}
    </div>
  )
}
