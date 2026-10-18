import { Ellipsis } from 'lucide-react'
import { categoryIcons } from './category-icons'

interface Props {
  icon: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'size-8 [&>svg]:size-4',
  md: 'size-10 [&>svg]:size-5',
  lg: 'size-12 [&>svg]:size-6',
}

export function CategoryIcon({ icon, color, size = 'md' }: Props) {
  const Icon = categoryIcons[icon] ?? Ellipsis
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full text-white ${sizes[size]}`}
      style={{ backgroundColor: color }}
    >
      <Icon strokeWidth={2.25} />
    </span>
  )
}
