import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '../models'
import {
  balanceSeries,
  buckets,
  categoryBreakdown,
  granularityFor,
  niceTicks,
  OTHER_SLICE_ID,
  topTags,
  trend,
  upcoming,
} from './stats'

let seq = 0
const tx = (p: Partial<Transaction>): Transaction => ({
  id: `t${++seq}`,
  type: 'expense',
  amountCents: 1000,
  categoryId: 'a',
  date: '2026-10-10',
  note: '',
  tags: [],
  createdAt: seq,
  updatedAt: seq,
  ...p,
})

const cat = (id: string): Category => ({
  id,
  name: id.toUpperCase(),
  kind: 'expense',
  icon: 'more',
  color: '#000',
  order: 0,
  archived: false,
})

const october = { from: '2026-10-01', to: '2026-10-31' }

describe('buckets', () => {
  it('sceglie la granularità in base alla durata', () => {
    expect(granularityFor({ from: '2026-10-12', to: '2026-10-18' })).toBe('day')
    expect(granularityFor(october)).toBe('week')
    expect(granularityFor({ from: '2026-01-01', to: '2026-12-31' })).toBe('month')
  })

  it('settimane dal lunedì tagliate ai bordi del mese', () => {
    const bs = buckets(october)
    expect(bs.map((b) => [b.from, b.to])).toEqual([
      ['2026-10-01', '2026-10-04'],
      ['2026-10-05', '2026-10-11'],
      ['2026-10-12', '2026-10-18'],
      ['2026-10-19', '2026-10-25'],
      ['2026-10-26', '2026-10-31'],
    ])
  })

  it('giorni e mesi coprono tutto il periodo senza buchi', () => {
    expect(buckets({ from: '2026-10-12', to: '2026-10-18' })).toHaveLength(7)
    const year = buckets({ from: '2026-01-01', to: '2026-12-31' })
    expect(year).toHaveLength(12)
    expect(year[1]).toMatchObject({ from: '2026-02-01', to: '2026-02-28', label: 'feb' })
  })
})

describe('trend e saldo', () => {
  const list = [
    tx({ type: 'income', amountCents: 200000, date: '2026-10-01' }),
    tx({ amountCents: 5000, date: '2026-10-06' }),
    tx({ amountCents: 3000, date: '2026-10-11' }),
    tx({ amountCents: 9999, date: '2026-09-30' }), // fuori periodo, prima
    tx({ amountCents: 7000, date: '2026-10-28' }),
  ]

  it('somma entrate e uscite per intervallo', () => {
    const points = trend(list, buckets(october))
    expect(points.map((p) => [p.income, p.expense])).toEqual([
      [200000, 0],
      [0, 8000],
      [0, 0],
      [0, 0],
      [0, 7000],
    ])
  })

  it('il saldo parte dal saldo iniziale più i movimenti precedenti', () => {
    const series = balanceSeries(list, buckets(october), 10000, '2026-10-19')
    expect(series.map((p) => p.balance)).toEqual([
      10000 - 9999 + 200000,
      10000 - 9999 + 200000 - 8000,
      10000 - 9999 + 200000 - 8000,
      10000 - 9999 + 200000 - 8000,
      10000 - 9999 + 200000 - 15000,
    ])
    expect(series.map((p) => p.projected)).toEqual([false, false, false, true, true])
  })
})

describe('categoryBreakdown', () => {
  const cats = new Map(['a', 'b', 'c', 'd'].map((id) => [id, cat(id)]))
  const list = [
    tx({ categoryId: 'a', amountCents: 5000 }),
    tx({ categoryId: 'a', amountCents: 1000 }),
    tx({ categoryId: 'b', amountCents: 3000 }),
    tx({ categoryId: 'c', amountCents: 800 }),
    tx({ categoryId: 'd', amountCents: 200 }),
    tx({ categoryId: 'a', type: 'income', amountCents: 99999 }),
    tx({ categoryId: 'b', amountCents: 4000, date: '2026-11-01' }),
  ]

  it('ordina per importo e calcola le quote', () => {
    const { slices, total } = categoryBreakdown(list, october, 'expense', cats)
    expect(total).toBe(10000)
    expect(slices.map((s) => [s.id, s.amount, s.share, s.count])).toEqual([
      ['a', 6000, 0.6, 2],
      ['b', 3000, 0.3, 1],
      ['c', 800, 0.08, 1],
      ['d', 200, 0.02, 1],
    ])
  })

  it('raggruppa le categorie minori in "Altre"', () => {
    const { slices, folded } = categoryBreakdown(list, october, 'expense', cats, 3)
    expect(slices.map((s) => s.id)).toEqual(['a', 'b', OTHER_SLICE_ID])
    expect(slices[2]).toMatchObject({ amount: 1000, count: 2 })
    expect(folded.map((s) => s.id)).toEqual(['c', 'd'])
  })
})

describe('topTags e upcoming', () => {
  it('tag con più spesa nel periodo', () => {
    const list = [
      tx({ tags: ['casa', 'lavori'], amountCents: 5000 }),
      tx({ tags: ['casa'], amountCents: 1000 }),
      tx({ tags: ['casa'], amountCents: 9000, date: '2026-12-01' }),
    ]
    expect(topTags(list, october)).toEqual([
      { tag: 'casa', amount: 6000, count: 2 },
      { tag: 'lavori', amount: 5000, count: 1 },
    ])
  })

  it('movimenti futuri entro 30 giorni, dal più vicino', () => {
    const list = [
      tx({ id: 'far', date: '2026-12-31' }),
      tx({ id: 'b', date: '2026-10-25' }),
      tx({ id: 'a', date: '2026-10-20' }),
      tx({ id: 'past', date: '2026-10-01' }),
    ]
    expect(upcoming(list, '2026-10-19').map((t) => t.id)).toEqual(['a', 'b'])
  })
})

describe('niceTicks', () => {
  it('produce passi tondi che coprono i dati', () => {
    expect(niceTicks(2750, 4480)).toEqual([2500, 3000, 3500, 4000, 4500])
    expect(niceTicks(0, 1850)).toEqual([0, 500, 1000, 1500, 2000])
    expect(niceTicks(-120, 300)).toEqual([-200, 0, 200, 400])
    expect(niceTicks(100, 100)).toEqual([90, 95, 100, 105, 110])
  })
})
