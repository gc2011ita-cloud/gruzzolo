import { afterEach, describe, expect, it } from 'vitest'
import { GruzzoloDB, newId } from '../../db/db'
import { addTransaction } from '../transactions/repo'
import {
  addCategory,
  countCategoryUsage,
  deleteCategory,
  moveCategory,
  setCategoryArchived,
  updateCategory,
} from './repo'

let db: GruzzoloDB
const fresh = () => (db = new GruzzoloDB(`test-${newId()}`))
afterEach(async () => {
  await db?.delete()
})

const expenseNames = async () =>
  (await db.categories.where('kind').equals('expense').sortBy('order')).map((c) => c.name)

const spend = (categoryId: string) =>
  addTransaction(
    { type: 'expense', amountCents: 100, categoryId, date: '2026-10-01', note: '', tags: [] },
    undefined,
    db,
  )

describe('categorie', () => {
  it('aggiunge in fondo e rifiuta nomi vuoti o duplicati nello stesso tipo', async () => {
    fresh()
    await addCategory({ name: ' Palestra ', kind: 'expense', icon: 'dumbbell', color: '#000' }, db)
    expect((await expenseNames()).at(-1)).toBe('Palestra')
    await expect(
      addCategory({ name: 'palestra', kind: 'expense', icon: 'x', color: '#000' }, db),
    ).rejects.toThrow('name-taken')
    await expect(
      addCategory({ name: '  ', kind: 'expense', icon: 'x', color: '#000' }, db),
    ).rejects.toThrow('name-empty')
    // Lo stesso nome è ammesso tra le entrate.
    await addCategory({ name: 'Palestra', kind: 'income', icon: 'x', color: '#000' }, db)
  })

  it('modifica nome, icona e colore', async () => {
    fresh()
    await updateCategory('exp-home', { name: 'Casa e affitto', icon: 'sofa', color: '#111' }, db)
    expect(await db.categories.get('exp-home')).toMatchObject({
      name: 'Casa e affitto',
      icon: 'sofa',
      color: '#111',
      kind: 'expense',
    })
    await expect(
      updateCategory('exp-home', { name: 'Bollette', icon: 'x', color: '#000' }, db),
    ).rejects.toThrow('name-taken')
  })

  it('riordina senza uscire dai limiti', async () => {
    fresh()
    const before = await expenseNames()
    await moveCategory('exp-home', -1, db)
    const after = await expenseNames()
    expect(after.slice(0, 2)).toEqual([before[1], before[0]])
    await moveCategory(
      (await db.categories.where('kind').equals('expense').sortBy('order'))[0]!.id,
      -1,
      db,
    )
    expect(await expenseNames()).toEqual(after)
    const orders = (await db.categories.where('kind').equals('expense').toArray()).map(
      (c) => c.order,
    )
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('archivia senza toccare i movimenti', async () => {
    fresh()
    await spend('exp-car')
    await setCategoryArchived('exp-car', true, db)
    expect((await db.categories.get('exp-car'))?.archived).toBe(true)
    expect(await countCategoryUsage('exp-car', db)).toBe(1)
  })

  it('elimina: libera se inutilizzata, altrimenti sposta i movimenti', async () => {
    fresh()
    expect(await deleteCategory('exp-pets', undefined, db)).toBe(0)
    expect(await db.categories.get('exp-pets')).toBeUndefined()

    await spend('exp-car')
    await spend('exp-car')
    await expect(deleteCategory('exp-car', undefined, db)).rejects.toThrow('in-use')
    await expect(deleteCategory('exp-car', 'inc-salary', db)).rejects.toThrow('bad-target')
    expect(await deleteCategory('exp-car', 'exp-transport', db)).toBe(2)
    expect(await countCategoryUsage('exp-transport', db)).toBe(2)
    expect(await db.categories.get('exp-car')).toBeUndefined()
  })
})
