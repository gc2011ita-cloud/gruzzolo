import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { fmt, t } from '../../i18n'
import { percentChange, type BalanceSummary, type Totals } from '../../lib/balances'
import { formatCents } from '../../lib/money'

function Delta({
  now,
  before,
  previousLabel,
}: {
  now: number
  before: number
  previousLabel: string
}) {
  const pct = percentChange(now, before)
  if (pct === null) return <p className="text-xs text-muted">{t().overview.noPrevious}</p>
  const rounded = Math.round(pct)
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus
  const text =
    rounded === 0
      ? fmt(t().overview.same, { period: previousLabel })
      : `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('it-IT')}% ${fmt(
          t().overview.vsPrevious,
          {
            period: previousLabel,
          },
        )}`
  return (
    <p className="flex items-start gap-0.5 text-xs text-muted">
      <Icon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <span>{text}</span>
    </p>
  )
}

export function BalanceCard({ balance }: { balance: BalanceSummary }) {
  const hasFuture = balance.upcoming !== 0
  return (
    <section className="rounded-2xl bg-surface p-4" aria-label={t().overview.balanceNow}>
      <p className="text-sm font-medium text-muted">{t().overview.balanceNow}</p>
      <p className="mt-0.5 text-4xl font-bold tracking-tight tabular-nums">
        {formatCents(balance.current)}
      </p>
      {hasFuture && (
        <p className="mt-2 text-sm text-muted">
          {t().overview.balanceProjected}:{' '}
          <span className="font-semibold text-text tabular-nums">
            {formatCents(balance.projected)}
          </span>{' '}
          · {t().overview.projectedHint}
        </p>
      )}
    </section>
  )
}

interface TotalsProps {
  current: Totals
  previous: Totals
  previousLabel: string
}

export function PeriodTotals({ current, previous, previousLabel }: TotalsProps) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div className="rounded-2xl bg-surface p-3">
        <dt className="flex items-center gap-1.5 text-sm font-medium text-muted">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-chart-income" />
          {t().overview.income}
        </dt>
        <dd className="mt-0.5 text-xl font-semibold tabular-nums">{formatCents(current.income)}</dd>
        <dd className="mt-1">
          <Delta now={current.income} before={previous.income} previousLabel={previousLabel} />
        </dd>
      </div>
      <div className="rounded-2xl bg-surface p-3">
        <dt className="flex items-center gap-1.5 text-sm font-medium text-muted">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-chart-expense" />
          {t().overview.expense}
        </dt>
        <dd className="mt-0.5 text-xl font-semibold tabular-nums">
          {formatCents(current.expense)}
        </dd>
        <dd className="mt-1">
          <Delta now={current.expense} before={previous.expense} previousLabel={previousLabel} />
        </dd>
      </div>
      <div className="col-span-2 rounded-2xl bg-surface p-3 sm:col-span-1">
        <dt className="text-sm font-medium text-muted">{t().overview.net}</dt>
        <dd
          className={`mt-0.5 text-xl font-semibold tabular-nums ${current.net < 0 ? 'text-expense' : ''}`}
        >
          {formatCents(current.net, { signed: true })}
        </dd>
        <dd className="mt-1">
          <Delta now={current.net} before={previous.net} previousLabel={previousLabel} />
        </dd>
      </div>
    </dl>
  )
}
