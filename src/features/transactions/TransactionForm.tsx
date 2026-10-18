import { addDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AmountInput } from '../../components/AmountInput'
import { CategoryIcon } from '../../components/CategoryIcon'
import { SegmentedControl } from '../../components/SegmentedControl'
import { TagInput } from '../../components/TagInput'
import { useToast } from '../../components/toast-context'
import { db } from '../../db/db'
import { t } from '../../i18n'
import { isISODate, toISODate, todayISO } from '../../lib/dates'
import type { CompressedImage } from '../../lib/image'
import { centsToInput, parseAmount } from '../../lib/money'
import type { TransactionType } from '../../models'
import { useAllTags, useCategories } from './hooks'
import { ReceiptField } from './ReceiptField'
import {
  addTransaction,
  deleteTransaction,
  restoreTransaction,
  updateTransaction,
  type ReceiptChange,
} from './repo'

const typeOptions = [
  { value: 'expense', label: t().tx.expense },
  { value: 'income', label: t().tx.income },
] as const

export function TransactionForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const existing = useLiveQuery(
    async () => (id ? ((await db.transactions.get(id)) ?? null) : null),
    [id],
  )
  const existingReceipt = useLiveQuery(
    async () =>
      existing?.receiptId ? ((await db.receipts.get(existing.receiptId)) ?? null) : null,
    [existing?.receiptId],
  )

  const [loaded, setLoaded] = useState(!isEdit)
  const [type, setType] = useState<TransactionType>(
    search.get('tipo') === 'entrata' ? 'income' : 'expense',
  )
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newReceipt, setNewReceipt] = useState<CompressedImage | null>(null)
  const [receiptChange, setReceiptChange] = useState<ReceiptChange>(undefined)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const categories = useCategories(type)
  const allTags = useAllTags()

  // In modifica, riempie il form una sola volta quando il movimento è caricato.
  useEffect(() => {
    if (!isEdit || loaded || !existing) return
    setType(existing.type)
    setAmount(centsToInput(existing.amountCents))
    setCategoryId(existing.categoryId)
    setDate(existing.date)
    setNote(existing.note)
    setTags(existing.tags)
    setLoaded(true)
  }, [isEdit, loaded, existing])

  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate('/movimenti', { replace: true })
  }

  const cents = parseAmount(amount)
  const amountError = submitted && (cents === null || cents <= 0)
  const categoryError = submitted && !categoryId
  const today = todayISO()

  const receiptBlob =
    receiptChange === null ? null : (newReceipt?.blob ?? existingReceipt?.blob ?? null)

  const changeType = (next: TransactionType) => {
    setType(next)
    if (next !== type) setCategoryId('')
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    setSubmitted(true)
    if (cents === null || cents <= 0 || !categoryId || !isISODate(date) || saving) return
    setSaving(true)
    const input = { type, amountCents: cents, categoryId, date, note, tags }
    try {
      if (id) {
        await updateTransaction(id, input, receiptChange)
        toast({ message: t().tx.updated })
      } else {
        await addTransaction(input, receiptChange)
        toast({ message: t().tx.saved })
      }
      goBack()
    } catch {
      setSaving(false)
      toast({ message: t().tx.saveError })
    }
  }

  const remove = async () => {
    if (!id) return
    const deleted = await deleteTransaction(id)
    goBack()
    if (deleted) {
      toast({
        message: t().tx.deleted,
        actionLabel: t().common.undo,
        onAction: () => void restoreTransaction(deleted),
        duration: 7000,
      })
    }
  }

  if (isEdit && existing === null) {
    return <p className="pt-8 text-center text-muted">{t().tx.notFound}</p>
  }
  if (!loaded) return null

  const quickDates = [
    { label: t().tx.yesterday, value: toISODate(addDays(new Date(), -1)) },
    { label: t().tx.today, value: today },
    { label: t().tx.tomorrow, value: toISODate(addDays(new Date(), 1)) },
  ]

  return (
    <form onSubmit={submit} noValidate className="pb-8">
      <div className="sticky top-0 z-20 -mx-4 -mt-[env(safe-area-inset-top)] flex items-center justify-between bg-bg/90 px-2 pt-[calc(env(safe-area-inset-top)+0.25rem)] pb-1 backdrop-blur-xl lg:mx-0">
        <button
          type="button"
          onClick={goBack}
          className="pressable min-h-11 rounded-xl px-3 text-accent-text"
        >
          {t().common.cancel}
        </button>
        <h1 className="text-[1.05rem] font-semibold">
          {isEdit ? t().tx.editTitle : t().tx.newTitle}
        </h1>
        <button
          type="submit"
          disabled={saving}
          className="pressable min-h-11 rounded-xl px-3 font-semibold text-accent-text disabled:opacity-50"
        >
          {t().common.save}
        </button>
      </div>

      <div className="mt-3 space-y-5">
        <SegmentedControl
          label={t().list.type}
          value={type}
          options={typeOptions}
          onChange={changeType}
        />

        <section className="rounded-2xl bg-surface p-4">
          <label htmlFor="amount" className="text-sm font-medium text-muted">
            {t().tx.amount}
          </label>
          <div
            className={`mt-1 flex items-baseline gap-2 text-5xl font-semibold tabular-nums ${
              type === 'income' ? 'text-income' : 'text-expense'
            }`}
          >
            <span aria-hidden="true">{type === 'income' ? '+' : '−'}</span>
            <AmountInput
              id="amount"
              value={amount}
              onChange={setAmount}
              invalid={amountError}
              autoFocus={!isEdit}
              placeholder="0,00"
              aria-describedby={amountError ? 'amount-error' : undefined}
            />
            <span className="text-3xl text-muted">€</span>
          </div>
          {amountError && (
            <p id="amount-error" role="alert" className="mt-2 text-sm text-expense">
              {t().tx.amountInvalid}
            </p>
          )}
        </section>

        <fieldset>
          <legend className="mb-2 px-1 text-sm font-medium text-muted">{t().tx.category}</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {categories?.map((c) => {
              const selected = c.id === categoryId
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCategoryId(c.id)}
                  className={`pressable flex min-h-22 flex-col items-center justify-start gap-1.5 rounded-2xl p-2 text-center text-[0.72rem] leading-tight ${
                    selected ? 'bg-surface ring-2 ring-accent-text' : 'bg-surface/60'
                  }`}
                >
                  <CategoryIcon icon={c.icon} color={c.color} />
                  <span className={selected ? 'font-semibold' : ''}>{c.name}</span>
                </button>
              )
            })}
          </div>
          {categoryError && (
            <p role="alert" className="mt-2 px-1 text-sm text-expense">
              {t().tx.categoryMissing}
            </p>
          )}
        </fieldset>

        <section className="rounded-2xl bg-surface p-4">
          <label htmlFor="date" className="text-sm font-medium text-muted">
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
              id="date"
              type="date"
              value={date}
              required
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="min-h-10 flex-1 rounded-xl bg-surface-2 px-3"
            />
          </div>
          {date > today && <p className="mt-2 text-sm text-warning">{t().tx.futureHint}</p>}
        </section>

        <section className="rounded-2xl bg-surface p-4">
          <p className="text-sm font-medium text-muted">{t().tx.tags}</p>
          <div className="mt-2">
            <TagInput value={tags} onChange={setTags} suggestions={allTags} />
          </div>
          <p className="mt-2 text-xs text-muted">{t().tx.tagsHint}</p>
        </section>

        <section className="rounded-2xl bg-surface p-4">
          <label htmlFor="note" className="text-sm font-medium text-muted">
            {t().tx.note}
          </label>
          <textarea
            id="note"
            value={note}
            rows={2}
            maxLength={500}
            placeholder={t().tx.notePlaceholder}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full resize-none bg-transparent outline-none placeholder:text-muted"
          />
        </section>

        <section className="rounded-2xl bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-muted">{t().tx.receipt}</p>
          <ReceiptField
            image={receiptBlob}
            onPick={(img) => {
              setNewReceipt(img)
              setReceiptChange({
                blob: img.blob,
                mimeType: img.mimeType,
                width: img.width,
                height: img.height,
                size: img.size,
              })
            }}
            onRemove={() => {
              setNewReceipt(null)
              setReceiptChange(null)
            }}
          />
        </section>

        <button
          type="submit"
          disabled={saving}
          className="pressable min-h-12 w-full rounded-2xl bg-accent text-lg font-semibold text-white disabled:opacity-50"
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
