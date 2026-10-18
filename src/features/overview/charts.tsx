import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CategoryIcon } from '../../components/CategoryIcon'
import { SegmentedControl } from '../../components/SegmentedControl'
import { fmt, t } from '../../i18n'
import { formatCents } from '../../lib/money'
import {
  niceTicks,
  OTHER_SLICE_ID,
  type BalancePoint,
  type CategorySlice,
  type TrendPoint,
} from '../../lib/stats'
import type { TransactionType } from '../../models'
import { ChartCard, DataTable } from './ChartCard'

const whole = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' })
/** Etichette dell'asse in euro: "1.500", "120k", "1,2 Mln" (it-IT non ha un formato compatto per le migliaia). */
function axisEuro(v: number): string {
  const a = Math.abs(v)
  if (a >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} Mln`
  if (a >= 100_000) return `${Math.round(v / 1000)}k`
  return whole.format(v)
}
const axisTick = { fill: 'var(--muted)', fontSize: 11 }
const pct = (share: number) =>
  share.toLocaleString('it-IT', { style: 'percent', maximumFractionDigits: share < 0.1 ? 1 : 0 })

function TooltipBox({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: string; color?: string; dashed?: boolean }[]
}) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2 text-sm shadow-lg ring-1 ring-border">
      <p className="mb-1 font-semibold first-letter:uppercase">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          {r.color && (
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: r.color }}
            />
          )}
          <span className="text-muted">{r.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  )
}

/* ---------- Spesa per categoria ---------- */

interface CategoryProps {
  type: TransactionType
  onTypeChange: (t: TransactionType) => void
  slices: CategorySlice[]
  folded: CategorySlice[]
  total: number
  onSelect: (categoryId: string) => void
}

export function CategoryDonut({
  type,
  onTypeChange,
  slices,
  folded,
  total,
  onSelect,
}: CategoryProps) {
  const [active, setActive] = useState<string | null>(null)
  const label = (s: CategorySlice) =>
    s.id === OTHER_SLICE_ID ? fmt(t().overview.otherDetail, { n: folded.length }) : s.name

  return (
    <ChartCard
      title={t().overview.byCategory}
      table={
        total > 0 && (
          <DataTable
            head={[t().tx.category, t().tx.amount, '%']}
            rows={[...slices.filter((s) => s.id !== OTHER_SLICE_ID), ...folded].map((s) => [
              s.name,
              formatCents(s.amount),
              pct(s.share),
            ])}
          />
        )
      }
    >
      <SegmentedControl
        label={t().list.type}
        value={type}
        options={[
          { value: 'expense', label: t().overview.expense },
          { value: 'income', label: t().overview.income },
        ]}
        onChange={onTypeChange}
      />
      {total === 0 ? (
        <p className="py-10 text-center text-muted">{t().overview.noData}</p>
      ) : (
        <>
          <div className="relative mx-auto mt-4 aspect-square w-full max-w-60">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  animationDuration={400}
                  onMouseEnter={(_, i) => setActive(slices[i]?.id ?? null)}
                  onMouseLeave={() => setActive(null)}
                >
                  {slices.map((s) => (
                    <Cell
                      key={s.id}
                      fill={s.color}
                      opacity={active && active !== s.id ? 0.35 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  content={({ active: on, payload }) => {
                    const s = on ? (payload?.[0]?.payload as CategorySlice | undefined) : undefined
                    if (!s) return null
                    return (
                      <TooltipBox
                        title={label(s)}
                        rows={[
                          { label: pct(s.share), value: formatCents(s.amount), color: s.color },
                        ]}
                      />
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm text-muted">{t().overview.total}</span>
              <span className="text-xl font-bold tabular-nums">{formatCents(total)}</span>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-border">
            {slices.map((s) =>
              s.id === OTHER_SLICE_ID ? (
                [
                  <li
                    key="folded-heading"
                    className="flex items-center gap-2 pt-3 pb-1 text-sm text-muted"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {fmt(t().overview.foldedHeading, { n: folded.length })}
                  </li>,
                  ...folded.map((f) => (
                    <SliceRow key={f.id} slice={f} markerColor={s.color} onSelect={onSelect} />
                  )),
                ]
              ) : (
                <SliceRow key={s.id} slice={s} onSelect={onSelect} />
              ),
            )}
          </ul>
        </>
      )}
    </ChartCard>
  )
}

function SliceRow({
  slice,
  markerColor,
  onSelect,
}: {
  slice: CategorySlice
  markerColor?: string
  onSelect: (id: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(slice.id)}
        className="pressable flex min-h-14 w-full items-center gap-3 py-2 text-left"
      >
        <span className="relative">
          <CategoryIcon icon={slice.icon} color={slice.color} size="sm" />
          {markerColor && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-surface"
              style={{ backgroundColor: markerColor }}
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{slice.name}</span>
          <span className="block text-sm text-muted">
            {fmt(t().overview.share, { p: pct(slice.share) })}
          </span>
        </span>
        <span className="font-semibold tabular-nums">{formatCents(slice.amount)}</span>
        <ChevronRight aria-hidden="true" className="size-4 text-muted" />
      </button>
    </li>
  )
}

/* ---------- Entrate e uscite nel tempo ---------- */

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const data = points.map((p) => ({ ...p, inc: p.income / 100, exp: p.expense / 100 }))
  const empty = points.every((p) => p.income === 0 && p.expense === 0)
  const trendTicks = niceTicks(0, Math.max(...data.map((d) => Math.max(d.inc, d.exp))))

  return (
    <ChartCard
      title={t().overview.trend}
      table={
        !empty && (
          <DataTable
            head={[t().overview.period, t().overview.income, t().overview.expense]}
            rows={points.map((p) => [p.longLabel, formatCents(p.income), formatCents(p.expense)])}
          />
        )
      }
    >
      <div className="flex gap-4 text-sm" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-chart-income" />
          {t().overview.income}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-chart-expense" />
          {t().overview.expense}
        </span>
      </div>
      {empty ? (
        <p className="py-10 text-center text-muted">{t().overview.noData}</p>
      ) : (
        <div className="mt-2 h-56" role="img" aria-label={t().overview.trend}>
          <ResponsiveContainer>
            <BarChart
              data={data}
              barGap={2}
              barCategoryGap="22%"
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={44}
                domain={[0, trendTicks.at(-1)!]}
                ticks={trendTicks}
                tickFormatter={axisEuro}
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }}
                content={({ active, payload }) => {
                  const p = active ? (payload?.[0]?.payload as TrendPoint | undefined) : undefined
                  if (!p) return null
                  return (
                    <TooltipBox
                      title={p.longLabel}
                      rows={[
                        {
                          label: t().overview.income,
                          value: formatCents(p.income),
                          color: 'var(--chart-income)',
                        },
                        {
                          label: t().overview.expense,
                          value: formatCents(p.expense),
                          color: 'var(--chart-expense)',
                        },
                      ]}
                    />
                  )
                }}
              />
              <Bar
                dataKey="inc"
                fill="var(--chart-income)"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                animationDuration={400}
              />
              <Bar
                dataKey="exp"
                fill="var(--chart-expense)"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
                animationDuration={400}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

/* ---------- Saldo nel tempo ---------- */

export function BalanceChart({ points }: { points: BalancePoint[] }) {
  // Due tratti della stessa serie: pieno fino a oggi, tratteggiato per il previsto.
  const lastActual = points.findLastIndex((p) => !p.projected)
  const hasProjected = points.some((p) => p.projected)
  const startProjected = Math.max(lastActual, 0)
  const data = points.map((p, i) => ({
    ...p,
    actual: i <= lastActual ? p.balance / 100 : null,
    // Il tratto previsto parte dall'ultimo punto reale, così la linea resta continua.
    projectedValue: hasProjected && i >= startProjected ? p.balance / 100 : null,
  }))
  const values = points.map((p) => p.balance / 100)
  const min = Math.min(...values)
  const ticks = niceTicks(min, Math.max(...values))

  return (
    <ChartCard
      title={t().overview.balanceTrend}
      subtitle={hasProjected ? t().overview.projectedLegend : undefined}
      table={
        <DataTable
          head={[t().overview.period, t().overview.balanceNow]}
          rows={points.map((p) => [
            p.projected ? `${p.longLabel} (${t().overview.projectedPart})` : p.longLabel,
            formatCents(p.balance),
          ])}
        />
      }
    >
      <div className="h-48" role="img" aria-label={t().overview.balanceTrend}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={[ticks[0]!, ticks.at(-1)!]}
              ticks={ticks}
              tickFormatter={axisEuro}
            />
            {min < 0 && <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="2 2" />}
            <Tooltip
              cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = active ? (payload?.[0]?.payload as BalancePoint | undefined) : undefined
                if (!p) return null
                return (
                  <TooltipBox
                    title={p.longLabel}
                    rows={[
                      {
                        label: p.projected
                          ? t().overview.balanceProjected
                          : t().overview.balanceNow,
                        value: formatCents(p.balance),
                        color: 'var(--accent-text)',
                      },
                    ]}
                  />
                )
              }}
            />
            <Line
              dataKey="actual"
              stroke="var(--accent-text)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
              connectNulls={false}
              animationDuration={400}
            />
            <Line
              dataKey="projectedValue"
              stroke="var(--accent-text)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
              connectNulls={false}
              animationDuration={400}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
