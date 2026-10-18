import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import type { Investment, InvestmentEntry } from '../../models'

export function useInvestments(): Investment[] | undefined {
  return useLiveQuery(() => db.investments.orderBy('order').toArray(), [])
}

/** Tutte le operazioni raggruppate per investimento. */
export function useEntriesByInvestment(): Map<string, InvestmentEntry[]> | undefined {
  const entries = useLiveQuery(() => db.investmentEntries.toArray(), [])
  return useMemo(() => {
    if (!entries) return undefined
    const map = new Map<string, InvestmentEntry[]>()
    for (const e of entries) {
      const list = map.get(e.investmentId)
      if (list) list.push(e)
      else map.set(e.investmentId, [e])
    }
    return map
  }, [entries])
}
