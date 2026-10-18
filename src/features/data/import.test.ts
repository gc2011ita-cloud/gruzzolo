import { afterEach, describe, expect, it } from 'vitest'
import { GruzzoloDB, newId } from '../../db/db'
import { guessMapping, planImport } from '../../lib/csv'
import { applyImport } from './import'

let db: GruzzoloDB
afterEach(async () => {
  await db?.delete()
})

describe('applyImport', () => {
  it('crea le categorie nuove, salta i duplicati e salva i movimenti', async () => {
    db = new GruzzoloDB(`test-${newId()}`)
    const rows = [
      ['Data', 'Importo', 'Categoria', 'Descrizione'],
      ['01/10/2026', '-45,20', 'Palestra', 'Mensile'],
      ['02/10/2026', '-12', 'Ristoranti e bar', 'Pranzo'],
      ['03/10/2026', '-30', 'Palestra', 'Lezione'],
      ['02/10/2026', '-12', 'Ristoranti e bar', 'Pranzo'],
    ]
    const categories = await db.categories.toArray()
    const plan = planImport(rows, guessMapping(rows[0]!), true, categories, [], {
      createMissingCategories: true,
      skipDuplicates: true,
    })
    expect(await applyImport(plan, db)).toBe(3)

    const gym = (await db.categories.where('kind').equals('expense').toArray()).filter(
      (c) => c.name === 'Palestra',
    )
    expect(gym).toHaveLength(1)
    expect(await db.transactions.where('categoryId').equals(gym[0]!.id).count()).toBe(2)
    expect(await db.transactions.where('categoryId').equals('exp-dining').count()).toBe(1)
  })
})
