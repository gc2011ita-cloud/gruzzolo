/** Formati comuni ai grafici. */

const whole = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' })
/** Etichette dell'asse in euro: "1.500", "120k", "1,2 Mln" (it-IT non ha un formato compatto per le migliaia). */
export function axisEuro(v: number): string {
  const a = Math.abs(v)
  if (a >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} Mln`
  if (a >= 100_000) return `${Math.round(v / 1000)}k`
  return whole.format(v)
}
export const axisTick = { fill: 'var(--muted)', fontSize: 11 }
export const pct = (share: number) =>
  share.toLocaleString('it-IT', { style: 'percent', maximumFractionDigits: share < 0.1 ? 1 : 0 })
