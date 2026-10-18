import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CategoryIcon } from '../../components/CategoryIcon'
import { categoryColors, iconOptions } from '../../components/category-icons'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SubpageHeader } from '../../components/SubpageHeader'
import { useToast } from '../../components/toast-context'
import { db } from '../../db/db'
import { fmt, t } from '../../i18n'
import type { CategoryKind } from '../../models'
import { usageLabel, useCategoryUsage } from './hooks'
import {
  addCategory,
  CategoryError,
  deleteCategory,
  setCategoryArchived,
  updateCategory,
} from './repo'

export function CategoryForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const usage = useCategoryUsage()

  const existing = useLiveQuery(
    async () => (id ? ((await db.categories.get(id)) ?? null) : null),
    [id],
  )
  const kind: CategoryKind =
    existing?.kind ?? (search.get('tipo') === 'entrata' ? 'income' : 'expense')
  const others = useLiveQuery(
    async () =>
      (await db.categories.where('kind').equals(kind).sortBy('order')).filter(
        (c) => c.id !== id && !c.archived,
      ),
    [kind, id],
  )

  const [loaded, setLoaded] = useState(!isEdit)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('more')
  const [color, setColor] = useState(categoryColors[11]!)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moveTo, setMoveTo] = useState('')

  useEffect(() => {
    if (!isEdit || loaded || !existing) return
    setName(existing.name)
    setIcon(existing.icon)
    setColor(existing.color)
    setLoaded(true)
  }, [isEdit, loaded, existing])

  const backTo = `/impostazioni/categorie${kind === 'income' ? '?tipo=entrata' : ''}`
  const used = id ? (usage?.get(id) ?? 0) : 0

  const describe = (e: unknown) =>
    e instanceof CategoryError ? t().cat.errors[e.code] : t().tx.saveError

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    setError(null)
    try {
      if (id) await updateCategory(id, { name, icon, color })
      else await addCategory({ name, kind, icon, color })
      toast({ message: t().cat.savedToast })
      navigate(backTo, { replace: true })
    } catch (err) {
      setError(describe(err))
    }
  }

  const toggleArchive = async () => {
    if (!existing) return
    await setCategoryArchived(existing.id, !existing.archived)
    toast({ message: existing.archived ? t().cat.restoredToast : t().cat.archivedToast })
    navigate(backTo, { replace: true })
  }

  const remove = async () => {
    if (!id) return
    try {
      await deleteCategory(id, used > 0 ? moveTo : undefined)
      setConfirmDelete(false)
      toast({ message: t().cat.deletedToast })
      navigate(backTo, { replace: true })
    } catch (err) {
      setConfirmDelete(false)
      setError(describe(err))
    }
  }

  if (isEdit && existing === null) {
    return <p className="pt-8 text-center text-muted">{t().cat.errors['not-found']}</p>
  }
  if (!loaded) return null

  return (
    <form onSubmit={submit} noValidate className="pb-8">
      <SubpageHeader
        title={isEdit ? t().cat.editTitle : t().cat.newTitle}
        backTo={backTo}
        backLabel={t().cat.title}
        action={
          <button
            type="submit"
            className="pressable min-h-11 rounded-xl px-3 font-semibold text-accent-text"
          >
            {t().common.save}
          </button>
        }
      />

      <div className="mt-4 space-y-5">
        <section className="flex items-center gap-4 rounded-2xl bg-surface p-4">
          <CategoryIcon icon={icon} color={color} size="lg" />
          <div className="min-w-0 flex-1">
            <label htmlFor="cat-name" className="text-sm font-medium text-muted">
              {t().cat.name} · {kind === 'income' ? t().tx.income : t().tx.expense}
            </label>
            <input
              id="cat-name"
              type="text"
              value={name}
              maxLength={40}
              autoFocus={!isEdit}
              placeholder={t().cat.namePlaceholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'cat-error' : undefined}
              onChange={(e) => setName(e.target.value)}
              className="mt-0.5 w-full bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-muted"
            />
          </div>
        </section>
        {error && (
          <p id="cat-error" role="alert" className="-mt-3 px-1 text-sm text-expense">
            {error}
          </p>
        )}
        {isEdit && <p className="-mt-3 px-1 text-xs text-muted">{t().cat.kindLocked}</p>}

        <fieldset>
          <legend className="mb-2 px-1 text-sm font-medium text-muted">{t().cat.color}</legend>
          <div className="grid grid-cols-10 gap-2 rounded-2xl bg-surface p-3">
            {categoryColors.map((c, i) => (
              <label key={c} className="relative flex aspect-square items-center justify-center">
                <input
                  type="radio"
                  name="color"
                  value={c}
                  checked={color === c}
                  onChange={() => setColor(c)}
                  className="peer sr-only"
                  aria-label={`${t().cat.color} ${i + 1}`}
                />
                <span
                  className="size-full rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-text peer-focus-visible:outline-3 peer-focus-visible:outline-accent-text"
                  style={{ backgroundColor: c }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 px-1 text-sm font-medium text-muted">{t().cat.icon}</legend>
          <div className="grid grid-cols-6 gap-2 rounded-2xl bg-surface p-3 sm:grid-cols-10">
            {iconOptions.map(({ key, label, Icon }) => (
              <label
                key={key}
                title={label}
                className="relative flex aspect-square cursor-pointer items-center justify-center"
              >
                <input
                  type="radio"
                  name="icon"
                  value={key}
                  checked={icon === key}
                  onChange={() => setIcon(key)}
                  className="peer sr-only"
                  aria-label={label}
                />
                <span
                  className="flex size-full items-center justify-center rounded-xl text-muted peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-accent-text"
                  style={icon === key ? { backgroundColor: color } : undefined}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="pressable min-h-12 w-full rounded-2xl bg-accent text-lg font-semibold text-white"
        >
          {t().common.save}
        </button>

        {existing && (
          <div className="space-y-2">
            <p className="px-1 text-sm text-muted">{usageLabel(used)}</p>
            <button
              type="button"
              onClick={() => void toggleArchive()}
              className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface font-semibold"
            >
              {existing.archived ? (
                <ArchiveRestore aria-hidden="true" className="size-5" />
              ) : (
                <Archive aria-hidden="true" className="size-5" />
              )}
              {existing.archived ? t().cat.restore : t().cat.archive}
            </button>
            <button
              type="button"
              onClick={() => {
                setMoveTo('')
                setConfirmDelete(true)
              }}
              className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface font-semibold text-expense"
            >
              <Trash2 aria-hidden="true" className="size-5" />
              {t().common.delete}
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={t().cat.deleteTitle}
          confirmLabel={t().common.delete}
          destructive
          confirmDisabled={used > 0 && !moveTo}
          onConfirm={() => void remove()}
          onCancel={() => setConfirmDelete(false)}
        >
          {used === 0 ? (
            <p>{t().cat.deleteFree}</p>
          ) : (
            <>
              <p>{fmt(t().cat.deleteInUse, { n: used })}</p>
              <label className="mt-3 block text-sm font-medium text-text">
                {t().cat.moveTo}
                <select
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
                  className="mt-1 block min-h-11 w-full rounded-xl bg-surface-2 px-3 text-text"
                >
                  <option value="">{t().cat.chooseTarget}</option>
                  {others?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </ConfirmDialog>
      )}
    </form>
  )
}
