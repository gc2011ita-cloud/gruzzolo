import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { it } from 'date-fns/locale'
import type { Category, Cents, ISODate, Transaction, TransactionType } from '../models'
import { signedAmount } from './balances'
import { fromISODate, isInRange, toISODate, WEEK_STARTS_ON, type DateRange } from './dates'

export type Granularity = 'day' | 'week' | 'month'

export interface Bucket {
  from: ISODate
  to: ISODate
  /** Etichetta breve per l'asse. */
  label: string
  /** Etichetta estesa per tooltip e tabella. */
  longLabel: string
}

/** Giorni fino a 2 settimane, settimane fino a ~3 mesi, poi mesi. */
export function granularityFor(range: DateRange): Granularity {
  const days = differenceInCalendarDays(fromISODate(range.to), fromISODate(range.from)) + 1
  if (days <= 14) return 'day'
  if (days <= 92) return 'week'
  return 'month'
}

const clampFrom = (d: Date, range: DateRange) =>
  toISODate(d) < range.from ? range.from : toISODate(d)
const clampTo = (d: Date, range: DateRange) => (toISODate(d) > range.to ? range.to : toISODate(d))

/** Suddivide il periodo in intervalli contigui (estremi inclusi), tagliati ai bordi del periodo. */
export function buckets(range: DateRange, granularity = granularityFor(range)): Bucket[] {
  const out: Bucket[] = []
  const end = fromISODate(range.to)
  let cursor = fromISODate(range.from)

  while (cursor <= end) {
    let next: Date
    let from: ISODate
    let to: ISODate
    if (granularity === 'day') {
      from = to = toISODate(cursor)
      next = addDays(cursor, 1)
      out.push({
        from,
        to,
        label: format(cursor, 'EEEEE d', { locale: it }),
        longLabel: format(cursor, 'EEEE d MMMM', { locale: it }),
      })
    } else if (granularity === 'week') {
      from = clampFrom(startOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON }), range)
      to = clampTo(endOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON }), range)
      next = addDays(fromISODate(to), 1)
      const f = fromISODate(from)
      const t = fromISODate(to)
      out.push({
        from,
        to,
        label: format(f, 'd MMM', { locale: it }),
        longLabel:
          from === to
            ? format(f, 'd MMMM', { locale: it })
            : `${format(f, 'd MMM', { locale: it })} – ${format(t, 'd MMM', { locale: it })}`,
      })
    } else {
      from = clampFrom(startOfMonth(cursor), range)
      to = clampTo(endOfMonth(cursor), range)
      next = addMonths(startOfMonth(cursor), 1)
      out.push({
        from,
        to,
        label: format(cursor, 'MMM', { locale: it }),
        longLabel: format(cursor, 'LLLL yyyy', { locale: it }),
      })
    }
    cursor = next
  }
  return out
}

export interface TrendPoint {
  label: string
  longLabel: string
  income: Cents
  expense: Cents
}

/** Entrate e uscite per ciascun intervallo. */
export function trend(transactions: readonly Transaction[], bs: readonly Bucket[]): TrendPoint[] {
  const points = bs.map((b) => ({ label: b.label, longLabel: b.longLabel, income: 0, expense: 0 }))
  for (const t of transactions) {
    const i = findBucket(bs, t.date)
    if (i < 0) continue
    const p = points[i]!
    if (t.type === 'income') p.income += t.amountCents
    else p.expense += t.amountCents
  }
  return points
}

function findBucket(bs: readonly Bucket[], date: ISODate): number {
  // Ricerca binaria: gli intervalli sono ordinati e contigui.
  let lo = 0
  let hi = bs.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const b = bs[mid]!
    if (date < b.from) hi = mid - 1
    else if (date > b.to) lo = mid + 1
    else return mid
  }
  return -1
}

export interface BalancePoint {
  label: string
  longLabel: string
  /** Saldo alla fine dell'intervallo. */
  balance: Cents
  /** true se l'intervallo finisce dopo oggi (saldo previsto). */
  projected: boolean
}

export function balanceSeries(
  transactions: readonly Transaction[],
  bs: readonly Bucket[],
  initialBalance: Cents,
  today: ISODate,
): BalancePoint[] {
  if (bs.length === 0) return []
  const start = bs[0]!.from
  let running = initialBalance
  const deltas = new Array<number>(bs.length).fill(0)
  for (const t of transactions) {
    if (t.date < start) running += signedAmount(t)
    else {
      const i = findBucket(bs, t.date)
      if (i >= 0) deltas[i]! += signedAmount(t)
    }
  }
  return bs.map((b, i) => {
    running += deltas[i]!
    return { label: b.label, longLabel: b.longLabel, balance: running, projected: b.to > today }
  })
}

export interface CategorySlice {
  id: string
  name: string
  color: string
  icon: string
  amount: Cents
  /** Quota sul totale, da 0 a 1. */
  share: number
  count: number
}

export const OTHER_SLICE_ID = '__other__'

/**
 * Totali per categoria nel periodo, dal più alto. Oltre `maxSlices` le categorie
 * minori confluiscono in una fetta "Altre" (mai colori generati).
 */
export function categoryBreakdown(
  transactions: readonly Transaction[],
  range: DateRange,
  type: TransactionType,
  categories: ReadonlyMap<string, Category>,
  maxSlices = 6,
): { slices: CategorySlice[]; total: Cents; folded: CategorySlice[] } {
  const map = new Map<string, { amount: number; count: number }>()
  let total = 0
  for (const t of transactions) {
    if (t.type !== type || !isInRange(t.date, range)) continue
    const s = map.get(t.categoryId) ?? { amount: 0, count: 0 }
    s.amount += t.amountCents
    s.count++
    map.set(t.categoryId, s)
    total += t.amountCents
  }
  const all: CategorySlice[] = [...map.entries()]
    .map(([id, s]) => {
      const c = categories.get(id)
      return {
        id,
        name: c?.name ?? '—',
        color: c?.color ?? '#6b7280',
        icon: c?.icon ?? 'more',
        amount: s.amount,
        count: s.count,
        share: total ? s.amount / total : 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  if (all.length <= maxSlices) return { slices: all, total, folded: [] }
  const kept = all.slice(0, maxSlices - 1)
  const folded = all.slice(maxSlices - 1)
  const amount = folded.reduce((s, c) => s + c.amount, 0)
  kept.push({
    id: OTHER_SLICE_ID,
    name: '',
    color: '#8e8e93',
    icon: 'more',
    amount,
    count: folded.reduce((s, c) => s + c.count, 0),
    share: total ? amount / total : 0,
  })
  return { slices: kept, total, folded }
}

export interface TagTotal {
  tag: string
  amount: Cents
  count: number
}

/** Tag con più spesa nel periodo. */
export function topTags(
  transactions: readonly Transaction[],
  range: DateRange,
  type: TransactionType = 'expense',
  limit = 5,
): TagTotal[] {
  const map = new Map<string, TagTotal>()
  for (const t of transactions) {
    if (t.type !== type || !isInRange(t.date, range)) continue
    for (const tag of t.tags) {
      const s = map.get(tag) ?? { tag, amount: 0, count: 0 }
      s.amount += t.amountCents
      s.count++
      map.set(tag, s)
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, limit)
}

/** Movimenti futuri entro `days` giorni, dal più vicino. */
export function upcoming(
  transactions: readonly Transaction[],
  today: ISODate,
  days = 30,
): Transaction[] {
  const limit = toISODate(addDays(fromISODate(today), days))
  return transactions
    .filter((t) => t.date > today && t.date <= limit)
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
}

/** Tacche "tonde" per un asse (passi da 1, 2, 2,5 o 5 × 10ⁿ) che includono min e max. */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0]
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  const raw = (max - min) / target
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100)
  return ticks
}
