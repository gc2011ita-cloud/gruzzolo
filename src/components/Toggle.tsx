import { useId, type ReactNode } from 'react'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
}

/** Interruttore in stile iOS basato su una checkbox nativa (accessibile come "switch"). */
export function Toggle({ checked, onChange, label, description }: Props) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-center gap-3 py-1.5">
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-surface-2 transition-colors peer-checked:bg-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text after:absolute after:top-[2px] after:left-[2px] after:size-[27px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  )
}
