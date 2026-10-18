import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AmountInput } from '../../components/AmountInput'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SubpageHeader } from '../../components/SubpageHeader'
import { useToast } from '../../components/toast-context'
import { setSetting, useSettings } from '../../db/settings'
import { t } from '../../i18n'
import { centsToInput, parseAmount } from '../../lib/money'

export function InitialBalancePage() {
  const settings = useSettings()
  const navigate = useNavigate()
  const toast = useToast()
  const [sign, setSign] = useState<'pos' | 'neg'>('pos')
  const [amount, setAmount] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!settings || loaded) return
    const v = settings.initialBalanceCents
    setSign(v < 0 ? 'neg' : 'pos')
    setAmount(v === 0 ? '' : centsToInput(Math.abs(v)))
    setLoaded(true)
  }, [settings, loaded])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cents = amount.trim() === '' ? 0 : parseAmount(amount)
    if (cents === null) return setError(true)
    await setSetting('initialBalanceCents', sign === 'neg' ? -cents : cents)
    toast({ message: t().settings.initialSaved })
    navigate('/impostazioni', { replace: true })
  }

  if (!loaded) return null

  return (
    <form onSubmit={submit} noValidate>
      <SubpageHeader
        title={t().settings.initialBalance}
        backTo="/impostazioni"
        backLabel={t().settings.title}
        action={
          <button
            type="submit"
            className="pressable min-h-11 rounded-xl px-3 font-semibold text-accent-text"
          >
            {t().common.save}
          </button>
        }
      />
      <div className="mt-4 space-y-4">
        <SegmentedControl
          label={t().settings.initialBalance}
          value={sign}
          options={[
            { value: 'pos', label: t().settings.positive },
            { value: 'neg', label: t().settings.negative },
          ]}
          onChange={setSign}
        />
        <section className="rounded-2xl bg-surface p-4">
          <label htmlFor="initial" className="text-sm font-medium text-muted">
            {t().tx.amount}
          </label>
          <div className="mt-1 flex items-baseline gap-2 text-4xl font-semibold tabular-nums">
            <span aria-hidden="true">{sign === 'neg' ? '−' : ''}</span>
            <AmountInput
              id="initial"
              value={amount}
              placeholder="0,00"
              invalid={error}
              onChange={(v) => {
                setAmount(v)
                setError(false)
              }}
            />
            <span className="text-2xl text-muted">€</span>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-expense">
              {t().tx.amountInvalid}
            </p>
          )}
        </section>
        <p className="px-1 text-sm text-muted">{t().settings.initialBalanceHint}</p>
        <button
          type="submit"
          className="pressable min-h-12 w-full rounded-2xl bg-accent text-lg font-semibold text-white"
        >
          {t().common.save}
        </button>
      </div>
    </form>
  )
}
