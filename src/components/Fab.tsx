import { Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { t } from '../i18n'

/** Pulsante "+" sempre visibile per aggiungere un movimento (nascosto dentro il form). */
export function Fab() {
  const { pathname } = useLocation()
  // Nascosto nelle pagine interne (form e dettagli), visibile nelle schede principali.
  if (['/movimenti/', '/impostazioni/', '/investimenti/'].some((p) => pathname.startsWith(p))) {
    return null
  }

  return (
    <Link
      to="/movimenti/nuovo"
      aria-label={t().nav.add}
      className="pressable fixed right-[max(1.25rem,env(safe-area-inset-right))] bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-black/25 lg:right-8 lg:bottom-8"
    >
      <Plus aria-hidden="true" className="size-7" strokeWidth={2.5} />
    </Link>
  )
}
