import type { ReactNode } from 'react'
import { t } from '../i18n'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
  /** Tabella con gli stessi dati, per chi non può leggere il grafico. */
  table?: ReactNode
}

export function ChartCard({ title, subtitle, children, table }: Props) {
  return (
    <section className="rounded-2xl bg-surface p-4" aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      <div className="mt-3">{children}</div>
      {table && (
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-2.5 font-medium text-accent-text">
            {t().overview.showTable}
          </summary>
          <div className="overflow-x-auto">{table}</div>
        </details>
      )}
    </section>
  )
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left tabular-nums">
      <thead>
        <tr className="text-muted">
          {head.map((h, i) => (
            <th key={h} scope="col" className={`py-1.5 font-medium ${i ? 'text-right' : ''}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r) => (
          <tr key={String(r[0])}>
            {r.map((c, i) =>
              i === 0 ? (
                <th key={i} scope="row" className="py-1.5 font-normal first-letter:uppercase">
                  {c}
                </th>
              ) : (
                <td key={i} className="py-1.5 text-right">
                  {c}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
