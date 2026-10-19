import { Check, Plus } from 'lucide-react'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SubpageHeader } from '../../components/SubpageHeader'
import { defaultSettings, setSetting, useSettings } from '../../db/settings'
import { t } from '../../i18n'
import type { ThemePreference } from '../../models'

/** Accenti con contrasto ≥ 4,5:1 rispetto al testo bianco dei pulsanti. */
const ACCENTS = Object.keys(t().appearance.accentNames)

export function AppearancePage() {
  const settings = useSettings() ?? defaultSettings
  const names = t().appearance.accentNames as Record<string, string>

  return (
    <>
      <SubpageHeader
        title={t().appearance.title}
        backTo="/impostazioni"
        backLabel={t().settings.title}
      />

      <section className="mt-4">
        <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">
          {t().appearance.theme}
        </h2>
        <SegmentedControl<ThemePreference>
          label={t().appearance.theme}
          value={settings.theme}
          options={[
            { value: 'auto', label: t().appearance.auto },
            { value: 'light', label: t().appearance.light },
            { value: 'dark', label: t().appearance.dark },
          ]}
          onChange={(v) => void setSetting('theme', v)}
        />
        <p className="mt-2 px-1 text-sm text-muted">{t().appearance.autoHint}</p>
      </section>

      <fieldset className="mt-6">
        <legend className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">
          {t().appearance.accent}
        </legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {ACCENTS.map((c) => {
            const selected = settings.accent === c
            return (
              <label
                key={c}
                className={`pressable flex min-h-14 cursor-pointer items-center gap-2 rounded-2xl bg-surface p-2 ${
                  selected ? 'ring-2 ring-accent-text' : ''
                }`}
              >
                <input
                  type="radio"
                  name="accent"
                  checked={selected}
                  onChange={() => void setSetting('accent', c)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text"
                  style={{ backgroundColor: c }}
                >
                  {selected && <Check className="size-4" strokeWidth={3} />}
                </span>
                <span className="text-sm">{names[c]}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <section className="mt-6" aria-label={t().appearance.preview}>
        <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">
          {t().appearance.preview}
        </h2>
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-4">
          <span className="flex-1 font-semibold text-accent-text">Gruzzolo</span>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-white">
            #tag
          </span>
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-white shadow">
            <Plus aria-hidden="true" className="size-6" />
          </span>
        </div>
      </section>
    </>
  )
}
