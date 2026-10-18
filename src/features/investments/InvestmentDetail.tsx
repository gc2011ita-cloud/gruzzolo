import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDownToLine, ArrowUpFromLine, Pencil, RefreshCw } from 'lucide-react'
import { lazy, Suspense, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SubpageHeader } from '../../components/SubpageHeader'
import { db } from '../../db/db'
import { fmt, t } from '../../i18n'
import { formatDate } from '../../lib/dates'
import { position, sortEntries, valueSeries } from '../../lib/investments'
import { formatCents } from '../../lib/money'
import type { InvestmentEntryType } from '../../models'
import { GainText } from './GainText'

const ValueChart = lazy(() => import('./ValueChart'))

const entryIcons: Record<InvestmentEntryType, typeof RefreshCw> = {
  valuation: RefreshCw,
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
}

export function InvestmentDetail() {
  const { id = '' } = useParams()
  const investment = useLiveQuery(async () => (await db.investments.get(id)) ?? null, [id])
  const entries = useLiveQuery(
    () => db.investmentEntries.where('investmentId').equals(id).toArray(),
    [id],
  )

  const data = useMemo(() => {
    if (!entries) return undefined
    return {
      position: position(entries),
      series: valueSeries(entries),
      history: sortEntries(entries).reverse(),
    }
  }, [entries])

  if (investment === null) return <p className="pt-8 text-center text-muted">{t().inv.notFound}</p>
  if (!investment || !data) return null
  const p = data.position

  return (
    <>
      <SubpageHeader
        title={investment.name}
        backTo="/investimenti"
        backLabel={t().inv.title}
        action={
          <Link
            to={`/investimenti/${id}/modifica`}
            aria-label={t().inv.editTitle}
            className="pressable flex size-11 items-center justify-center rounded-xl text-accent-text"
          >
            <Pencil aria-hidden="true" className="size-5" />
          </Link>
        }
      />

      <div className="mt-4 space-y-4">
        <section className="rounded-2xl bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-muted">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: investment.color }}
            />
            {t().inv.kinds[investment.kind]} · {t().inv.value}
          </p>
          <p className="mt-0.5 text-4xl font-bold tracking-tight tabular-nums">
            {formatCents(p.value)}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">{t().inv.invested}</dt>
              <dd className="font-semibold tabular-nums">{formatCents(p.invested)}</dd>
            </div>
            <div>
              <dt className="text-muted">{p.gain < 0 ? t().inv.loss : t().inv.gain}</dt>
              <dd>
                <GainText gain={p.gain} pct={p.gainPct} />
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">
            {p.valuedAt
              ? fmt(t().inv.valuedAt, { date: formatDate(p.valuedAt, 'd MMMM yyyy') })
              : t().inv.notValued}
          </p>
          {investment.note && <p className="mt-2 text-sm">{investment.note}</p>}
        </section>

        <div className="grid grid-cols-3 gap-2">
          {(['valuation', 'deposit', 'withdrawal'] as const).map((type) => {
            const Icon = entryIcons[type]
            return (
              <Link
                key={type}
                to={`/investimenti/${id}/operazione?tipo=${type}`}
                className={`pressable flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl p-2 text-center text-sm font-semibold ${
                  type === 'valuation' ? 'bg-accent text-white' : 'bg-surface'
                }`}
              >
                <Icon aria-hidden="true" className="size-5" />
                {t().inv.actions[type]}
              </Link>
            )
          })}
        </div>

        <Suspense fallback={<div className="h-72 rounded-2xl bg-surface" aria-hidden="true" />}>
          <ValueChart points={data.series} />
        </Suspense>

        <section>
          <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">
            {t().inv.history}
          </h2>
          {data.history.length === 0 ? (
            <p className="rounded-2xl bg-surface p-4 text-muted">{t().inv.noEntries}</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface">
              {data.history.map((e) => {
                const Icon = entryIcons[e.type]
                const amount =
                  e.type === 'valuation'
                    ? `= ${formatCents(e.amountCents)}`
                    : formatCents(e.type === 'deposit' ? e.amountCents : -e.amountCents, {
                        signed: true,
                      })
                return (
                  <li key={e.id}>
                    <Link
                      to={`/investimenti/${id}/operazione/${e.id}`}
                      className="pressable flex min-h-15 items-center gap-3 px-4 py-2 active:bg-surface-2"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t().inv.entryTypes[e.type]}</span>
                        <span className="block truncate text-sm text-muted">
                          {[formatDate(e.date), e.note].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">{amount}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
