import { X } from 'lucide-react'
import { useId, useState } from 'react'
import { fmt, t } from '../i18n'
import { foldText } from '../lib/filters'
import { normalizeTag } from '../lib/tags'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  /** Tag già usati, proposti come suggerimenti. */
  suggestions: string[]
}

export function TagInput({ value, onChange, suggestions }: Props) {
  const [draft, setDraft] = useState('')
  const inputId = useId()

  const add = (raw: string) => {
    const tag = normalizeTag(raw)
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setDraft('')
  }

  const q = foldText(draft.trim())
  const matches = suggestions
    .filter((s) => !value.includes(s) && (!q || foldText(s).includes(q)))
    .slice(0, 8)

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        {t().tx.tags}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-accent py-1 pr-1 pl-3 text-sm font-medium text-white"
          >
            #{tag}
            <button
              type="button"
              aria-label={fmt(t().tx.tagRemove, { tag })}
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="flex size-7 items-center justify-center rounded-full hover:bg-white/20"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={draft}
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="enter"
          placeholder={t().tx.tagPlaceholder}
          onChange={(e) => {
            const v = e.target.value
            // La virgola chiude il tag, comodo sulla tastiera dell'iPhone.
            if (v.endsWith(',')) add(v.slice(0, -1))
            else setDraft(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          className="min-h-10 min-w-40 flex-1 bg-transparent outline-none placeholder:text-muted"
        />
      </div>
      {matches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(s)}
              className="pressable min-h-9 rounded-full border border-border px-3 text-sm text-muted"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
