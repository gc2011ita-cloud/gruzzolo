import type { Cents, ISODate, Transaction } from '../models'
import { isInRange, type DateRange } from './dates'

type Movement = Pick<Transaction, 'type' | 'amountCents' | 'date'>

export function signedAmount(t: Pick<Transaction, 'type' | 'amountCents'>): Cents {
  return t.type === 'income' ? t.amountCents : -t.amountCents
}

export interface Totals {
  income: Cents
  expense: Cents
  net: Cents
}

export function totals(transactions: Iterable<Movement>, range?: DateRange): Totals {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (range && !isInRange(t.date, range)) continue
    if (t.type === 'income') income += t.amountCents
    else expense += t.amountCents
  }
  return { income, expense, net: income - expense }
}

/** Saldo alla fine del giorno `date` (incluso), partendo dal saldo iniziale. */
export function balanceAt(
  transactions: Iterable<Movement>,
  date: ISODate,
  initialBalance: Cents = 0,
): Cents {
  let balance = initialBalance
  for (const t of transactions) {
    if (t.date <= date) balance += signedAmount(t)
  }
  return balance
}

export interface BalanceSummary {
  /** Saldo considerando i movimenti fino a oggi incluso. */
  current: Cents
  /** Saldo considerando anche i movimenti con data futura. */
  projected: Cents
  /** Somma netta dei soli movimenti futuri. */
  upcoming: Cents
}

export function balanceSummary(
  transactions: Iterable<Movement>,
  today: ISODate,
  initialBalance: Cents = 0,
): BalanceSummary {
  let current = initialBalance
  let upcoming = 0
  for (const t of transactions) {
    if (t.date <= today) current += signedAmount(t)
    else upcoming += signedAmount(t)
  }
  return { current, projected: current + upcoming, upcoming }
}

/** Variazione percentuale tra due valori; null se il precedente è zero. */
export function percentChange(current: Cents, previous: Cents): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}
