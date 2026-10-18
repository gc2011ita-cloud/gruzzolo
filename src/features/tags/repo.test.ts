import { afterEach, describe, expect, it } from 'vitest'
import { GruzzoloDB, newId } from '../../db/db'
import { addTransaction } from '../transactions/repo'
import { deleteTag, renameTag, tagStats } from './repo'

let db: GruzzoloDB
const fresh = () => (db = new GruzzoloDB(`test-${newId()}`))
afterEach(async () => {
  await db?.delete()
})

const add = (tags: string[], amountCents = 1000, type: 'expense' | 'income' = 'expense') =>
  addTransaction(
    {
      type,
      amountCents,
      categoryId: type === 'income' ? 'inc-other' : 'exp-other',
      date: '2026-10-01',
      note: '',
      tags,
    },
    undefined,
    db,
  )

const allTags = async () =>
  (await db.transactions.toArray()).map((t) => t.tags).sort((a, b) => a.length - b.length)

describe('tag', () => {
  it('calcola le statistiche per tag', async () => {
    fresh()
    await add(['vacanza', 'mare'], 5000)
    await add(['vacanza'], 2000)
    await add(['vacanza'], 1000, 'income')
    const stats = tagStats(await db.transactions.toArray())
    expect(stats[0]).toMatchObject({ tag: 'vacanza', count: 3, expense: 7000, income: 1000 })
    expect(stats[1]).toMatchObject({ tag: 'mare', count: 1 })
  })

  it('rinomina su tutti i movimenti', async () => {
    fresh()
    await add(['spesa'])
    await add(['spesa', 'famiglia'])
    expect(await renameTag('spesa', ' #Supermercato ', db)).toBe(2)
    expect(await allTags()).toEqual([['supermercato'], ['supermercato', 'famiglia']])
  })

  it('unisce due tag senza duplicati sullo stesso movimento', async () => {
    fresh()
    await add(['bar', 'caffè'])
    await add(['bar'])
    await renameTag('bar', 'caffè', db)
    expect(await allTags()).toEqual([['caffè'], ['caffè']])
  })

  it('elimina il tag lasciando i movimenti', async () => {
    fresh()
    await add(['prova', 'casa'])
    await add(['prova'])
    expect(await deleteTag('prova', db)).toBe(2)
    expect(await db.transactions.count()).toBe(2)
    expect(await allTags()).toEqual([[], ['casa']])
  })
})
