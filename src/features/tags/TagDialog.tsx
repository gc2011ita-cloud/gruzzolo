import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useToast } from '../../components/toast-context'
import { fmt, t } from '../../i18n'
import { normalizeTag } from '../../lib/tags'
import { deleteTag, renameTag, type TagStat } from './repo'

interface Props {
  stat: TagStat
  existing: string[]
  onClose: () => void
}

export function TagDialog({ stat, existing, onClose }: Props) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(stat.tag)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    inputRef.current?.select()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const target = normalizeTag(name)
  const merges = target !== stat.tag && existing.includes(target)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!target || target === stat.tag) return onClose()
    const n = await renameTag(stat.tag, target)
    toast({ message: fmt(t().tags.renamed, { n }) })
    onClose()
  }

  const remove = useCallback(async () => {
    await deleteTag(stat.tag)
    toast({ message: t().tags.deleted })
    onClose()
  }, [stat.tag, toast, onClose])

  if (confirmDelete) {
    return (
      <ConfirmDialog
        title={fmt(t().tags.deleteTitle, { tag: stat.tag })}
        confirmLabel={t().common.delete}
        destructive
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      >
        <p>{fmt(t().tags.deleteBody, { n: stat.count })}</p>
      </ConfirmDialog>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-title"
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-3xl bg-surface p-5 shadow-2xl"
      >
        <h2 id="tag-title" className="text-lg font-semibold">
          {fmt(t().tags.renameTitle, { tag: stat.tag })}
        </h2>
        <label className="mt-3 block text-sm font-medium text-muted">
          {t().tags.newName}
          <span className="mt-1 flex min-h-11 items-center rounded-xl bg-surface-2 px-3 text-text">
            <span aria-hidden="true" className="text-muted">
              #
            </span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </span>
        </label>
        {merges && (
          <p role="status" className="mt-2 text-sm text-warning">
            {fmt(t().tags.mergeWarning, { tag: target })}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pressable min-h-11 rounded-xl bg-surface-2 font-semibold"
          >
            {t().common.cancel}
          </button>
          <button
            type="submit"
            disabled={!target}
            className="pressable min-h-11 rounded-xl bg-accent font-semibold text-white disabled:opacity-40"
          >
            {t().tags.rename}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="pressable mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold text-expense"
        >
          <Trash2 aria-hidden="true" className="size-5" />
          {t().common.delete}
        </button>
      </form>
    </div>
  )
}
