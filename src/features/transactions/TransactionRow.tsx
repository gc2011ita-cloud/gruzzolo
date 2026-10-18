import { Paperclip } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CategoryIcon } from '../../components/CategoryIcon'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'
import type { Category, Transaction } from '../../models'

interface Props {
  transaction: Transaction
  category?: Category
  isFuture: boolean
}

export function TransactionRow({ transaction: tx, category, isFuture }: Props) {
  const amount = tx.type === 'income' ? tx.amountCents : -tx.amountCents
  const detail = [tx.note, tx.tags.map((tag) => `#${tag}`).join(' ')].filter(Boolean).join(' · ')

  return (
    <Link
      to={`/movimenti/${tx.id}`}
      className="pressable flex min-h-16 items-center gap-3 px-4 py-2.5 active:bg-surface-2"
    >
      <CategoryIcon icon={category?.icon ?? 'more'} color={category?.color ?? '#6b7280'} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{category?.name ?? '—'}</span>
          {tx.receiptId && (
            <Paperclip aria-label={t().tx.receipt} className="size-3.5 shrink-0 text-muted" />
          )}
          {isFuture && (
            <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[0.68rem] font-semibold text-warning">
              {t().tx.future}
            </span>
          )}
        </p>
        {detail && <p className="truncate text-sm text-muted">{detail}</p>}
      </div>
      <span
        className={`shrink-0 font-semibold tabular-nums ${amount > 0 ? 'text-income' : 'text-text'}`}
      >
        {formatCents(amount, { signed: true })}
      </span>
    </Link>
  )
}
