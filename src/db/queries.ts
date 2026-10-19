import type { GruzzoloDB } from './db'

/*
 * Letture aggregate fatte scorrendo i movimenti, senza cursori sugli indici
 * (uniqueKeys/keys): su Safari per iPhone quelle sull'indice multi-valore dei tag
 * fallivano e mandavano in errore le pagine Movimenti e Impostazioni.
 */

/** Tag usati almeno una volta, in ordine alfabetico italiano. */
export async function listTags(db: GruzzoloDB): Promise<string[]> {
  const set = new Set<string>()
  await db.transactions.each((t) => {
    for (const tag of t.tags) set.add(tag)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'it'))
}

/** Numero di movimenti per categoria. */
export async function countByCategory(db: GruzzoloDB): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  await db.transactions.each((t) => {
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1)
  })
  return map
}
