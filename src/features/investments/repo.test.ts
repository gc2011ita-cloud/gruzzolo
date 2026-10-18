import { afterEach, describe, expect, it } from 'vitest'
import { GruzzoloDB, newId } from '../../db/db'
import { position } from '../../lib/investments'
import {
  addEntry,
  addInvestment,
  deleteEntry,
  deleteInvestment,
  restoreEntry,
  updateEntry,
  updateInvestment,
} from './repo'

let db: GruzzoloDB
const fresh = () => (db = new GruzzoloDB(`test-${newId()}`))
afterEach(async () => {
  await db?.delete()
})

const base = { name: ' ETF Mondo ', kind: 'etf' as const, color: '#2563eb', note: '' }

describe('repository investimenti', () => {
  it('crea con versamento iniziale opzionale e ordine crescente', async () => {
    fresh()
    const a = await addInvestment(base, { amountCents: 100000, date: '2026-01-10', note: '' }, db)
    const b = await addInvestment({ ...base, name: 'Fondo pensione' }, undefined, db)
    expect((await db.investments.get(a))?.name).toBe('ETF Mondo')
    expect((await db.investments.get(b))?.order).toBe(1)
    const entries = await db.investmentEntries.where('investmentId').equals(a).toArray()
    expect(entries).toHaveLength(1)
    expect(position(entries).invested).toBe(100000)
    await expect(addInvestment({ ...base, name: ' ' }, undefined, db)).rejects.toThrow()
  })

  it('aggiunge, modifica, elimina e ripristina le operazioni', async () => {
    fresh()
    const id = await addInvestment(base, undefined, db)
    const dep = await addEntry(
      id,
      { type: 'deposit', amountCents: 50000, date: '2026-02-01', note: '' },
      db,
    )
    await addEntry(id, { type: 'valuation', amountCents: 0, date: '2026-03-01', note: '' }, db)
    await expect(
      addEntry(id, { type: 'deposit', amountCents: 0, date: '2026-03-01', note: '' }, db),
    ).rejects.toThrow('amount')
    await expect(
      addEntry('missing', { type: 'deposit', amountCents: 10, date: '2026-03-01', note: '' }, db),
    ).rejects.toThrow('not-found')

    await updateEntry(
      dep,
      { type: 'deposit', amountCents: 60000, date: '2026-02-02', note: 'bonus' },
      db,
    )
    expect(await db.investmentEntries.get(dep)).toMatchObject({ amountCents: 60000, note: 'bonus' })

    const removed = await deleteEntry(dep, db)
    expect(await db.investmentEntries.count()).toBe(1)
    await restoreEntry(removed!, db)
    expect(await db.investmentEntries.count()).toBe(2)
  })

  it('modifica i dati ed elimina con tutto lo storico', async () => {
    fresh()
    const id = await addInvestment(base, { amountCents: 1000, date: '2026-01-01', note: '' }, db)
    const other = await addInvestment(base, { amountCents: 2000, date: '2026-01-01', note: '' }, db)
    await updateInvestment(id, { ...base, name: 'ETF All World', kind: 'fund' }, db)
    expect(await db.investments.get(id)).toMatchObject({ name: 'ETF All World', kind: 'fund' })
    await deleteInvestment(id, db)
    expect(await db.investments.get(id)).toBeUndefined()
    expect(await db.investmentEntries.where('investmentId').equals(id).count()).toBe(0)
    expect(await db.investmentEntries.where('investmentId').equals(other).count()).toBe(1)
  })
})
