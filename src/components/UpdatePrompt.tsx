import { useRegisterSW } from 'virtual:pwa-register/react'
import { t } from '../i18n'

/** Avviso "Nuova versione disponibile" quando il service worker ha un aggiornamento. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Controlla aggiornamenti ogni ora mentre l'app resta aperta.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 px-safe pt-[calc(env(safe-area-inset-top)+0.5rem)]"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-surface p-3 shadow-lg ring-1 ring-border">
        <p className="flex-1 text-sm">{t().update.available}</p>
        <button
          type="button"
          className="pressable min-h-11 rounded-xl px-3 text-sm text-muted"
          onClick={() => setNeedRefresh(false)}
        >
          {t().common.later}
        </button>
        <button
          type="button"
          className="pressable min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white"
          onClick={() => void updateServiceWorker(true)}
        >
          {t().common.reload}
        </button>
      </div>
    </div>
  )
}
