import { useLiveQuery } from 'dexie-react-hooks'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { db } from '../../db/db'
import { fmt, t } from '../../i18n'
import { totals } from '../../lib/balances'
import { dayLabel, todayISO } from '../../lib/dates'
import { activeFilterCount, applyFilters, groupByDay } from '../../lib/filters'
import { formatCents } from '../../lib/money'
import { usePersistentFilters } from './filter-state'
import { FiltersSheet } from './FiltersSheet'
import { useAllTags, useCategoryMap } from './hooks'
import { TransactionRow } from './TransactionRow'

const PAGE = 150

export function TransactionsPage() {
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories = useCategoryMap()
  const tags = useAllTags()
  const [filters, setFilters] = usePersistentFilters()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const closeSheet = useCallback(() => setSheetOpen(false), [])

  const filtered = useMemo(
    () =>
      applyFilters(
        transactions ?? [],
        {
          ...filters,
          range: filters.period === 'all' ? undefined : filters.range,
          query: deferredQuery,
        },
        categories,
      ),
    [transactions, filters, deferredQuery, categories],
  )
  const groups = useMemo(() => groupByDay(filtered), [filtered])
  // Prima le uscite, poi le entrate, ciascuna nell'ordine scelto dall'utente.
  const activeCategories = useMemo(
    () =>
      [...categories.values()]
        .filter((c) => !c.archived)
        .sort((a, b) => (a.kind === b.kind ? a.order - b.order : a.kind === 'expense' ? -1 : 1)),
    [categories],
  )
  const sum = useMemo(() => totals(filtered), [filtered])

  const nFilters = activeFilterCount({
    ...filters,
    range: filters.period === 'all' ? undefined : filters.range,
  })
  const narrowed = nFilters > 0 || deferredQuery.trim() !== ''
  const today = todayISO()

  // Mostra i gruppi finché non si supera il limite di righe.
  let shown = 0
  const visibleGroups = groups.filter((g) => {
    if (shown >= limit) return false
    shown += g.items.length
    return true
  })

  if (!transactions) return null

  return (
    <>
      <PageHeader title={t().nav.transactions} />

      <div className="flex gap-2">
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl bg-surface-2 px-3">
          <Search aria-hidden="true" className="size-5 shrink-0 text-muted" />
          <span className="sr-only">{t().list.search}</span>
          <input
            type="search"
            value={query}
            enterKeyHint="search"
            placeholder={t().list.search}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
          {query && (
            <button
              type="button"
              aria-label={t().common.reset}
              onClick={() => setQuery('')}
              className="flex size-8 items-center justify-center rounded-full text-muted"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          className={`pressable flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 font-medium whitespace-nowrap ${
            nFilters ? 'bg-accent text-white' : 'bg-surface-2'
          }`}
        >
          <SlidersHorizontal aria-hidden="true" className="size-5" />
          <span>{nFilters ? fmt(t().list.filtersActive, { n: nFilters }) : t().list.filters}</span>
        </button>
      </div>

      {narrowed && filtered.length > 0 && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-surface p-2">
            <dt className="text-muted">{t().tx.incomes}</dt>
            <dd className="font-semibold text-income tabular-nums">{formatCents(sum.income)}</dd>
          </div>
          <div className="rounded-xl bg-surface p-2">
            <dt className="text-muted">{t().tx.expenses}</dt>
            <dd className="font-semibold tabular-nums">{formatCents(sum.expense)}</dd>
          </div>
          <div className="rounded-xl bg-surface p-2">
            <dt className="text-muted">{fmt(t().list.count, { n: filtered.length })}</dt>
            <dd className="font-semibold tabular-nums">{formatCents(sum.net, { signed: true })}</dd>
          </div>
        </dl>
      )}

      {transactions.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-surface p-6 text-center text-muted">{t().list.empty}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-muted">{t().list.noResults}</p>
      ) : (
        <div className="mt-4 space-y-5">
          {visibleGroups.map((g) => (
            <section key={g.date} aria-labelledby={`day-${g.date}`}>
              <div className="flex items-baseline justify-between px-1 pb-1.5">
                <h2
                  id={`day-${g.date}`}
                  className="text-sm font-semibold text-muted first-letter:uppercase"
                >
                  {dayLabel(g.date)}
                </h2>
                <span className="text-sm text-muted tabular-nums">
                  {formatCents(g.net, { signed: true })}
                </span>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface">
                {g.items.map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow
                      transaction={tx}
                      category={categories.get(tx.categoryId)}
                      isFuture={tx.date > today}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {visibleGroups.length < groups.length && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="pressable min-h-11 w-full rounded-2xl bg-surface font-medium text-accent-text"
            >
              {t().common.showMore}
            </button>
          )}
        </div>
      )}

      {sheetOpen && (
        <FiltersSheet
          value={filters}
          onChange={setFilters}
          onClose={closeSheet}
          categories={activeCategories}
          tags={tags}
        />
      )}
    </>
  )
}
