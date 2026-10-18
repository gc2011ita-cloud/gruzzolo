import { useEffect, useState } from 'react'
import type { DateRange, PeriodKind } from '../../lib/dates'
import type { TransactionFilters } from '../../lib/filters'

export interface ListFilterState extends Omit<TransactionFilters, 'range' | 'query'> {
  period: PeriodKind | 'all'
  range?: DateRange
}

export const emptyFilters: ListFilterState = { period: 'all' }

const KEY = 'gruzzolo.listFilters'

/** Filtri dell'elenco, conservati per la sessione (tornando da un movimento restano impostati). */
export function usePersistentFilters(): [ListFilterState, (f: ListFilterState) => void] {
  const [filters, setFilters] = useState<ListFilterState>(() => {
    try {
      const raw = sessionStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as ListFilterState) : emptyFilters
    } catch {
      return emptyFilters
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(filters))
    } catch {
      // Archiviazione non disponibile (es. navigazione privata): i filtri restano in memoria.
    }
  }, [filters])

  return [filters, setFilters]
}
