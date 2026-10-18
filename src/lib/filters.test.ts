import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '../models'
import { activeFilterCount, applyFilters, foldText, groupByDay } from './filters'
import { normalizeTags } from './tags'

const cat = (id: string, name: string, kind: Category['kind'] = 'expense'): Category => ({
  id,
  name,
  kind,
  icon: 'more',
  color: '#000',
  order: 0,
  archived: false,
})

const categories = new Map(
  [
    cat('food', 'Spesa alimentare'),
    cat('bar', 'Ristoranti e bar'),
    cat('pay', 'Stipendio', 'income'),
  ].map((c) => [c.id, c]),
)

let seq = 0
const tx = (p: Partial<Transaction>): Transaction => ({
  id: `t${++seq}`,
  type: 'expense',
  amountCents: 1000,
  categoryId: 'food',
  date: '2026-10-10',
  note: '',
  tags: [],
  createdAt: seq,
  updatedAt: seq,
  ...p,
})

const list = [
  tx({ categoryId: 'bar', amountCents: 150, note: 'Caffè al bar', tags: ['colazione'] }),
  tx({
    categoryId: 'food',
    amountCents: 4520,
    tags: ['supermercato', 'famiglia'],
    date: '2026-10-11',
  }),
  tx({ categoryId: 'pay', type: 'income', amountCents: 180000, date: '2026-10-01' }),
  tx({
    categoryId: 'bar',
    amountCents: 3200,
    note: 'Pizza',
    tags: ['famiglia'],
    date: '2026-11-05',
  }),
]

describe('normalizeTags', () => {
  it('pulisce, porta in minuscolo e toglie i duplicati', () => {
    expect(normalizeTags(['#Pizza', ' pizza ', 'Gita   al mare', '', '##'])).toEqual([
      'pizza',
      'gita al mare',
    ])
  })
})

describe('applyFilters', () => {
  it('ricerca senza accenti su note, categoria e tag', () => {
    expect(applyFilters(list, { query: 'caffe' }, categories)).toHaveLength(1)
    expect(applyFilters(list, { query: 'STIPENDIO' }, categories)).toHaveLength(1)
    expect(applyFilters(list, { query: 'famiglia pizza' }, categories)).toHaveLength(1)
  })

  it('filtra per periodo, tipo, categoria, tag e importo', () => {
    const oct = { from: '2026-10-01', to: '2026-10-31' }
    expect(applyFilters(list, { range: oct }, categories)).toHaveLength(3)
    expect(applyFilters(list, { type: 'income' }, categories)).toHaveLength(1)
    expect(applyFilters(list, { categoryIds: ['bar'] }, categories)).toHaveLength(2)
    expect(applyFilters(list, { tags: ['famiglia'] }, categories)).toHaveLength(2)
    expect(applyFilters(list, { tags: ['famiglia', 'supermercato'] }, categories)).toHaveLength(1)
    expect(applyFilters(list, { minCents: 1000, maxCents: 5000 }, categories)).toHaveLength(2)
    expect(applyFilters(list, { range: oct, categoryIds: ['bar'] }, categories)).toHaveLength(1)
  })

  it('conta i filtri attivi', () => {
    expect(activeFilterCount({ query: 'x' })).toBe(0)
    expect(activeFilterCount({ type: 'expense', minCents: 1, tags: ['a'] })).toBe(3)
  })
})

describe('groupByDay', () => {
  it('raggruppa dal giorno più recente, futuri compresi, con il netto giornaliero', () => {
    const groups = groupByDay([
      ...list,
      tx({ date: '2026-10-11', type: 'income', amountCents: 500, categoryId: 'pay' }),
    ])
    expect(groups.map((g) => g.date)).toEqual([
      '2026-11-05',
      '2026-10-11',
      '2026-10-10',
      '2026-10-01',
    ])
    expect(groups[1]?.net).toBe(500 - 4520)
    expect(groups[1]?.items[0]?.amountCents).toBe(500) // inserito per ultimo
  })
})

describe('foldText', () => {
  it('rimuove gli accenti', () => {
    expect(foldText('Perché Università')).toBe('perche universita')
  })
})
