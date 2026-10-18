import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  title: string
  backTo: string
  backLabel: string
  action?: ReactNode
}

/** Intestazione delle pagine interne: freccia indietro, titolo centrato, azione a destra. */
export function SubpageHeader({ title, backTo, backLabel, action }: Props) {
  return (
    <div className="sticky top-0 z-20 -mx-4 -mt-[env(safe-area-inset-top)] grid grid-cols-[1fr_auto_1fr] items-center bg-bg/90 px-1 pt-[calc(env(safe-area-inset-top)+0.25rem)] pb-1 backdrop-blur-xl lg:mx-0">
      <Link
        to={backTo}
        className="pressable flex min-h-11 items-center justify-self-start rounded-xl pr-3 text-accent-text"
      >
        <ChevronLeft aria-hidden="true" className="size-6" />
        {backLabel}
      </Link>
      <h1 className="truncate text-[1.05rem] font-semibold">{title}</h1>
      <div className="justify-self-end">{action}</div>
    </div>
  )
}
