import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Gruppo di righe in stile Impostazioni di iOS. */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-2">
      {title && <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">{title}</h2>}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface">{children}</ul>
    </section>
  )
}

interface LinkRowProps {
  to: string
  icon?: ReactNode
  label: string
  detail?: string
}

export function LinkRow({ to, icon, label, detail }: LinkRowProps) {
  return (
    <li>
      <Link
        to={to}
        className="pressable flex min-h-13 items-center gap-3 px-4 py-2 active:bg-surface-2"
      >
        {icon}
        <span className="flex-1 font-medium">{label}</span>
        {detail && <span className="text-sm text-muted">{detail}</span>}
        <ChevronRight aria-hidden="true" className="size-5 text-muted" />
      </Link>
    </li>
  )
}
