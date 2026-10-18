import { useLiveQuery } from 'dexie-react-hooks'
import { Ellipsis, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SubpageHeader } from '../../components/SubpageHeader'
import { db } from '../../db/db'
import { fmt, t } from '../../i18n'
import { foldText } from '../../lib/filters'
import { formatCents } from '../../lib/money'
import { usageLabel } from '../categories/hooks'
import { storeFilters } from '../transactions/filter-state'
import { tagStats, type TagStat } from './repo'
import { TagDialog } from './TagDialog'

export function TagsPage() {
  const navigate = useNavigate()
  const transactions = useLiveQuery(
    () => db.transactions.filter((tx) => tx.tags.length > 0).toArray(),
    [],
  )
  const stats = useMemo(() => tagStats(transactions ?? []), [transactions])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<TagStat | null>(null)

  const q = foldText(query.trim())
  const visible = q ? stats.filter((s) => foldText(s.tag).includes(q)) : stats

  const showTransactions = (tag: string) => {
    storeFilters({ period: 'all', tags: [tag] })
    navigate('/movimenti')
  }

  return (
    <>
      <SubpageHeader title={t().tags.title} backTo="/impostazioni" backLabel={t().settings.title} />
      <p className="mt-3 px-1 text-sm text-muted">{t().tags.intro}</p>

      {transactions && stats.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-surface p-6 text-center text-muted">{t().tags.empty}</p>
      ) : (
        <>
          {stats.length > 8 && (
            <label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-surface-2 px-3">
              <Search aria-hidden="true" className="size-5 text-muted" />
              <span className="sr-only">{t().tags.search}</span>
              <input
                type="search"
                value={query}
                placeholder={t().tags.search}
                onChange={(e) => setQuery(e.target.value)}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
              />
            </label>
          )}
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-surface">
            {visible.map((s) => (
              <li key={s.tag} className="flex items-center">
                <button
                  type="button"
                  onClick={() => showTransactions(s.tag)}
                  aria-label={`#${s.tag}, ${t().tags.showTransactions}`}
                  className="pressable flex min-h-15 min-w-0 flex-1 flex-col items-start justify-center py-2 pl-4 text-left active:bg-surface-2"
                >
                  <span className="truncate font-medium">#{s.tag}</span>
                  <span className="text-sm text-muted">
                    {[
                      usageLabel(s.count),
                      s.expense ? fmt(t().tags.spent, { amount: formatCents(s.expense) }) : '',
                      s.income ? fmt(t().tags.earned, { amount: formatCents(s.income) }) : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={fmt(t().tags.actions, { tag: s.tag })}
                  aria-haspopup="dialog"
                  onClick={() => setEditing(s)}
                  className="pressable mr-1 flex size-11 items-center justify-center rounded-xl text-muted"
                >
                  <Ellipsis aria-hidden="true" className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <TagDialog
          stat={editing}
          existing={stats.map((s) => s.tag)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
