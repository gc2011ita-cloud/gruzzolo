import { useEffect, useState } from 'react'
import { periodRange, type DateRange, type PeriodKind } from '../../lib/dates'

export interface PeriodState {
  kind: PeriodKind
  range: DateRange
}

const KEY = 'gruzzolo.overviewPeriod'

/** Periodo della Panoramica (mese corrente all'avvio), conservato per la sessione. */
export function usePeriod(): [PeriodState, (p: PeriodState) => void] {
  const [period, setPeriod] = useState<PeriodState>(() => {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (raw) return JSON.parse(raw) as PeriodState
    } catch {
      // ignora: si riparte dal mese corrente
    }
    return { kind: 'month', range: periodRange('month', new Date()) }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(period))
    } catch {
      // archiviazione non disponibile
    }
  }, [period])

  return [period, setPeriod]
}
