import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { CategoryIcon } from '../../components/CategoryIcon'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SubpageHeader } from '../../components/SubpageHeader'
import { useToast } from '../../components/toast-context'
import { db } from '../../db/db'
import { fmt, t } from '../../i18n'
import type { Category, CategoryKind } from '../../models'
import { usageLabel, useCategoryUsage } from './hooks'
import { moveCategory, setCategoryArchived } from './repo'

const kinds = [
  { value: 'expense', label: t().tx.expenses },
  { value: 'income', label: t().tx.incomes },
] as const

export function CategoriesPage() {
  const [search, setSearch] = useSearchParams()
  const kind: CategoryKind = search.get('tipo') === 'entrata' ? 'income' : 'expense'
  const toast = useToast()
  const usage = useCategoryUsage()
  const all = useLiveQuery(() => db.categories.where('kind').equals(kind).sortBy('order'), [kind])

  const active = all?.filter((c) => !c.archived) ?? []
  const archived = all?.filter((c) => c.archived) ?? []

  const row = (c: Category, index: number, list: Category[]) => (
    <li key={c.id} className="flex items-center">
      <Link
        to={`/impostazioni/categorie/${c.id}`}
        className="pressable flex min-h-15 flex-1 items-center gap-3 py-2 pl-4 active:bg-surface-2"
      >
        <CategoryIcon icon={c.icon} color={c.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{c.name}</span>
          <span className="block text-sm text-muted">{usageLabel(usage?.get(c.id) ?? 0)}</span>
        </span>
      </Link>
      {c.archived ? (
        <button
          type="button"
          onClick={() =>
            void setCategoryArchived(c.id, false).then(() =>
              toast({ message: t().cat.restoredToast }),
            )
          }
          className="pressable mr-2 min-h-11 rounded-xl px-3 font-medium text-accent-text"
        >
          {t().cat.restore}
        </button>
      ) : (
        <div className="flex pr-1">
          <button
            type="button"
            disabled={index === 0}
            aria-label={fmt(t().cat.moveUp, { name: c.name })}
            onClick={() => void moveCategory(c.id, -1)}
            className="pressable flex size-11 items-center justify-center rounded-xl text-muted disabled:opacity-25"
          >
            <ChevronUp aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            disabled={index === list.length - 1}
            aria-label={fmt(t().cat.moveDown, { name: c.name })}
            onClick={() => void moveCategory(c.id, 1)}
            className="pressable flex size-11 items-center justify-center rounded-xl text-muted disabled:opacity-25"
          >
            <ChevronDown aria-hidden="true" className="size-5" />
          </button>
        </div>
      )}
    </li>
  )

  return (
    <>
      <SubpageHeader
        title={t().cat.title}
        backTo="/impostazioni"
        backLabel={t().settings.title}
        action={
          <Link
            to={`/impostazioni/categorie/nuova?tipo=${kind === 'income' ? 'entrata' : 'uscita'}`}
            aria-label={t().cat.add}
            className="pressable flex size-11 items-center justify-center rounded-xl text-accent-text"
          >
            <Plus aria-hidden="true" className="size-6" />
          </Link>
        }
      />

      <div className="mt-3">
        <SegmentedControl
          label={t().list.type}
          value={kind}
          options={kinds}
          onChange={(k) => setSearch(k === 'income' ? { tipo: 'entrata' } : {}, { replace: true })}
        />
      </div>

      {all && (
        <>
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-surface">
            {active.map(row)}
          </ul>

          <Link
            to={`/impostazioni/categorie/nuova?tipo=${kind === 'income' ? 'entrata' : 'uscita'}`}
            className="pressable mt-3 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface font-semibold text-accent-text"
          >
            <Plus aria-hidden="true" className="size-5" />
            {t().cat.add}
          </Link>

          {archived.length > 0 && (
            <section className="mt-6">
              <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">
                {t().cat.archived}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface opacity-80">
                {archived.map(row)}
              </ul>
              <p className="px-4 pt-2 text-sm text-muted">{t().cat.archivedHint}</p>
            </section>
          )}
        </>
      )}
    </>
  )
}
