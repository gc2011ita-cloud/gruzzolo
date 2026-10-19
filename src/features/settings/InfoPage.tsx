import { HardDrive, ShieldCheck, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SubpageHeader } from '../../components/SubpageHeader'
import { fmt, t } from '../../i18n'
import { isStandalone } from '../../lib/platform'
import {
  formatBytes,
  getStorageStatus,
  requestPersistence,
  type StorageStatus,
} from '../../lib/storage'

export function InfoPage() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const refresh = useCallback(() => void getStorageStatus().then(setStatus), [])
  useEffect(refresh, [refresh])

  return (
    <>
      <SubpageHeader title={t().info.title} backTo="/impostazioni" backLabel={t().settings.title} />

      <section className="mt-4 rounded-2xl bg-surface p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <HardDrive aria-hidden="true" className="size-5 text-accent-text" />
          {t().info.storage}
        </h2>
        {status && !status.supported ? (
          <p className="mt-2 text-sm text-muted">{t().info.unsupported}</p>
        ) : status ? (
          <>
            <p className={`mt-2 font-medium ${status.persisted ? '' : 'text-warning'}`}>
              {status.persisted ? `✓ ${t().info.persisted}` : `! ${t().info.notPersisted}`}
            </p>
            {status.usage !== null && (
              <p className="mt-1 text-sm text-muted">
                {status.quota
                  ? fmt(t().info.usedOf, {
                      used: formatBytes(status.usage),
                      quota: formatBytes(status.quota),
                    })
                  : fmt(t().info.used, { used: formatBytes(status.usage) })}
              </p>
            )}
            <p className="mt-2 text-sm text-muted">{t().info.persistedHint}</p>
            {!status.persisted && (
              <button
                type="button"
                onClick={() => void requestPersistence().then(refresh)}
                className="pressable mt-3 min-h-11 w-full rounded-xl bg-surface-2 font-semibold"
              >
                {t().info.request}
              </button>
            )}
          </>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldCheck aria-hidden="true" className="size-5 text-accent-text" />
          {t().info.privacy}
        </h2>
        <p className="mt-2 text-sm text-muted">{t().info.privacyText}</p>
      </section>

      <section className="mt-4 rounded-2xl bg-surface p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Smartphone aria-hidden="true" className="size-5 text-accent-text" />
          {t().info.install}
        </h2>
        {isStandalone() ? (
          <p className="mt-2 text-sm text-muted">{t().info.standalone}</p>
        ) : (
          <Link
            to="/impostazioni/installa"
            className="pressable mt-3 flex min-h-11 items-center justify-center rounded-xl bg-surface-2 font-semibold"
          >
            {t().install.how}
          </Link>
        )}
      </section>

      <p className="mt-6 text-center text-sm text-muted">
        {t().app.name} · {t().info.version} {__APP_VERSION__}
      </p>
    </>
  )
}
