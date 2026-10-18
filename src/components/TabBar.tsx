import { NavLink } from 'react-router-dom'
import { tabs } from '../features/registry'
import { t } from '../i18n'

/** Barra in basso su mobile, barra laterale su schermi grandi. */
export function TabBar() {
  return (
    <nav
      aria-label={t().nav.main}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-safe backdrop-blur-xl lg:inset-y-0 lg:right-auto lg:w-60 lg:border-t-0 lg:border-r lg:pt-safe lg:pb-0"
    >
      <p className="hidden px-6 pt-6 pb-4 text-xl font-bold lg:block">{t().app.name}</p>
      <ul className="flex lg:flex-col lg:gap-1 lg:px-3">
        {tabs.map(({ path, label, icon: Icon }) => (
          <li key={path} className="flex-1 lg:flex-none">
            <NavLink
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `pressable flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:text-base ${
                  isActive ? 'text-accent-text lg:bg-surface-2' : 'text-muted'
                }`
              }
            >
              <Icon aria-hidden="true" className="size-6 lg:size-5" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
