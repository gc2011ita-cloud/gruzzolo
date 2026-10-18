import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { it } from 'date-fns/locale'
import type { ISODate } from '../models'

export const WEEK_STARTS_ON = 1 as const

export function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd')
}

export function fromISODate(iso: ISODate): Date {
  return parseISO(iso)
}

export function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value))
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export type PeriodKind = 'week' | 'month' | 'year' | 'custom'

export interface DateRange {
  from: ISODate
  to: ISODate
}

/** Intervallo (estremi inclusi) del periodo che contiene `ref`. */
export function periodRange(kind: Exclude<PeriodKind, 'custom'>, ref: Date): DateRange {
  switch (kind) {
    case 'week':
      return {
        from: toISODate(startOfWeek(ref, { weekStartsOn: WEEK_STARTS_ON })),
        to: toISODate(endOfWeek(ref, { weekStartsOn: WEEK_STARTS_ON })),
      }
    case 'month':
      return { from: toISODate(startOfMonth(ref)), to: toISODate(endOfMonth(ref)) }
    case 'year':
      return { from: toISODate(startOfYear(ref)), to: toISODate(endOfYear(ref)) }
  }
}

/** Sposta il periodo di `steps` unità (negativo = indietro). */
export function shiftPeriod(range: DateRange, kind: PeriodKind, steps: number): DateRange {
  const from = fromISODate(range.from)
  switch (kind) {
    case 'week':
      return periodRange('week', addWeeks(from, steps))
    case 'month':
      return periodRange('month', addMonths(from, steps))
    case 'year':
      return periodRange('year', addYears(from, steps))
    case 'custom': {
      const len = differenceInCalendarDays(fromISODate(range.to), from) + 1
      return {
        from: toISODate(addDays(from, len * steps)),
        to: toISODate(addDays(fromISODate(range.to), len * steps)),
      }
    }
  }
}

export function isInRange(date: ISODate, range: DateRange): boolean {
  return date >= range.from && date <= range.to
}

/** Etichetta del giorno per l'elenco movimenti: "Oggi", "Ieri", "Domani" o "lunedì 5 ottobre 2026". */
export function dayLabel(iso: ISODate, now: Date = new Date()): string {
  const diff = differenceInCalendarDays(fromISODate(iso), now)
  if (diff === 0) return 'Oggi'
  if (diff === -1) return 'Ieri'
  if (diff === 1) return 'Domani'
  const sameYear = iso.slice(0, 4) === toISODate(now).slice(0, 4)
  return format(fromISODate(iso), sameYear ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy', { locale: it })
}

export function formatDate(iso: ISODate, pattern = 'd MMM yyyy'): string {
  return format(fromISODate(iso), pattern, { locale: it })
}

/** Etichetta leggibile di un periodo: "ottobre 2026", "12–18 ott 2026", "2026". */
export function periodLabel(kind: PeriodKind, range: DateRange): string {
  const from = fromISODate(range.from)
  const to = fromISODate(range.to)
  switch (kind) {
    case 'month':
      return format(from, 'LLLL yyyy', { locale: it })
    case 'year':
      return format(from, 'yyyy')
    case 'week':
    case 'custom': {
      const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4)
      const sameMonth = sameYear && range.from.slice(5, 7) === range.to.slice(5, 7)
      const start = format(from, sameMonth ? 'd' : sameYear ? 'd MMM' : 'd MMM yyyy', {
        locale: it,
      })
      return `${start}–${format(to, 'd MMM yyyy', { locale: it })}`
    }
  }
}
