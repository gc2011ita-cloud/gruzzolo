import { AlertTriangle, Share, SquarePlus } from 'lucide-react'
import { SubpageHeader } from '../../components/SubpageHeader'
import { t } from '../../i18n'
import { isIOS } from '../../lib/platform'

export function InstallPage() {
  const steps = [t().install.step1, t().install.step2, t().install.step3, t().install.step4]
  const icons = [null, Share, SquarePlus, null]

  return (
    <>
      <SubpageHeader
        title={t().install.title}
        backTo="/impostazioni"
        backLabel={t().settings.title}
      />
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => {
          const Icon = icons[i]
          return (
            <li key={s} className="flex items-start gap-3 rounded-2xl bg-surface p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-white">
                {i + 1}
              </span>
              <span className="flex-1 pt-1">{s}</span>
              {Icon && (
                <Icon aria-hidden="true" className="mt-1 size-6 shrink-0 text-accent-text" />
              )}
            </li>
          )
        })}
      </ol>

      <section className="mt-4 rounded-2xl bg-warning/15 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <AlertTriangle aria-hidden="true" className="size-5 text-warning" />
          {t().install.warningTitle}
        </h2>
        <p className="mt-2 text-sm">{t().install.warning}</p>
      </section>

      {!isIOS() && <p className="mt-4 px-1 text-sm text-muted">{t().install.desktop}</p>}
    </>
  )
}
