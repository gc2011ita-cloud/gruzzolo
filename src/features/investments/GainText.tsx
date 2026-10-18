import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { formatCents } from '../../lib/money'

/** Guadagno o perdita: segno, freccia e colore (mai solo il colore). */
export function GainText({
  gain,
  pct,
  className = '',
}: {
  gain: number
  pct: number | null
  className?: string
}) {
  const Icon = gain < 0 ? ArrowDownRight : ArrowUpRight
  const tone = gain > 0 ? 'text-income' : gain < 0 ? 'text-expense' : 'text-muted'
  const pctText =
    pct === null
      ? ''
      : ` (${pct > 0 ? '+' : ''}${pct.toLocaleString('it-IT', {
          style: 'percent',
          maximumFractionDigits: 1,
        })})`
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${tone} ${className}`}
    >
      {gain !== 0 && <Icon aria-hidden="true" className="size-4 shrink-0" />}
      {formatCents(gain, { signed: true })}
      {pctText}
    </span>
  )
}
