import type { Cents } from '../models'

export const DEFAULT_LOCALE = 'it-IT'
export const DEFAULT_CURRENCY = 'EUR'

/**
 * Converte un testo digitato dall'utente in centesimi.
 * Accetta virgola o punto come separatore decimale e i separatori delle migliaia:
 * "12,5" "12.50" "1.234,56" "1,234.56" "€ 1 234" -> centesimi.
 * Regole quando compare un solo tipo di separatore:
 * - la virgola è sempre decimale (se compare una volta sola);
 * - il punto è decimale se seguito da 1-2 cifre, delle migliaia se seguito da 3 cifre.
 * Restituisce null per input non valido, negativo o con più di 2 decimali.
 */
export function parseAmount(input: string): Cents | null {
  const cleaned = input.replace(/[\s€]/g, '').replace(/^\+/, '')
  if (cleaned === '' || !/^[\d.,]+$/.test(cleaned)) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let intPart: string
  let fracPart = ''

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? ',' : '.'
    const thousandSep = decimalSep === ',' ? '.' : ','
    const idx = cleaned.lastIndexOf(decimalSep)
    intPart = cleaned.slice(0, idx)
    fracPart = cleaned.slice(idx + 1)
    if (!isGroupedInteger(intPart, thousandSep)) return null
    intPart = intPart.split(thousandSep).join('')
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.'
    const parts = cleaned.split(sep)
    if (parts.length === 2) {
      const [a = '', b = ''] = parts
      if (sep === '.' && b.length === 3 && a.length > 0) {
        intPart = a + b
      } else {
        intPart = a
        fracPart = b
      }
    } else {
      if (!isGroupedInteger(cleaned, sep)) return null
      intPart = parts.join('')
    }
  } else {
    intPart = cleaned
  }

  if (intPart === '') intPart = '0'
  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(fracPart) || fracPart.length > 2) return null

  const cents = Number(intPart) * 100 + Number(fracPart.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

/** "1.234.567" con gruppi da 3 cifre dopo il primo. */
function isGroupedInteger(value: string, sep: string): boolean {
  if (!value.includes(sep)) return /^\d*$/.test(value)
  const groups = value.split(sep)
  const [first = '', ...rest] = groups
  return /^\d{1,3}$/.test(first) && rest.every((g) => /^\d{3}$/.test(g))
}

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(locale: string, currency: string, signed: boolean): Intl.NumberFormat {
  const key = `${locale}|${currency}|${signed}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      signDisplay: signed ? 'exceptZero' : 'auto',
      // it-IT di default non raggruppa le cifre sotto 10.000 ("1234,56"): forziamo "1.234,56".
      useGrouping: 'always',
    })
    formatters.set(key, f)
  }
  return f
}

/** Formatta centesimi come valuta: 123456 -> "1.234,56 €". */
export function formatCents(
  cents: Cents,
  opts: { signed?: boolean; locale?: string; currency?: string } = {},
): string {
  const { signed = false, locale = DEFAULT_LOCALE, currency = DEFAULT_CURRENCY } = opts
  return formatter(locale, currency, signed).format(cents / 100)
}

/** Centesimi -> testo modificabile in un campo importo: 1250 -> "12,50". */
export function centsToInput(cents: Cents): string {
  const abs = Math.abs(cents)
  const euros = Math.floor(abs / 100)
  const rest = String(abs % 100).padStart(2, '0')
  return `${cents < 0 ? '-' : ''}${euros},${rest}`
}
