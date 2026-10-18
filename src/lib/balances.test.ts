import { describe, expect, it } from 'vitest'
import type { Transaction } from '../models'
import { balanceAt, balanceSummary, percentChange, totals } from './balances'

type Mov = Pick<Transaction, 'type' | 'amountCents' | 'date'>

const movements: Mov[] = [
  { type: 'income', amountCents: 200000, date: '2026-10-01' },
  { type: 'expense', amountCents: 4550, date: '2026-10-03' },
  { type: 'expense', amountCents: 80000, date: '2026-10-05' },
  { type: 'expense', amountCents: 1999, date: '2026-09-28' },
  { type: 'income', amountCents: 5000, date: '2026-10-25' }, // futuro
  { type: 'expense', amountCents: 12000, date: '2026-11-02' }, // futuro
]

describe('totals', () => {
  it('somma entrate e uscite nel periodo', () => {
    expect(totals(movements, { from: '2026-10-01', to: '2026-10-31' })).toEqual({
      income: 205000,
      expense: 84550,
      net: 120450,
    })
  })

  it('senza periodo considera tutto', () => {
    expect(totals(movements).net).toBe(205000 - 98549)
  })
})

describe('balanceAt', () => {
  it('include i movimenti fino alla data compresa', () => {
    expect(balanceAt(movements, '2026-10-03', 10000)).toBe(10000 - 1999 + 200000 - 4550)
  })
})

describe('balanceSummary', () => {
  it('separa saldo attuale e previsto con movimenti futuri', () => {
    const s = balanceSummary(movements, '2026-10-18', 10000)
    expect(s.current).toBe(10000 + 200000 - 4550 - 80000 - 1999)
    expect(s.upcoming).toBe(5000 - 12000)
    expect(s.projected).toBe(s.current + s.upcoming)
  })

  it('i movimenti passati inseriti dopo contano nel saldo attuale', () => {
    const s = balanceSummary(
      [{ type: 'expense', amountCents: 500, date: '2020-01-01' }],
      '2026-10-18',
    )
    expect(s.current).toBe(-500)
    expect(s.upcoming).toBe(0)
  })
})

describe('percentChange', () => {
  it('calcola la variazione rispetto al periodo precedente', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(100, 0)).toBeNull()
  })
})
