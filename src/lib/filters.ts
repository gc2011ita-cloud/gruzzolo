import type { Category, Cents, ISODate, Transaction, TransactionType } from '../models'
import { signedAmount } from './balances'
import { isInRange, type DateRange } from './dates'

export interface TransactionFilters {
  query?: string
  range?: DateRange
  type?: TransactionType
  categoryIds?: string[]
  /** Il movimento deve avere tutti i tag indicati. */
  tags?: string[]
  minCents?: Cents
  maxCents?: Cents
}

/** Minuscolo e senza accenti, per una ricerca tollerante ("caffe" trova "caffè"). */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('it-IT')
}

export function activeFilterCount(f: TransactionFilters): number {
  let n = 0
  if (f.range) n++
  if (f.type) n++
  if (f.categoryIds?.length) n++
  if (f.tags?.length) n++
  if (f.minCents !== undefined || f.maxCents !== undefined) n++
  return n
}

export function applyFilters(
  transactions: readonly Transaction[],
  f: TransactionFilters,
  categories: ReadonlyMap<string, Category>,
): Transaction[] {
  const words = f.query ? foldText(f.query).split(/\s+/).filter(Boolean) : []
  const cats = f.categoryIds?.length ? new Set(f.categoryIds) : null

  return transactions.filter((t) => {
    if (f.range && !isInRange(t.date, f.range)) return false
    if (f.type && t.type !== f.type) return false
    if (cats && !cats.has(t.categoryId)) return false
    if (f.tags?.length && !f.tags.every((tag) => t.tags.includes(tag))) return false
    if (f.minCents !== undefined && t.amountCents < f.minCents) return false
    if (f.maxCents !== undefined && t.amountCents > f.maxCents) return false
    if (words.length) {
      const haystack = foldText(
        [t.note, categories.get(t.categoryId)?.name ?? '', ...t.tags].join(' '),
      )
      if (!words.every((w) => haystack.includes(w))) return false
    }
    return true
  })
}

export interface DayGroup {
  date: ISODate
  net: Cents
  items: Transaction[]
}

/** Raggruppa per giorno, dal più recente; dentro il giorno, dal più recente inserito. */
export function groupByDay(transactions: readonly Transaction[]): DayGroup[] {
  const sorted = [...transactions].sort((a, b) =>
    a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
  )
  const groups: DayGroup[] = []
  for (const t of sorted) {
    let g = groups[groups.length - 1]
    if (!g || g.date !== t.date) {
      g = { date: t.date, net: 0, items: [] }
      groups.push(g)
    }
    g.items.push(t)
    g.net += signedAmount(t)
  }
  return groups
}
