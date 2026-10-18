import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AmountInput } from '../../components/AmountInput'
import { CategoryIcon } from '../../components/CategoryIcon'
import { SegmentedControl } from '../../components/SegmentedControl'
import { t } from '../../i18n'
import { periodLabel, periodRange, shiftPeriod, type PeriodKind } from '../../lib/dates'
import { centsToInput, parseAmount } from '../../lib/money'
import type { Category } from '../../models'
import { emptyFilters, type ListFilterState } from './filter-state'

interface Props {
  value: ListFilterState
  onChange: (f: ListFilterState) => void
  onClose: () => void
  categories: Category[]
  tags: string[]
}

const periods = [
  { value: 'all', label: t().list.periodAll },
  { value: 'week', label: t().list.periodWeek },
  { value: 'month', label: t().list.periodMonth },
  { value: 'year', label: t().list.periodYear },
  { value: 'custom', label: t().list.periodCustom },
] as const

const types = [
  { value: 'all', label: t().list.typeAll },
  { value: 'expense', label: t().tx.expenses },
  { value: 'income', label: t().tx.incomes },
] as const

function toggle(list: string[] | undefined, item: string): string[] | undefined {
  const next = list?.includes(item) ? list.filter((x) => x !== item) : [...(list ?? []), item]
  return next.length ? next : undefined
}

/** Pannello dal basso con tutti i filtri; le modifiche si applicano subito. */
export function FiltersSheet({ value, onChange, onClose, categories, tags }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [min, setMin] = useState(value.minCents !== undefined ? centsToInput(value.minCents) : '')
  const [max, setMax] = useState(value.maxCents !== undefined ? centsToInput(value.maxCents) : '')

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const setPeriod = (period: PeriodKind | 'all') => {
    if (period === 'all') onChange({ ...value, period, range: undefined })
    else if (period === 'custom')
      onChange({ ...value, period, range: value.range ?? periodRange('month', new Date()) })
    else onChange({ ...value, period, range: periodRange(period, new Date()) })
  }

  const setAmountBound = (which: 'minCents' | 'maxCents', text: string) => {
    const cents = text.trim() ? parseAmount(text) : undefined
    if (cents === null) return
    onChange({ ...value, [which]: cents })
  }

  const visibleCats = value.type ? categories.filter((c) => c.kind === value.type) : categories

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
        className="relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl bg-bg pb-safe shadow-2xl lg:rounded-3xl"
      >
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <button
            type="button"
            onClick={() => {
              setMin('')
              setMax('')
              onChange(emptyFilters)
            }}
            className="pressable min-h-11 rounded-xl px-3 text-accent-text"
          >
            {t().common.reset}
          </button>
          <h2 id="filters-title" className="font-semibold">
            {t().list.filters}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="pressable min-h-11 rounded-xl px-3 font-semibold text-accent-text"
          >
            {t().common.close}
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto overscroll-contain px-4 pb-6">
          <section>
            <h3 className="mb-2 text-sm font-medium text-muted">{t().list.period}</h3>
            <div className="flex flex-wrap gap-2">
              {periods.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={value.period === p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`pressable min-h-10 rounded-full px-4 text-sm font-medium ${
                    value.period === p.value ? 'bg-accent text-white' : 'bg-surface'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {value.range && value.period !== 'all' && value.period !== 'custom' && (
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface p-1">
                <button
                  type="button"
                  aria-label={t().list.previous}
                  onClick={() =>
                    onChange({
                      ...value,
                      range: shiftPeriod(value.range!, value.period as PeriodKind, -1),
                    })
                  }
                  className="pressable flex size-11 items-center justify-center rounded-xl"
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <span className="font-medium capitalize">
                  {periodLabel(value.period as PeriodKind, value.range)}
                </span>
                <button
                  type="button"
                  aria-label={t().list.next}
                  onClick={() =>
                    onChange({
                      ...value,
                      range: shiftPeriod(value.range!, value.period as PeriodKind, 1),
                    })
                  }
                  className="pressable flex size-11 items-center justify-center rounded-xl"
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            )}
            {value.period === 'custom' && value.range && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="rounded-2xl bg-surface p-3 text-sm text-muted">
                  {t().list.from}
                  <input
                    type="date"
                    value={value.range.from}
                    max={value.range.to}
                    onChange={(e) =>
                      e.target.value &&
                      onChange({ ...value, range: { ...value.range!, from: e.target.value } })
                    }
                    className="mt-1 block w-full bg-transparent text-text"
                  />
                </label>
                <label className="rounded-2xl bg-surface p-3 text-sm text-muted">
                  {t().list.to}
                  <input
                    type="date"
                    value={value.range.to}
                    min={value.range.from}
                    onChange={(e) =>
                      e.target.value &&
                      onChange({ ...value, range: { ...value.range!, to: e.target.value } })
                    }
                    className="mt-1 block w-full bg-transparent text-text"
                  />
                </label>
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium text-muted">{t().list.type}</h3>
            <SegmentedControl
              label={t().list.type}
              value={value.type ?? 'all'}
              options={types}
              onChange={(v) =>
                onChange({
                  ...value,
                  type: v === 'all' ? undefined : v,
                  // Toglie le categorie che non appartengono al nuovo tipo.
                  categoryIds:
                    v === 'all'
                      ? value.categoryIds
                      : value.categoryIds?.filter(
                          (id) => categories.find((c) => c.id === id)?.kind === v,
                        ),
                })
              }
            />
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium text-muted">{t().list.categories}</h3>
            <div className="flex flex-wrap gap-2">
              {visibleCats.map((c) => {
                const on = value.categoryIds?.includes(c.id) ?? false
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      onChange({ ...value, categoryIds: toggle(value.categoryIds, c.id) })
                    }
                    className={`pressable flex min-h-10 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm ${
                      on ? 'bg-surface font-semibold ring-2 ring-accent-text' : 'bg-surface'
                    }`}
                  >
                    <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                    {c.name}
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium text-muted">{t().list.tags}</h3>
            {tags.length === 0 ? (
              <p className="text-sm text-muted">{t().list.noTags}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const on = value.tags?.includes(tag) ?? false
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onChange({ ...value, tags: toggle(value.tags, tag) })}
                      className={`pressable min-h-10 rounded-full px-3 text-sm font-medium ${
                        on ? 'bg-accent text-white' : 'bg-surface'
                      }`}
                    >
                      #{tag}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-medium text-muted">{t().list.amountRange}</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="rounded-2xl bg-surface p-3 text-sm text-muted">
                {t().list.min}
                <AmountInput
                  value={min}
                  placeholder="0,00"
                  onChange={(v) => {
                    setMin(v)
                    setAmountBound('minCents', v)
                  }}
                  className="mt-1 block text-text"
                />
              </label>
              <label className="rounded-2xl bg-surface p-3 text-sm text-muted">
                {t().list.max}
                <AmountInput
                  value={max}
                  placeholder="—"
                  onChange={(v) => {
                    setMax(v)
                    setAmountBound('maxCents', v)
                  }}
                  className="mt-1 block text-text"
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
