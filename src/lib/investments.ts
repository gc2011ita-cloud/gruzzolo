import type { Cents, ISODate, Investment, InvestmentEntry } from '../models'

/**
 * Regole di calcolo:
 * - capitale investito = versamenti − prelievi;
 * - valore = ultima valorizzazione, più versamenti e meno prelievi successivi
 *   (finché non arriva una nuova valorizzazione il nuovo denaro vale quanto versato);
 * - senza valorizzazioni il valore coincide con il capitale investito;
 * - nello stesso giorno versamenti e prelievi vengono prima della valorizzazione,
 *   che rappresenta il valore a fine giornata.
 * Il rendimento è semplice (guadagno / capitale investito), non ponderato nel tempo.
 */

type Entry = Pick<InvestmentEntry, 'type' | 'amountCents' | 'date' | 'createdAt'>

const typeOrder = { deposit: 0, withdrawal: 0, valuation: 1 } as const

export function sortEntries<T extends Entry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) =>
    a.date !== b.date
      ? a.date < b.date
        ? -1
        : 1
      : typeOrder[a.type] - typeOrder[b.type] || a.createdAt - b.createdAt,
  )
}

export interface Position {
  invested: Cents
  value: Cents
  gain: Cents
  /** Rendimento semplice (0,1 = +10%); null se il capitale investito non è positivo. */
  gainPct: number | null
  /** Data dell'ultima valorizzazione, se presente. */
  valuedAt: ISODate | null
}

function finish(invested: number, value: number, valuedAt: ISODate | null): Position {
  const gain = value - invested
  return { invested, value, gain, gainPct: invested > 0 ? gain / invested : null, valuedAt }
}

/** Situazione alla fine del giorno `at` (predefinito: considera tutto). */
export function position(entries: readonly Entry[], at?: ISODate): Position {
  let invested = 0
  let value = 0
  let valuedAt: ISODate | null = null
  for (const e of sortEntries(entries)) {
    if (at && e.date > at) break
    if (e.type === 'deposit') {
      invested += e.amountCents
      value += e.amountCents
    } else if (e.type === 'withdrawal') {
      invested -= e.amountCents
      value -= e.amountCents
    } else {
      value = e.amountCents
      valuedAt = e.date
    }
  }
  return finish(invested, value, valuedAt)
}

export interface ValuePoint {
  date: ISODate
  value: Cents
  invested: Cents
}

/** Un punto per ogni giorno con movimenti: valore e capitale investito a fine giornata. */
export function valueSeries(entries: readonly Entry[]): ValuePoint[] {
  const points: ValuePoint[] = []
  let invested = 0
  let value = 0
  for (const e of sortEntries(entries)) {
    if (e.type === 'deposit') {
      invested += e.amountCents
      value += e.amountCents
    } else if (e.type === 'withdrawal') {
      invested -= e.amountCents
      value -= e.amountCents
    } else value = e.amountCents
    const last = points[points.length - 1]
    if (last?.date === e.date) {
      last.value = value
      last.invested = invested
    } else points.push({ date: e.date, value, invested })
  }
  return points
}

/** Somma più investimenti: per ogni data, ciascuno contribuisce con il suo ultimo stato noto. */
export function portfolioSeries(byInvestment: ReadonlyMap<string, readonly Entry[]>): ValuePoint[] {
  const series = [...byInvestment.values()].map(valueSeries)
  const dates = [...new Set(series.flatMap((s) => s.map((p) => p.date)))].sort()
  const cursors = series.map(() => -1)
  return dates.map((date) => {
    let value = 0
    let invested = 0
    series.forEach((s, i) => {
      while (cursors[i]! + 1 < s.length && s[cursors[i]! + 1]!.date <= date) cursors[i]!++
      const p = s[cursors[i]!]
      if (p) {
        value += p.value
        invested += p.invested
      }
    })
    return { date, value, invested }
  })
}

export interface PortfolioRow {
  investment: Investment
  position: Position
  /** Quota sul valore totale del portafoglio, da 0 a 1. */
  share: number
}

export function portfolio(
  investments: readonly Investment[],
  byInvestment: ReadonlyMap<string, readonly Entry[]>,
): { rows: PortfolioRow[]; total: Position } {
  const positions = investments.map((inv) => ({
    investment: inv,
    position: position(byInvestment.get(inv.id) ?? []),
  }))
  const invested = positions.reduce((s, p) => s + p.position.invested, 0)
  const value = positions.reduce((s, p) => s + p.position.value, 0)
  const rows = positions
    .map((p) => ({ ...p, share: value > 0 ? Math.max(p.position.value, 0) / value : 0 }))
    .sort((a, b) => b.position.value - a.position.value)
  return { rows, total: finish(invested, value, null) }
}
