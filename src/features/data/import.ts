import { db as defaultDb, newId, type GruzzoloDB } from '../../db/db'
import { categoryColors } from '../../components/category-icons'
import type { ImportPlan } from '../../lib/csv'
import { foldText } from '../../lib/filters'
import type { Transaction } from '../../models'

/**
 * Salva un piano di importazione: crea le categorie mancanti e aggiunge i movimenti
 * (esclusi i duplicati) in un'unica transazione. Restituisce quanti movimenti sono stati aggiunti.
 */
export async function applyImport(plan: ImportPlan, db: GruzzoloDB = defaultDb): Promise<number> {
  return db.transaction('rw', db.categories, db.transactions, async () => {
    const created = new Map<string, string>()
    for (const [i, nc] of plan.newCategories.entries()) {
      const existing = (await db.categories.where('kind').equals(nc.kind).toArray()).find(
        (c) => foldText(c.name) === foldText(nc.name),
      )
      if (existing) {
        created.set(`${nc.kind}|${foldText(nc.name)}`, existing.id)
        continue
      }
      const last = (await db.categories.where('kind').equals(nc.kind).sortBy('order')).at(-1)
      const id = newId()
      await db.categories.add({
        id,
        name: nc.name.trim(),
        kind: nc.kind,
        icon: 'tag',
        color: categoryColors[(i * 3) % categoryColors.length]!,
        order: (last?.order ?? -1) + 1,
        archived: false,
      })
      created.set(`${nc.kind}|${foldText(nc.name)}`, id)
    }

    const now = Date.now()
    const rows: Transaction[] = plan.rows
      .filter((r) => !r.duplicate)
      .map((r, i) => ({
        id: newId(),
        type: r.type,
        amountCents: r.amountCents,
        categoryId:
          r.categoryId ?? created.get(`${r.type}|${foldText(r.newCategoryName ?? '')}`) ?? '',
        date: r.date,
        note: r.note.trim(),
        tags: r.tags,
        // createdAt crescente: nell'elenco i movimenti dello stesso giorno restano nell'ordine del file.
        createdAt: now + i,
        updatedAt: now + i,
      }))
    await db.transactions.bulkAdd(rows)
    return rows.length
  })
}
