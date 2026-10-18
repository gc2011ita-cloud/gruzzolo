import { describe, expect, it } from 'vitest'
import { centsToInput, formatCents, parseAmount } from './money'

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12,50', 1250],
    ['12.5', 1250],
    ['12.50', 1250],
    [',99', 99],
    ['0,01', 1],
    ['1.234', 123400],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1.234.567', 123456700],
    ['1.234.567,89', 123456789],
    ['€ 1 234,00', 123400],
    ['  7,00  ', 700],
    ['+3', 300],
  ])('%s -> %i centesimi', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each(['', 'abc', '12,345', '1,2,3', '-5', '12..5', '1.23.4', '12,5a', '1.2345,00'])(
    'rifiuta %s',
    (input) => {
      expect(parseAmount(input)).toBeNull()
    },
  )

  it('non introduce errori di virgola mobile', () => {
    expect(parseAmount('0,29')).toBe(29)
    expect(parseAmount('1,15')).toBe(115)
    expect(parseAmount('4,35')).toBe(435)
  })
})

describe('formatCents', () => {
  const norm = (s: string) => s.replace(/\s/g, ' ')

  it('formatta in euro con locale italiano', () => {
    expect(norm(formatCents(123456))).toBe('1.234,56 €')
    expect(norm(formatCents(5))).toBe('0,05 €')
  })

  it('mostra il segno quando richiesto', () => {
    expect(norm(formatCents(1000, { signed: true }))).toBe('+10,00 €')
    expect(norm(formatCents(-1000, { signed: true }))).toBe('-10,00 €')
  })
})

describe('centsToInput', () => {
  it('produce un testo che parseAmount rilegge identico', () => {
    for (const cents of [0, 1, 99, 100, 1250, 123456]) {
      expect(parseAmount(centsToInput(cents))).toBe(cents)
    }
  })
})
