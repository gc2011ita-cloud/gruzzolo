import { describe, expect, it } from 'vitest'
import { dayLabel, isISODate, periodLabel, periodRange, shiftPeriod } from './dates'

const ref = new Date(2026, 9, 18) // domenica 18 ottobre 2026

describe('periodRange', () => {
  it('la settimana inizia di lunedì', () => {
    expect(periodRange('week', ref)).toEqual({ from: '2026-10-12', to: '2026-10-18' })
  })

  it('mese e anno', () => {
    expect(periodRange('month', ref)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(periodRange('year', ref)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
})

describe('shiftPeriod', () => {
  it('mese precedente gestisce lunghezze diverse', () => {
    const march = periodRange('month', new Date(2026, 2, 31))
    expect(shiftPeriod(march, 'month', -1)).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('periodo personalizzato si sposta della sua lunghezza', () => {
    expect(shiftPeriod({ from: '2026-10-01', to: '2026-10-10' }, 'custom', -1)).toEqual({
      from: '2026-09-21',
      to: '2026-09-30',
    })
  })
})

describe('dayLabel', () => {
  it('usa etichette relative vicino a oggi', () => {
    expect(dayLabel('2026-10-18', ref)).toBe('Oggi')
    expect(dayLabel('2026-10-17', ref)).toBe('Ieri')
    expect(dayLabel('2026-10-19', ref)).toBe('Domani')
    expect(dayLabel('2026-10-05', ref)).toBe('lunedì 5 ottobre')
    expect(dayLabel('2025-12-25', ref)).toBe('giovedì 25 dicembre 2025')
  })
})

describe('isISODate', () => {
  it('valida il formato', () => {
    expect(isISODate('2026-02-28')).toBe(true)
    expect(isISODate('2026-02-30')).toBe(false)
    expect(isISODate('28/02/2026')).toBe(false)
  })
})

describe('periodLabel', () => {
  it('descrive il periodo in italiano', () => {
    expect(periodLabel('month', periodRange('month', ref))).toBe('ottobre 2026')
    expect(periodLabel('year', periodRange('year', ref))).toBe('2026')
    expect(periodLabel('week', periodRange('week', ref))).toBe('12–18 ott 2026')
    expect(periodLabel('custom', { from: '2026-09-28', to: '2026-10-04' })).toBe(
      '28 set–4 ott 2026',
    )
  })
})
