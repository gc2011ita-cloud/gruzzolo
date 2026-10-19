import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { countByCategory } from '../../db/queries'
import { fmt, t } from '../../i18n'

/** Numero di movimenti per categoria. */
export function useCategoryUsage(): Map<string, number> | undefined {
  return useLiveQuery(() => countByCategory(db), [])
}

export function usageLabel(n: number): string {
  if (n === 0) return t().cat.usageNone
  if (n === 1) return t().cat.usageOne
  return fmt(t().cat.usage, { n })
}
