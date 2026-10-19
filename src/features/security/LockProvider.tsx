import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSettings } from '../../db/settings'
import { LockContext } from './lock-context'
import { LockScreen } from './LockScreen'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/**
 * Mostra la schermata di blocco all'avvio (se il PIN è attivo), dopo X minuti di inattività
 * e al ritorno dall'app in background. Quando è bloccata l'app non viene proprio montata,
 * così i dati non sono nel DOM.
 */
export function LockProvider({ children }: { children: ReactNode }) {
  const settings = useSettings()
  const pin = settings?.pin ?? null
  const minutes = settings?.autoLockMinutes ?? 5
  const [locked, setLocked] = useState<boolean | null>(null)
  const [hidden, setHidden] = useState(false)
  const lastActivity = useRef(Date.now())
  const hiddenAt = useRef<number | null>(null)

  // Primo caricamento delle impostazioni: bloccata se esiste un PIN.
  useEffect(() => {
    if (settings && locked === null) setLocked(Boolean(settings.pin))
  }, [settings, locked])

  // Se il PIN viene disattivato altrove, sblocca.
  useEffect(() => {
    if (settings && !settings.pin) setLocked(false)
  }, [settings])

  const lock = useCallback(() => {
    if (pin) setLocked(true)
  }, [pin])

  useEffect(() => {
    if (!pin) return
    const limit = minutes * 60_000
    const touch = () => {
      lastActivity.current = Date.now()
    }
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now()
        setHidden(true)
      } else {
        setHidden(false)
        if (hiddenAt.current !== null && Date.now() - hiddenAt.current >= limit) setLocked(true)
        hiddenAt.current = null
        touch()
      }
    }
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }))
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(() => {
      if (limit > 0 && !document.hidden && Date.now() - lastActivity.current >= limit) {
        setLocked(true)
      }
    }, 15_000)
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch))
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }, [pin, minutes])

  const api = useMemo(() => ({ lock }), [lock])

  if (!settings || locked === null) return null
  if (locked && pin) {
    return (
      <LockScreen
        pin={pin}
        onUnlock={() => {
          lastActivity.current = Date.now()
          setLocked(false)
        }}
      />
    )
  }

  return (
    <LockContext.Provider value={api}>
      {children}
      {/* Copre i contenuti nell'anteprima del selettore app di iOS quando l'app va in background. */}
      {pin && hidden && <div aria-hidden="true" className="fixed inset-0 z-[100] bg-bg" />}
    </LockContext.Provider>
  )
}
