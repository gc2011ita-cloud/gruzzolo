import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { fmt, t } from '../../i18n'

/** Numero di movimenti per categoria (legge solo l'indice, non i movimenti). */
export function useCategoryUsage(): Map<string, number> | undefined {
  return useLiveQuery(async () => {
    const keys = (await db.transactions.orderBy('categoryId').keys()) as string[]
    const map = new Map<string, number>()
    for (const k of keys) map.set(k, (map.get(k) ?? 0) + 1)
    return map
  }, [])
}

export function usageLabel(n: number): string {
  if (n === 0) return t().cat.usageNone
  if (n === 1) return t().cat.usageOne
  return fmt(t().cat.usage, { n })
}
