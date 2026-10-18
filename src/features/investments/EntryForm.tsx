import { addDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AmountInput } from '../../components/AmountInput'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SubpageHeader } from '../../components/SubpageHeader'
import { useToast } from '../../components/toast-context'
import { db } from '../../db/db'
import { fmt, t } from '../../i18n'
import { isISODate, toISODate, todayISO } from '../../lib/dates'
import { position } from '../../lib/investments'
import { centsToInput, formatCents, parseAmount } from '../../lib/money'
import type { InvestmentEntryType } from '../../models'
import { addEntry, deleteEntry, restoreEntry, updateEntry } from './repo'

const types = (['valuation', 'deposit', 'withdrawal'] as const).map((value) => ({
  value,
  label: t().inv.actions[value],
}))

function isEntryType(v: string | null): v is InvestmentEntryType {
  return v === 'valuation' || v === 'deposit' || v === 'withdrawal'
}

export function EntryForm() {
  const { id = '', entryId } = useParams()
  const isEdit = Boolean(entryId)
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  const investment = useLiveQuery(async () => (await db.investments.get(id)) ?? null, [id])
  const entries = useLiveQuery(
    () => db.investmentEntries.where('investmentId').equals(id).toArray(),
    [id],
  )
  const existing = entries?.find((e) => e.id === entryId)

  const initialType = search.get('tipo')
  const [type, setType] = useState<InvestmentEntryType>(
    isEntryType(initialType) ? initialType : 'valuation',
  )
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [loaded, setLoaded] = useState(!isEdit)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isEdit || loaded || !existing) return
    setType(existing.type)
    setAmount(centsToInput(existing.amountCents))
    setDate(existing.date)
    setNote(existing.note)
    setLoaded(true)
  }, [isEdit, loaded, existing])

  const backTo = `/investimenti/${id}`

  // Stima del valore alla data scelta, escludendo l'operazione che si sta modificando.
  const estimate = entries
    ? position(
        entries.filter((e) => e.id !== entryId),
        date,
      ).value
    : 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cents = parseAmount(amount)
    const valid = cents !== null && (type === 'valuation' ? cents >= 0 : cents > 0)
    if (!valid || !isISODate(date)) return setError(true)
    const input = { type, amountCents: cents, date, note }
    if (entryId) await updateEntry(entryId, input)
    else await addEntry(id, input)
    toast({ message: t().inv.entrySaved })
    navigate(backTo, { replace: true })
  }

  const remove = async () => {
    if (!entryId) return
    const removed = await deleteEntry(entryId)
    navigate(backTo, { replace: true })
    if (removed) {
      toast({
        message: t().inv.entryDeleted,
        actionLabel: t().common.undo,
        onAction: () => void restoreEntry(removed),
        duration: 7000,
      })
    }
  }

  if (investment === null || (isEdit && entries && !existing)) {
    return <p className="pt-8 text-center text-muted">{t().inv.notFound}</p>
  }
  if (!investment || !loaded) return null

  const quickDates = [
    { label: t().tx.yesterday, value: toISODate(addDays(new Date(), -1)) },
    { label: t().tx.today, value: todayISO() },
  ]

  return (
    <form onSubmit={submit} noValidate className="pb-8">
      <SubpageHeader
        title={isEdit ? t().inv.entryEdit : t().inv.entryNew}
        backTo={backTo}
        backLabel={investment.name}
        action={
          <button
            type="submit"
            className="pressable min-h-11 rounded-xl px-3 font-semibold text-accent-text"
          >
            {t().common.save}
          </button>
        }
      />
      <div className="mt-4 space-y-5">
        <SegmentedControl label={t().inv.kind} value={type} options={types} onChange={setType} />

        <section className="rounded-2xl bg-surface p-4">
          <label htmlFor="entry-amount" className="text-sm font-medium text-muted">
            {type === 'valuation' ? t().inv.valuationLabel : t().inv.amountLabel}
          </label>
          <div className="mt-1 flex items-baseline gap-2 text-4xl font-semibold tabular-nums">
            {type !== 'valuation' && (
              <span aria-hidden="true">{type === 'deposit' ? '+' : '−'}</span>
            )}
            <AmountInput
              id="entry-amount"
              value={amount}
              placeholder="0,00"
              autoFocus={!isEdit}
              invalid={error}
              onChange={(v) => {
                setAmount(v)
                setError(false)
              }}
            />
            <span className="text-2xl text-muted">€</span>
          </div>
          {type === 'valuation' && (
            <p className="mt-2 text-sm text-muted">
              {fmt(t().inv.valuationHint, { amount: formatCents(estimate) })}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-expense">
              {t().tx.amountInvalid}
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-surface p-4">
          <label htmlFor="entry-date" className="text-sm font-medium text-muted">
            {t().tx.date}
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {quickDates.map((d) => (
              <button
                key={d.value}
                type="button"
                aria-pressed={date === d.value}
                onClick={() => setDate(d.value)}
                className={`pressable min-h-10 rounded-full px-4 text-sm font-medium ${
                  date === d.value ? 'bg-accent text-white' : 'bg-surface-2'
                }`}
              >
                {d.label}
              </button>
            ))}
            <input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="min-h-10 flex-1 rounded-xl bg-surface-2 px-3"
            />
          </div>
        </section>

        <section className="rounded-2xl bg-surface p-4">
          <label htmlFor="entry-note" className="text-sm font-medium text-muted">
            {t().tx.note}
          </label>
          <input
            id="entry-note"
            type="text"
            value={note}
            maxLength={200}
            placeholder={t().tx.notePlaceholder}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full bg-transparent outline-none placeholder:text-muted"
          />
        </section>

        <button
          type="submit"
          className="pressable min-h-12 w-full rounded-2xl bg-accent text-lg font-semibold text-white"
        >
          {t().common.save}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={() => void remove()}
            className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface font-semibold text-expense"
          >
            <Trash2 aria-hidden="true" className="size-5" />
            {t().common.delete}
          </button>
        )}
      </div>
    </form>
  )
}
