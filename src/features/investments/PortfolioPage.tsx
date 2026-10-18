import { ChevronRight, Plus } from 'lucide-react'
import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { fmt, t } from '../../i18n'
import { pct } from '../../lib/chart-format'
import { portfolio, portfolioSeries, type PortfolioRow } from '../../lib/investments'
import { formatCents } from '../../lib/money'
import { GainText } from './GainText'
import { useEntriesByInvestment, useInvestments } from './hooks'

const ValueChart = lazy(() => import('./ValueChart'))

function Row({ row }: { row: PortfolioRow }) {
  const { investment: inv, position: p } = row
  return (
    <li>
      <Link
        to={`/investimenti/${inv.id}`}
        className="pressable flex min-h-16 items-center gap-3 px-4 py-2.5 active:bg-surface-2"
      >
        <span
          aria-hidden="true"
          className="h-10 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: inv.color }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{inv.name}</span>
          <span className="block text-sm text-muted">
            {t().inv.kinds[inv.kind]}
            {!inv.archived && row.share > 0 && ` · ${fmt(t().inv.share, { p: pct(row.share) })}`}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-semibold tabular-nums">{formatCents(p.value)}</span>
          <GainText gain={p.gain} pct={p.gainPct} className="text-sm" />
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
      </Link>
    </li>
  )
}

export function PortfolioPage() {
  const investments = useInvestments()
  const entries = useEntriesByInvestment()

  const data = useMemo(() => {
    if (!investments || !entries) return undefined
    const active = investments.filter((i) => !i.archived)
    const archived = investments.filter((i) => i.archived)
    const activeEntries = new Map(active.map((i) => [i.id, entries.get(i.id) ?? []]))
    return {
      ...portfolio(active, entries),
      archived: portfolio(archived, entries).rows,
      series: portfolioSeries(activeEntries),
    }
  }, [investments, entries])

  if (!data) return null

  const addButton = (
    <Link
      to="/investimenti/nuovo"
      aria-label={t().inv.add}
      className="pressable flex size-11 items-center justify-center rounded-full bg-surface text-accent-text"
    >
      <Plus aria-hidden="true" className="size-6" />
    </Link>
  )

  if (data.rows.length === 0 && data.archived.length === 0) {
    return (
      <>
        <PageHeader title={t().inv.title} actions={addButton} />
        <section className="rounded-2xl bg-surface p-5">
          <p className="text-muted">{t().inv.intro}</p>
          <Link
            to="/investimenti/nuovo"
            className="pressable mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-white"
          >
            <Plus aria-hidden="true" className="size-5" />
            {t().inv.add}
          </Link>
        </section>
      </>
    )
  }

  const { total } = data
  return (
    <>
      <PageHeader title={t().inv.title} actions={addButton} />
      <div className="space-y-4">
        <section className="rounded-2xl bg-surface p-4" aria-label={t().inv.portfolio}>
          <p className="text-sm font-medium text-muted">{t().inv.value}</p>
          <p className="mt-0.5 text-4xl font-bold tracking-tight tabular-nums">
            {formatCents(total.value)}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">{t().inv.invested}</dt>
              <dd className="font-semibold tabular-nums">{formatCents(total.invested)}</dd>
            </div>
            <div>
              <dt className="text-muted">{total.gain < 0 ? t().inv.loss : t().inv.gain}</dt>
              <dd>
                <GainText gain={total.gain} pct={total.gainPct} />
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">{t().inv.gainHint}</p>
        </section>

        <Suspense fallback={<div className="h-72 rounded-2xl bg-surface" aria-hidden="true" />}>
          <ValueChart points={data.series} />
        </Suspense>

        {data.rows.length > 0 && (
          <section>
            <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">
              {t().inv.allocation}
            </h2>
            {total.value > 0 && (
              <div
                className="mb-2 flex h-3 gap-0.5 overflow-hidden rounded-full"
                role="img"
                aria-label={data.rows.map((r) => `${r.investment.name} ${pct(r.share)}`).join(', ')}
              >
                {data.rows
                  .filter((r) => r.share > 0)
                  .map((r) => (
                    <span
                      key={r.investment.id}
                      style={{ width: `${r.share * 100}%`, backgroundColor: r.investment.color }}
                    />
                  ))}
              </div>
            )}
            <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface">
              {data.rows.map((r) => (
                <Row key={r.investment.id} row={r} />
              ))}
            </ul>
          </section>
        )}

        {data.archived.length > 0 && (
          <section>
            <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">
              {t().inv.archived}
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface opacity-80">
              {data.archived.map((r) => (
                <Row key={r.investment.id} row={r} />
              ))}
            </ul>
            <p className="px-4 pt-2 text-sm text-muted">{t().inv.archivedHint}</p>
          </section>
        )}
      </div>
    </>
  )
}
