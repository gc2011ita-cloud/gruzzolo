import { Lock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PinPad } from '../../components/PinPad'
import { db } from '../../db/db'
import { fmt, t } from '../../i18n'
import { lockoutMs, verifyPin } from '../../lib/pin'
import type { PinConfig } from '../../models'

interface Props {
  pin: PinConfig
  onUnlock: () => void
}

// Tentativi falliti salvati in locale: ricaricare la pagina non azzera l'attesa.
const FAILS_KEY = 'gruzzolo.pinFails'

function loadFails(): { count: number; until: number } {
  try {
    const v = JSON.parse(localStorage.getItem(FAILS_KEY) ?? '') as { count: number; until: number }
    return { count: Number(v.count) || 0, until: Number(v.until) || 0 }
  } catch {
    return { count: 0, until: 0 }
  }
}

function saveFails(count: number, until: number) {
  try {
    if (count === 0) localStorage.removeItem(FAILS_KEY)
    else localStorage.setItem(FAILS_KEY, JSON.stringify({ count, until }))
  } catch {
    // archiviazione non disponibile: il contatore resta in memoria
  }
}

export function LockScreen({ pin, onUnlock }: Props) {
  const [failed, setFailed] = useState(() => loadFails().count)
  const [error, setError] = useState<string | null>(null)
  const [until, setUntil] = useState(() => loadFails().until)
  const [now, setNow] = useState(Date.now())
  const [checking, setChecking] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [word, setWord] = useState('')

  const waiting = until > now
  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [waiting])

  const submit = useCallback(
    async (value: string) => {
      setChecking(true)
      const ok = await verifyPin(value, pin)
      setChecking(false)
      if (ok) {
        saveFails(0, 0)
        return onUnlock()
      }
      const attempts = failed + 1
      setFailed(attempts)
      const wait = lockoutMs(attempts)
      const next = wait ? Date.now() + wait : 0
      if (wait) {
        setUntil(next)
        setNow(Date.now())
      }
      saveFails(attempts, next)
      setError(t().lock.wrong)
    },
    [pin, failed, onUnlock],
  )

  const eraseAll = async () => {
    await db.delete()
    saveFails(0, 0)
    try {
      sessionStorage.clear()
    } catch {
      // ignora
    }
    location.reload()
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-safe pt-safe pb-safe">
      <Lock aria-hidden="true" className="mb-4 size-8 text-accent-text" />
      <PinPad
        title={t().lock.title}
        length={pin.length}
        error={waiting ? fmt(t().lock.waitSeconds, { n: Math.ceil((until - now) / 1000) }) : error}
        disabled={waiting || checking}
        onComplete={(value) => void submit(value)}
        resetKey={failed}
      />
      <button
        type="button"
        onClick={() => setForgot(true)}
        className="pressable mt-6 min-h-11 rounded-xl px-3 text-sm text-accent-text"
      >
        {t().lock.forgot}
      </button>

      {forgot && (
        <ConfirmDialog
          title={t().lock.forgotTitle}
          confirmLabel={t().lock.eraseAll}
          destructive
          confirmDisabled={word.trim().toUpperCase() !== t().lock.forgotWord}
          onConfirm={() => void eraseAll()}
          onCancel={() => {
            setForgot(false)
            setWord('')
          }}
        >
          <p>{t().lock.forgotBody}</p>
          <input
            type="text"
            value={word}
            autoCapitalize="characters"
            autoCorrect="off"
            aria-label={t().lock.forgotWord}
            onChange={(e) => setWord(e.target.value)}
            className="mt-3 min-h-11 w-full rounded-xl bg-surface-2 px-3 text-text"
          />
        </ConfirmDialog>
      )}
    </main>
  )
}
