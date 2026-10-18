import type { ReactNode } from 'react'

interface Props {
  title: string
  actions?: ReactNode
}

export function PageHeader({ title, actions }: Props) {
  return (
    <header className="flex items-end justify-between gap-3 pt-4 pb-3">
      <h1 className="text-[2rem] leading-tight font-bold tracking-tight">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
