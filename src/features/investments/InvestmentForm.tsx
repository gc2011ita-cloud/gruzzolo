import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AmountInput } from '../../components/AmountInput'
import { categoryColors } from '../../components/category-icons'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SubpageHeader } from '../../components/SubpageHeader'
import { useToast } from '../../components/toast-context'
import { db } from '../../db/db'
import { fmt, t } from '../../i18n'
import { todayISO } from '../../lib/dates'
import { parseAmount } from '../../lib/money'
import type { InvestmentKind } from '../../models'
import { addInvestment, deleteInvestment, setInvestmentArchived, updateInvestment } from './repo'

const kinds = Object.keys(t().inv.kinds) as InvestmentKind[]

export function InvestmentForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const existing = useLiveQuery(
    async () => (id ? ((await db.investments.get(id)) ?? null) : null),
    [id],
  )
  const entryCount = useLiveQuery(
    () => (id ? db.investmentEntries.where('investmentId').equals(id).count() : 0),
    [id],
  )

  const [loaded, setLoaded] = useState(!isEdit)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<InvestmentKind>('etf')
  const [color, setColor] = useState(categoryColors[7]!)
  const [note, setNote] = useState('')
  const [deposit, setDeposit] = useState('')
  const [depositDate, setDepositDate] = useState(todayISO())
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!isEdit || loaded || !existing) return
    setName(existing.name)
    setKind(existing.kind)
    setColor(existing.color)
    setNote(existing.note)
    setLoaded(true)
  }, [isEdit, loaded, existing])

  const backTo = id ? `/investimenti/${id}` : '/investimenti'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError(t().inv.nameEmpty)
    const cents = deposit.trim() ? parseAmount(deposit) : null
    if (deposit.trim() && (cents === null || cents <= 0)) return setError(t().tx.amountInvalid)
    const input = { name, kind, color, note }
    if (id) {
      await updateInvestment(id, input)
      toast({ message: t().inv.saved })
      navigate(backTo, { replace: true })
    } else {
      const newId = await addInvestment(
        input,
        cents ? { amountCents: cents, date: depositDate, note: '' } : undefined,
      )
      toast({ message: t().inv.saved })
      navigate(`/investimenti/${newId}`, { replace: true })
    }
  }

  if (isEdit && existing === null) {
    return <p className="pt-8 text-center text-muted">{t().inv.notFound}</p>
  }
  if (!loaded) return null

  return (
    <form onSubmit={submit} noValidate className="pb-8">
      <SubpageHeader
        title={isEdit ? t().inv.editTitle : t().inv.newTitle}
        backTo={backTo}
        backLabel={isEdit ? (existing?.name ?? t().inv.title) : t().inv.title}
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
        <section className="rounded-2xl bg-surface p-4">
          <label htmlFor="inv-name" className="text-sm font-medium text-muted">
            {t().inv.name}
          </label>
          <input
            id="inv-name"
            type="text"
            value={name}
            maxLength={60}
            autoFocus={!isEdit}
            placeholder={t().inv.namePlaceholder}
            onChange={(e) => setName(e.target.value)}
            className="mt-0.5 w-full bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-muted"
          />
        </section>
        {error && (
          <p role="alert" className="-mt-3 px-1 text-sm text-expense">
            {error}
          </p>
        )}

        <fieldset>
          <legend className="mb-2 px-1 text-sm font-medium text-muted">{t().inv.kind}</legend>
          <div className="flex flex-wrap gap-2">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`pressable min-h-10 rounded-full px-4 text-sm font-medium ${
                  kind === k ? 'bg-accent text-white' : 'bg-surface'
                }`}
              >
                {t().inv.kinds[k]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 px-1 text-sm font-medium text-muted">{t().inv.color}</legend>
          <div className="grid grid-cols-10 gap-2 rounded-2xl bg-surface p-3">
            {categoryColors.map((c, i) => (
              <label key={c} className="relative flex aspect-square items-center justify-center">
                <input
                  type="radio"
                  name="color"
                  checked={color === c}
                  onChange={() => setColor(c)}
                  className="peer sr-only"
                  aria-label={`${t().inv.color} ${i + 1}`}
                />
                <span
                  className="size-full rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-text peer-focus-visible:outline-3 peer-focus-visible:outline-accent-text"
                  style={{ backgroundColor: c }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        {!isEdit && (
          <section className="rounded-2xl bg-surface p-4">
            <label htmlFor="inv-deposit" className="text-sm font-medium text-muted">
              {t().inv.firstDeposit}
            </label>
            <div className="mt-1 flex items-baseline gap-2 text-3xl font-semibold tabular-nums">
              <AmountInput
                id="inv-deposit"
                value={deposit}
                placeholder="0,00"
                onChange={setDeposit}
              />
              <span className="text-xl text-muted">€</span>
            </div>
            <input
              type="date"
              aria-label={t().tx.date}
              value={depositDate}
              onChange={(e) => e.target.value && setDepositDate(e.target.value)}
              className="mt-2 min-h-10 w-full rounded-xl bg-surface-2 px-3"
            />
            <p className="mt-2 text-xs text-muted">{t().inv.firstDepositHint}</p>
          </section>
        )}

        <section className="rounded-2xl bg-surface p-4">
          <label htmlFor="inv-note" className="text-sm font-medium text-muted">
            {t().inv.note}
          </label>
          <textarea
            id="inv-note"
            value={note}
            rows={2}
            maxLength={500}
            placeholder={t().tx.notePlaceholder}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full resize-none bg-transparent outline-none placeholder:text-muted"
          />
        </section>

        <button
          type="submit"
          className="pressable min-h-12 w-full rounded-2xl bg-accent text-lg font-semibold text-white"
        >
          {t().common.save}
        </button>

        {existing && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() =>
                void setInvestmentArchived(existing.id, !existing.archived).then(() =>
                  navigate('/investimenti', { replace: true }),
                )
              }
              className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface font-semibold"
            >
              {existing.archived ? (
                <ArchiveRestore aria-hidden="true" className="size-5" />
              ) : (
                <Archive aria-hidden="true" className="size-5" />
              )}
              {existing.archived ? t().inv.restore : t().inv.archive}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface font-semibold text-expense"
            >
              <Trash2 aria-hidden="true" className="size-5" />
              {t().common.delete}
            </button>
          </div>
        )}
      </div>

      {confirmDelete && existing && (
        <ConfirmDialog
          title={t().inv.deleteTitle}
          confirmLabel={t().common.delete}
          destructive
          onConfirm={() =>
            void deleteInvestment(existing.id).then(() => {
              toast({ message: t().inv.deleted })
              navigate('/investimenti', { replace: true })
            })
          }
          onCancel={() => setConfirmDelete(false)}
        >
          <p>{fmt(t().inv.deleteBody, { n: entryCount ?? 0 })}</p>
        </ConfirmDialog>
      )}
    </form>
  )
}
