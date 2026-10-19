import { Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { setSetting, useSettings } from '../../db/settings'
import { t } from '../../i18n'
import { shouldSuggestInstall } from '../../lib/platform'

const SNOOZE_DAYS = 14

/** In Safari su iPhone, invita a installare l'app (si può rimandare per 14 giorni). */
export function InstallBanner() {
  const settings = useSettings()
  if (!settings || !shouldSuggestInstall()) return null
  const dismissed = settings.installHintDismissedAt
  if (dismissed && Date.now() - dismissed < SNOOZE_DAYS * 86_400_000) return null

  return (
    <div role="status" className="mb-4 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <p className="flex items-start gap-2 font-medium">
        <Smartphone aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent-text" />
        {t().install.banner}
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          to="/impostazioni/installa"
          className="pressable flex min-h-11 flex-1 items-center justify-center rounded-xl bg-accent px-3 font-semibold text-white"
        >
          {t().install.how}
        </Link>
        <button
          type="button"
          onClick={() => void setSetting('installHintDismissedAt', Date.now())}
          className="pressable min-h-11 flex-1 rounded-xl bg-surface-2 px-3 font-medium"
        >
          {t().install.dismiss}
        </button>
      </div>
    </div>
  )
}
