import { db as defaultDb, newId, type GruzzoloDB } from '../../db/db'
import type { Category, CategoryKind } from '../../models'

export type CategoryInput = Pick<Category, 'name' | 'kind' | 'icon' | 'color'>

export class CategoryError extends Error {
  constructor(public code: 'name-empty' | 'name-taken' | 'in-use' | 'bad-target' | 'not-found') {
    super(code)
  }
}

async function siblings(db: GruzzoloDB, kind: CategoryKind): Promise<Category[]> {
  return db.categories.where('kind').equals(kind).sortBy('order')
}

async function checkName(db: GruzzoloDB, kind: CategoryKind, name: string, exceptId?: string) {
  const clean = name.trim()
  if (!clean) throw new CategoryError('name-empty')
  const lower = clean.toLocaleLowerCase('it-IT')
  const clash = (await siblings(db, kind)).some(
    (c) => c.id !== exceptId && c.name.toLocaleLowerCase('it-IT') === lower,
  )
  if (clash) throw new CategoryError('name-taken')
  return clean
}

export async function addCategory(
  input: CategoryInput,
  db: GruzzoloDB = defaultDb,
): Promise<string> {
  return db.transaction('rw', db.categories, async () => {
    const name = await checkName(db, input.kind, input.name)
    const all = await siblings(db, input.kind)
    const id = newId()
    await db.categories.add({
      ...input,
      name,
      id,
      order: (all.at(-1)?.order ?? -1) + 1,
      archived: false,
    })
    return id
  })
}

/** Il tipo (uscita/entrata) non si cambia: i movimenti collegati resterebbero incoerenti. */
export async function updateCategory(
  id: string,
  patch: Pick<Category, 'name' | 'icon' | 'color'>,
  db: GruzzoloDB = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const existing = await db.categories.get(id)
    if (!existing) throw new CategoryError('not-found')
    const name = await checkName(db, existing.kind, patch.name, id)
    await db.categories.update(id, { ...patch, name })
  })
}

/** Sposta la categoria di una posizione su (-1) o giù (+1) tra quelle dello stesso tipo. */
export async function moveCategory(
  id: string,
  direction: -1 | 1,
  db: GruzzoloDB = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const existing = await db.categories.get(id)
    if (!existing) return
    const list = await siblings(db, existing.kind)
    const i = list.findIndex((c) => c.id === id)
    const j = i + direction
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j]!, list[i]!]
    // Riscrive gli ordini 0..n-1, così restano sempre compatti e senza duplicati.
    await Promise.all(list.map((c, order) => db.categories.update(c.id, { order })))
  })
}

export async function setCategoryArchived(
  id: string,
  archived: boolean,
  db: GruzzoloDB = defaultDb,
): Promise<void> {
  await db.categories.update(id, { archived })
}

export async function countCategoryUsage(id: string, db: GruzzoloDB = defaultDb): Promise<number> {
  return db.transactions.where('categoryId').equals(id).count()
}

/**
 * Elimina una categoria. Se è usata da movimenti serve `moveTo`: una categoria
 * dello stesso tipo a cui riassegnarli, nella stessa transazione del database.
 */
export async function deleteCategory(
  id: string,
  moveTo?: string,
  db: GruzzoloDB = defaultDb,
): Promise<number> {
  return db.transaction('rw', db.categories, db.transactions, async () => {
    const existing = await db.categories.get(id)
    if (!existing) throw new CategoryError('not-found')
    const used = await db.transactions.where('categoryId').equals(id).count()
    if (used > 0) {
      const target = moveTo ? await db.categories.get(moveTo) : undefined
      if (!target || target.id === id || target.kind !== existing.kind) {
        throw new CategoryError(moveTo ? 'bad-target' : 'in-use')
      }
      await db.transactions
        .where('categoryId')
        .equals(id)
        .modify({ categoryId: target.id, updatedAt: Date.now() })
    }
    await db.categories.delete(id)
    return used
  })
}
