import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard, DataTable } from '../../components/ChartCard'
import { TooltipBox } from '../../components/chart-kit'
import { axisEuro, axisTick } from '../../lib/chart-format'
import { t } from '../../i18n'
import { formatDate } from '../../lib/dates'
import type { ValuePoint } from '../../lib/investments'
import { formatCents } from '../../lib/money'
import { niceTicks } from '../../lib/stats'

/** Valore e capitale versato nel tempo: stessa unità, un solo asse. */
export default function ValueChart({ points }: { points: ValuePoint[] }) {
  const data = points.map((p) => ({
    ...p,
    label: formatDate(p.date, 'd MMM yy'),
    v: p.value / 100,
    i: p.invested / 100,
  }))
  const all = data.flatMap((d) => [d.v, d.i])
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...all))

  return (
    <ChartCard
      title={t().inv.chart}
      table={
        points.length > 0 && (
          <DataTable
            head={[t().tx.date, t().inv.chartValue, t().inv.chartInvested]}
            rows={[...points]
              .reverse()
              .map((p) => [formatDate(p.date), formatCents(p.value), formatCents(p.invested)])}
          />
        )
      }
    >
      <div className="flex gap-4 text-sm" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-chart-income" />
          {t().inv.chartValue}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-chart-expense" />
          {t().inv.chartInvested}
        </span>
      </div>
      {points.length < 2 ? (
        <p className="py-8 text-center text-sm text-muted">{t().inv.chartNeedsData}</p>
      ) : (
        <div className="mt-2 h-52" role="img" aria-label={t().inv.chart}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={[ticks[0]!, ticks.at(-1)!]}
                ticks={ticks}
                tickFormatter={axisEuro}
              />
              <Tooltip
                cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const p = active ? (payload?.[0]?.payload as ValuePoint | undefined) : undefined
                  if (!p) return null
                  return (
                    <TooltipBox
                      title={formatDate(p.date, 'd MMMM yyyy')}
                      rows={[
                        {
                          label: t().inv.chartValue,
                          value: formatCents(p.value),
                          color: 'var(--chart-income)',
                        },
                        {
                          label: t().inv.chartInvested,
                          value: formatCents(p.invested),
                          color: 'var(--chart-expense)',
                        },
                      ]}
                    />
                  )
                }}
              />
              <Line
                type="linear"
                dataKey="i"
                stroke="var(--chart-expense)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }}
                animationDuration={400}
              />
              <Line
                type="linear"
                dataKey="v"
                stroke="var(--chart-income)"
                strokeWidth={2}
                dot={
                  points.length <= 12
                    ? { r: 4, strokeWidth: 0, fill: 'var(--chart-income)' }
                    : false
                }
                activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
