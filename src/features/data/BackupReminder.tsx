import { useLiveQuery } from 'dexie-react-hooks'
import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../../db/db'
import { useSettings } from '../../db/settings'
import { fmt, t } from '../../i18n'
import { backupDue } from '../../lib/backup'

const SNOOZE_KEY = 'gruzzolo.backupSnooze'

/** Avviso in Panoramica quando l'ultimo backup è più vecchio del promemoria scelto. */
export function BackupReminder() {
  const settings = useSettings()
  const oldest = useLiveQuery(
    async () => (await db.transactions.orderBy('updatedAt').first())?.createdAt ?? null,
    [],
  )
  const [snoozed, setSnoozed] = useState(() => {
    try {
      return sessionStorage.getItem(SNOOZE_KEY) === '1'
    } catch {
      return false
    }
  })

  if (!settings || oldest === undefined || snoozed) return null
  if (!backupDue(settings.lastBackupAt, oldest, settings.backupReminderDays)) return null

  return (
    <div role="status" className="mb-4 rounded-2xl bg-warning/15 p-4">
      <p className="flex items-start gap-2 font-medium">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
        {settings.lastBackupAt
          ? fmt(t().data.reminderBanner, { n: settings.backupReminderDays })
          : t().data.reminderBannerNever}
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          to="/impostazioni/dati"
          className="pressable flex min-h-11 flex-1 items-center justify-center rounded-xl bg-accent px-3 font-semibold text-white"
        >
          {t().data.reminderAction}
        </Link>
        <button
          type="button"
          onClick={() => {
            setSnoozed(true)
            try {
              sessionStorage.setItem(SNOOZE_KEY, '1')
            } catch {
              // ignora
            }
          }}
          className="pressable min-h-11 flex-1 rounded-xl bg-surface px-3 font-medium"
        >
          {t().data.reminderDismiss}
        </button>
      </div>
    </div>
  )
}
