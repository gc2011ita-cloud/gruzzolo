import { describe, expect, it } from 'vitest'
import type { Investment, InvestmentEntry } from '../models'
import { portfolio, portfolioSeries, position, valueSeries } from './investments'

let seq = 0
const e = (
  type: InvestmentEntry['type'],
  amountCents: number,
  date: string,
): Pick<InvestmentEntry, 'type' | 'amountCents' | 'date' | 'createdAt'> => ({
  type,
  amountCents,
  date,
  createdAt: ++seq,
})

const inv = (id: string): Investment => ({
  id,
  name: id,
  kind: 'etf',
  note: '',
  color: '#000',
  order: 0,
  archived: false,
  createdAt: 0,
})

describe('position', () => {
  it('senza valorizzazioni il valore è il capitale versato', () => {
    const p = position([e('deposit', 100000, '2026-01-10'), e('deposit', 50000, '2026-02-10')])
    expect(p).toMatchObject({ invested: 150000, value: 150000, gain: 0, gainPct: 0 })
  })

  it('usa l’ultima valorizzazione più i movimenti successivi', () => {
    const entries = [
      e('deposit', 100000, '2026-01-10'),
      e('valuation', 110000, '2026-03-31'),
      e('deposit', 20000, '2026-04-15'),
      e('withdrawal', 5000, '2026-05-01'),
    ]
    const p = position(entries)
    expect(p.invested).toBe(115000)
    expect(p.value).toBe(125000)
    expect(p.gain).toBe(10000)
    expect(p.gainPct).toBeCloseTo(10000 / 115000)
    expect(p.valuedAt).toBe('2026-03-31')
  })

  it('nello stesso giorno la valorizzazione vale a fine giornata', () => {
    // Inserita prima del versamento, ma nello stesso giorno: il valore resta 130.000.
    const entries = [
      e('deposit', 100000, '2026-01-10'),
      e('valuation', 130000, '2026-06-30'),
      e('deposit', 20000, '2026-06-30'),
    ]
    expect(position(entries)).toMatchObject({ invested: 120000, value: 130000, gain: 10000 })
  })

  it('calcola la situazione a una data', () => {
    const entries = [e('deposit', 100000, '2026-01-10'), e('valuation', 90000, '2026-03-31')]
    expect(position(entries, '2026-02-01')).toMatchObject({ value: 100000, gain: 0 })
    expect(position(entries, '2026-03-31')).toMatchObject({ value: 90000, gain: -10000 })
  })

  it('gestisce un investimento chiuso (tutto prelevato)', () => {
    const p = position([
      e('deposit', 100000, '2026-01-10'),
      e('valuation', 120000, '2026-05-01'),
      e('withdrawal', 120000, '2026-05-02'),
    ])
    expect(p).toMatchObject({ invested: -20000, value: 0, gain: 20000, gainPct: null })
  })
})

describe('serie', () => {
  it('un punto per giorno, a fine giornata', () => {
    const s = valueSeries([
      e('deposit', 1000, '2026-01-01'),
      e('deposit', 500, '2026-01-01'),
      e('valuation', 1600, '2026-02-01'),
    ])
    expect(s).toEqual([
      { date: '2026-01-01', value: 1500, invested: 1500 },
      { date: '2026-02-01', value: 1600, invested: 1500 },
    ])
  })

  it('il portafoglio somma l’ultimo stato noto di ogni investimento', () => {
    const map = new Map([
      ['a', [e('deposit', 1000, '2026-01-01'), e('valuation', 1200, '2026-03-01')]],
      ['b', [e('deposit', 500, '2026-02-01')]],
    ])
    expect(portfolioSeries(map)).toEqual([
      { date: '2026-01-01', value: 1000, invested: 1000 },
      { date: '2026-02-01', value: 1500, invested: 1500 },
      { date: '2026-03-01', value: 1700, invested: 1500 },
    ])
  })
})

describe('portfolio', () => {
  it('totali, quote e ordine per valore', () => {
    const map = new Map([
      ['a', [e('deposit', 1000, '2026-01-01'), e('valuation', 3000, '2026-03-01')]],
      ['b', [e('deposit', 1000, '2026-02-01')]],
      ['c', []],
    ])
    const { rows, total } = portfolio([inv('b'), inv('a'), inv('c')], map)
    expect(total).toMatchObject({ invested: 2000, value: 4000, gain: 2000, gainPct: 1 })
    expect(rows.map((r) => [r.investment.id, r.share])).toEqual([
      ['a', 0.75],
      ['b', 0.25],
      ['c', 0],
    ])
  })
})
