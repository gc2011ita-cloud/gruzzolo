import { useLiveQuery } from 'dexie-react-hooks'
import { Hash, Plus, Wallet } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { db } from '../../db/db'
import { defaultSettings, useSettings } from '../../db/settings'
import { t } from '../../i18n'
import { balanceSummary, totals } from '../../lib/balances'
import { dayLabel, periodLabel, shiftPeriod, todayISO } from '../../lib/dates'
import { formatCents } from '../../lib/money'
import {
  balanceSeries,
  buckets,
  categoryBreakdown,
  topTags,
  trend,
  upcoming,
} from '../../lib/stats'
import type { TransactionType } from '../../models'
import { storeFilters } from '../transactions/filter-state'
import { useCategoryMap } from '../transactions/hooks'
import { TransactionRow } from '../transactions/TransactionRow'
import { ChartCard } from '../../components/ChartCard'
import { PeriodPicker } from './PeriodPicker'
import { usePeriod } from './period-state'
import { BalanceCard, PeriodTotals } from './SummaryTiles'

// I grafici (Recharts) si caricano a parte: la Panoramica appare subito.
const CategoryDonut = lazy(() => import('./charts').then((m) => ({ default: m.CategoryDonut })))
const TrendChart = lazy(() => import('./charts').then((m) => ({ default: m.TrendChart })))
const BalanceChart = lazy(() => import('./charts').then((m) => ({ default: m.BalanceChart })))

function ChartPlaceholder({ height }: { height: string }) {
  return <div className={`rounded-2xl bg-surface ${height}`} aria-hidden="true" />
}

export function OverviewPage() {
  const navigate = useNavigate()
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const settings = useSettings() ?? defaultSettings
  const categories = useCategoryMap()
  const [period, setPeriod] = usePeriod()
  const [sliceType, setSliceType] = useState<TransactionType>('expense')
  const today = todayISO()

  const data = useMemo(() => {
    const list = transactions ?? []
    const { kind, range } = period
    const previousRange = shiftPeriod(range, kind, -1)
    const bs = buckets(range)
    return {
      balance: balanceSummary(list, today, settings.initialBalanceCents),
      current: totals(list, range),
      previous: totals(list, previousRange),
      previousLabel: periodLabel(kind, previousRange),
      trend: trend(list, bs),
      balancePoints: balanceSeries(list, bs, settings.initialBalanceCents, today),
      tags: topTags(list, range),
      upcoming: upcoming(list, today).slice(0, 5),
    }
  }, [transactions, period, settings.initialBalanceCents, today])

  const breakdown = useMemo(
    () => categoryBreakdown(transactions ?? [], period.range, sliceType, categories),
    [transactions, period.range, sliceType, categories],
  )

  if (!transactions) return null

  const openFiltered = (filters: { categoryIds?: string[]; tags?: string[] }) => {
    storeFilters({ period: 'custom', range: period.range, ...filters })
    navigate('/movimenti')
  }

  if (transactions.length === 0) {
    return (
      <>
        <PageHeader title={t().nav.overview} />
        <section className="rounded-2xl bg-surface p-5">
          <h2 className="text-xl font-semibold">{t().overview.welcomeTitle}</h2>
          <p className="mt-2 text-muted">{t().overview.welcomeBody}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              to="/movimenti/nuovo"
              className="pressable flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-white"
            >
              <Plus aria-hidden="true" className="size-5" />
              {t().overview.addFirst}
            </Link>
            <Link
              to="/impostazioni/saldo-iniziale"
              className="pressable flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-2 font-semibold"
            >
              <Wallet aria-hidden="true" className="size-5" />
              {t().overview.setInitial}
            </Link>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <PageHeader title={t().nav.overview} />
      <div className="space-y-4">
        <BalanceCard balance={data.balance} />

        <PeriodPicker value={period} onChange={setPeriod} />

        <PeriodTotals
          current={data.current}
          previous={data.previous}
          previousLabel={data.previousLabel}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Suspense fallback={<ChartPlaceholder height="h-96" />}>
            <CategoryDonut
              type={sliceType}
              onTypeChange={setSliceType}
              slices={breakdown.slices}
              folded={breakdown.folded}
              total={breakdown.total}
              onSelect={(id) => openFiltered({ categoryIds: [id] })}
            />
          </Suspense>
          <div className="space-y-4">
            <Suspense fallback={<ChartPlaceholder height="h-72" />}>
              <TrendChart points={data.trend} />
            </Suspense>
            <Suspense fallback={<ChartPlaceholder height="h-64" />}>
              <BalanceChart points={data.balancePoints} />
            </Suspense>
          </div>
        </div>

        {data.upcoming.length > 0 && (
          <ChartCard title={t().overview.upcoming} subtitle={t().overview.upcomingHint}>
            <ul className="-mx-4 -mb-2 divide-y divide-border">
              {data.upcoming.map((tx) => (
                <li key={tx.id}>
                  <TransactionRow
                    transaction={tx}
                    category={categories.get(tx.categoryId)}
                    isFuture={false}
                    caption={dayLabel(tx.date)}
                  />
                </li>
              ))}
            </ul>
          </ChartCard>
        )}

        {data.tags.length > 0 && (
          <ChartCard title={t().overview.topTags}>
            <ul className="-mx-1 divide-y divide-border">
              {data.tags.map((tag) => (
                <li key={tag.tag}>
                  <button
                    type="button"
                    onClick={() => openFiltered({ tags: [tag.tag] })}
                    className="pressable flex min-h-12 w-full items-center gap-3 px-1 text-left"
                  >
                    <Hash aria-hidden="true" className="size-4 text-muted" />
                    <span className="flex-1 truncate font-medium">{tag.tag}</span>
                    <span className="font-semibold tabular-nums">{formatCents(tag.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </ChartCard>
        )}
      </div>
    </>
  )
}
