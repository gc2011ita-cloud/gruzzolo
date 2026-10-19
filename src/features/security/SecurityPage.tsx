import { KeyRound, Lock, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import { PinPad } from '../../components/PinPad'
import { SubpageHeader } from '../../components/SubpageHeader'
import { Toggle } from '../../components/Toggle'
import { useToast } from '../../components/toast-context'
import { defaultSettings, setSetting, useSettings } from '../../db/settings'
import { fmt, t } from '../../i18n'
import { createPin, verifyPin } from '../../lib/pin'
import { useLock } from './lock-context'

type Flow =
  | { step: 'idle' }
  | { step: 'verify'; then: 'change' | 'disable' }
  | { step: 'new' }
  | { step: 'repeat'; first: string }

const autoLockOptions = [0, 1, 5, 15, 30]

export function SecurityPage() {
  const settings = useSettings() ?? defaultSettings
  const toast = useToast()
  const { lock } = useLock()
  const [flow, setFlow] = useState<Flow>({ step: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const enabled = Boolean(settings.pin)

  const fail = (message: string) => {
    setError(message)
    setAttempt((a) => a + 1)
  }

  const start = (next: Flow) => {
    setError(null)
    setFlow(next)
  }

  const onPin = async (value: string) => {
    if (flow.step === 'verify') {
      if (!settings.pin || !(await verifyPin(value, settings.pin))) return fail(t().lock.wrong)
      if (flow.then === 'disable') {
        await setSetting('pin', null)
        toast({ message: t().security.disabled })
        return start({ step: 'idle' })
      }
      return start({ step: 'new' })
    }
    if (flow.step === 'new') return start({ step: 'repeat', first: value })
    if (flow.step === 'repeat') {
      if (value !== flow.first) {
        fail(t().security.mismatch)
        return setFlow({ step: 'new' })
      }
      const wasEnabled = enabled
      await setSetting('pin', await createPin(value))
      toast({ message: wasEnabled ? t().security.changed : t().security.enabled })
      start({ step: 'idle' })
    }
  }

  if (flow.step !== 'idle') {
    const title =
      flow.step === 'verify'
        ? t().security.currentTitle
        : flow.step === 'new'
          ? t().security.setTitle
          : t().security.confirmTitle
    return (
      <>
        <SubpageHeader
          title={t().security.title}
          backTo="/impostazioni/sicurezza"
          backLabel={t().common.cancel}
          action={
            <button
              type="button"
              onClick={() => start({ step: 'idle' })}
              className="pressable min-h-11 rounded-xl px-3 text-accent-text"
            >
              {t().common.cancel}
            </button>
          }
        />
        <div className="mt-8">
          <PinPad
            key={flow.step}
            title={title}
            subtitle={flow.step === 'new' ? t().security.setHint : undefined}
            length={
              flow.step === 'verify'
                ? settings.pin?.length
                : flow.step === 'repeat'
                  ? flow.first.length
                  : undefined
            }
            error={error}
            resetKey={attempt}
            onComplete={(v) => void onPin(v)}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <SubpageHeader
        title={t().security.title}
        backTo="/impostazioni"
        backLabel={t().settings.title}
      />
      <section className="mt-4 rounded-2xl bg-surface px-4 py-2">
        <Toggle
          checked={enabled}
          onChange={(on) => start(on ? { step: 'new' } : { step: 'verify', then: 'disable' })}
          label={t().security.pinLock}
          description={t().security.pinLockHint}
        />
      </section>

      {enabled && (
        <>
          <section className="mt-4 rounded-2xl bg-surface p-4">
            <label className="flex min-h-12 items-center justify-between gap-3">
              <span>{t().security.autoLock}</span>
              <select
                value={settings.autoLockMinutes}
                onChange={(e) => void setSetting('autoLockMinutes', Number(e.target.value))}
                className="min-h-11 rounded-xl bg-surface-2 px-3"
              >
                {autoLockOptions.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? t().security.immediately : fmt(t().security.minutes, { n })}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1 text-sm text-muted">{t().security.autoLockHint}</p>
          </section>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => start({ step: 'verify', then: 'change' })}
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface font-semibold"
            >
              <KeyRound aria-hidden="true" className="size-5" />
              {t().security.change}
            </button>
            <button
              type="button"
              onClick={lock}
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface font-semibold"
            >
              <Lock aria-hidden="true" className="size-5" />
              {t().security.lockNow}
            </button>
            <button
              type="button"
              onClick={() => start({ step: 'verify', then: 'disable' })}
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface font-semibold text-expense"
            >
              <ShieldOff aria-hidden="true" className="size-5" />
              {t().security.disable}
            </button>
          </div>
        </>
      )}

      <p className="mt-4 px-1 text-sm text-muted">{t().security.notEncrypted}</p>
      <p className="mt-2 px-1 text-sm text-muted">{t().security.faceIdLater}</p>
    </>
  )
}
