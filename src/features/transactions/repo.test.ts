import { afterEach, describe, expect, it } from 'vitest'
import { GruzzoloDB, newId } from '../../db/db'
import {
  addTransaction,
  deleteTransaction,
  restoreTransaction,
  updateTransaction,
  type TransactionInput,
} from './repo'

let db: GruzzoloDB

function fresh(): GruzzoloDB {
  db = new GruzzoloDB(`test-${newId()}`)
  return db
}

afterEach(async () => {
  await db?.delete()
})

const input: TransactionInput = {
  type: 'expense',
  amountCents: 1250,
  categoryId: 'exp-dining',
  date: '2026-10-19',
  note: '  pranzo  ',
  tags: ['#Lavoro', 'lavoro', 'Milano'],
}

const receipt = () => ({
  blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
  mimeType: 'image/jpeg',
  width: 10,
  height: 10,
  size: 4,
})

describe('repository movimenti', () => {
  it('salva con tag e note normalizzati', async () => {
    fresh()
    const id = await addTransaction(input, undefined, db)
    const t = await db.transactions.get(id)
    expect(t?.tags).toEqual(['lavoro', 'milano'])
    expect(t?.note).toBe('pranzo')
    expect(t?.receiptId).toBeUndefined()
  })

  it('accetta date passate e future', async () => {
    fresh()
    await addTransaction({ ...input, date: '2019-03-01' }, undefined, db)
    await addTransaction({ ...input, date: '2030-12-31' }, undefined, db)
    expect(await db.transactions.orderBy('date').keys()).toEqual(['2019-03-01', '2030-12-31'])
  })

  it('rifiuta importi non validi', async () => {
    fresh()
    await expect(addTransaction({ ...input, amountCents: 0 }, undefined, db)).rejects.toThrow()
    await expect(addTransaction({ ...input, amountCents: 1.5 }, undefined, db)).rejects.toThrow()
  })

  it('gestisce lo scontrino in aggiunta, sostituzione e rimozione', async () => {
    fresh()
    const id = await addTransaction(input, receipt(), db)
    const first = (await db.transactions.get(id))?.receiptId
    expect(first).toBeDefined()

    await updateTransaction(id, input, undefined, db) // lascia invariato
    expect((await db.transactions.get(id))?.receiptId).toBe(first)

    await updateTransaction(id, input, receipt(), db) // sostituisce
    const second = (await db.transactions.get(id))?.receiptId
    expect(second).not.toBe(first)
    expect(await db.receipts.count()).toBe(1)

    await updateTransaction(id, input, null, db) // rimuove
    expect((await db.transactions.get(id))?.receiptId).toBeUndefined()
    expect(await db.receipts.count()).toBe(0)
  })

  it('elimina e ripristina con annulla, scontrino compreso', async () => {
    fresh()
    const id = await addTransaction(input, receipt(), db)
    const before = await db.transactions.get(id)
    const deleted = await deleteTransaction(id, db)
    expect(await db.transactions.count()).toBe(0)
    expect(await db.receipts.count()).toBe(0)

    await restoreTransaction(deleted!, db)
    expect(await db.transactions.get(id)).toEqual(before)
    expect(await db.receipts.count()).toBe(1)
  })
})
