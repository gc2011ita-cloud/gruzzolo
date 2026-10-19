import { afterEach, describe, expect, it } from 'vitest'
import { GruzzoloDB, newId } from './db'
import { countByCategory, listTags } from './queries'
import { defaultCategories } from './seed'
import { defaultSettings, getSettings, setSetting } from './settings'

let current: GruzzoloDB | undefined

function freshDb(): GruzzoloDB {
  current = new GruzzoloDB(`test-${newId()}`)
  return current
}

afterEach(async () => {
  await current?.delete()
})

describe('database', () => {
  it('crea le categorie predefinite alla prima apertura', async () => {
    const db = freshDb()
    const cats = await db.categories.toArray()
    expect(cats).toHaveLength(defaultCategories().length)
    expect(cats.filter((c) => c.kind === 'expense').length).toBeGreaterThan(5)
    expect(cats.filter((c) => c.kind === 'income').length).toBeGreaterThan(3)
  })

  it('riaprendo il database il seed non si duplica', async () => {
    const db = freshDb()
    await db.open()
    db.close()
    const again = new GruzzoloDB(db.name)
    expect(await again.categories.count()).toBe(defaultCategories().length)
    again.close()
  })

  it('cerca i movimenti per tag e per intervallo di date', async () => {
    const db = freshDb()
    const base = { note: '', createdAt: 0, updatedAt: 0, categoryId: 'exp-dining' }
    await db.transactions.bulkAdd([
      {
        ...base,
        id: newId(),
        type: 'expense',
        amountCents: 1200,
        date: '2026-10-02',
        tags: ['pizza'],
      },
      {
        ...base,
        id: newId(),
        type: 'expense',
        amountCents: 800,
        date: '2026-10-10',
        tags: ['caffè', 'lavoro'],
      },
      { ...base, id: newId(), type: 'income', amountCents: 5000, date: '2026-11-01', tags: [] },
    ])
    expect(await db.transactions.where('tags').equals('lavoro').count()).toBe(1)
    expect(
      await db.transactions.where('date').between('2026-10-01', '2026-10-31', true, true).count(),
    ).toBe(2)
    expect(await db.transactions.orderBy('tags').uniqueKeys()).toEqual(['caffè', 'lavoro', 'pizza'])
  })
})

describe('impostazioni', () => {
  it('restituisce i valori predefiniti e salva le modifiche', async () => {
    const db = freshDb()
    expect(await getSettings(db)).toEqual(defaultSettings)
    await setSetting('initialBalanceCents', 150000, db)
    await setSetting('theme', 'dark', db)
    const s = await getSettings(db)
    expect(s.initialBalanceCents).toBe(150000)
    expect(s.theme).toBe('dark')
    expect(s.accent).toBe(defaultSettings.accent)
  })
})

describe('letture aggregate', () => {
  it('elenca i tag e conta i movimenti per categoria senza cursori sugli indici', async () => {
    const db = freshDb()
    const base = {
      note: '',
      createdAt: 0,
      updatedAt: 0,
      type: 'expense' as const,
      date: '2026-10-01',
    }
    await db.transactions.bulkAdd([
      { ...base, id: newId(), amountCents: 1, categoryId: 'exp-dining', tags: ['pizza', 'amici'] },
      { ...base, id: newId(), amountCents: 2, categoryId: 'exp-dining', tags: ['caffè'] },
      { ...base, id: newId(), amountCents: 3, categoryId: 'exp-home', tags: ['amici'] },
    ])
    expect(await listTags(db)).toEqual(['amici', 'caffè', 'pizza'])
    expect(Object.fromEntries(await countByCategory(db))).toEqual({
      'exp-dining': 2,
      'exp-home': 1,
    })
  })
})
