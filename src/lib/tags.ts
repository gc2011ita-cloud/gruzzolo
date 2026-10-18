/** Normalizza un tag: senza "#" né virgole, spazi compattati, minuscolo. Vuoto se non valido. */
export function normalizeTag(raw: string): string {
  return raw
    .replace(/^#+/, '')
    .replace(/[,\s]+/g, ' ')
    .trim()
    .toLocaleLowerCase('it-IT')
    .slice(0, 40)
}

/** Normalizza e rimuove i duplicati mantenendo l'ordine. */
export function normalizeTags(raw: Iterable<string>): string[] {
  const out: string[] = []
  for (const r of raw) {
    const tag = normalizeTag(r)
    if (tag && !out.includes(tag)) out.push(tag)
  }
  return out
}
