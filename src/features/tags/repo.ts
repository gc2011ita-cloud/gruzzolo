import { db as defaultDb, type GruzzoloDB } from '../../db/db'
import type { Cents, Transaction } from '../../models'
import { normalizeTag, normalizeTags } from '../../lib/tags'

export interface TagStat {
  tag: string
  count: number
  expense: Cents
  income: Cents
  lastDate: string
}

/** Statistiche per tag, dal più usato. */
export function tagStats(transactions: Iterable<Transaction>): TagStat[] {
  const map = new Map<string, TagStat>()
  for (const t of transactions) {
    for (const tag of t.tags) {
      let s = map.get(tag)
      if (!s) {
        s = { tag, count: 0, expense: 0, income: 0, lastDate: '' }
        map.set(tag, s)
      }
      s.count++
      if (t.type === 'income') s.income += t.amountCents
      else s.expense += t.amountCents
      if (t.date > s.lastDate) s.lastDate = t.date
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'it'))
}

/**
 * Rinomina un tag su tutti i movimenti. Se il nuovo nome esiste già i due tag
 * vengono uniti (senza duplicati sullo stesso movimento). Restituisce i movimenti modificati.
 */
export async function renameTag(
  from: string,
  to: string,
  db: GruzzoloDB = defaultDb,
): Promise<number> {
  const target = normalizeTag(to)
  if (!target) throw new Error('Nome del tag non valido')
  if (target === from) return 0
  return db.transaction('rw', db.transactions, () =>
    db.transactions
      .where('tags')
      .equals(from)
      .modify((t) => {
        t.tags = normalizeTags(t.tags.map((x) => (x === from ? target : x)))
        t.updatedAt = Date.now()
      }),
  )
}

/** Toglie il tag da tutti i movimenti (i movimenti restano). */
export async function deleteTag(tag: string, db: GruzzoloDB = defaultDb): Promise<number> {
  return db.transaction('rw', db.transactions, () =>
    db.transactions
      .where('tags')
      .equals(tag)
      .modify((t) => {
        t.tags = t.tags.filter((x) => x !== tag)
        t.updatedAt = Date.now()
      }),
  )
}
