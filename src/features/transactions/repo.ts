import { db as defaultDb, newId, type GruzzoloDB } from '../../db/db'
import type { Receipt, Transaction } from '../../models'
import { normalizeTags } from '../../lib/tags'

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'receiptId'>

/** Foto dello scontrino da associare: Blob nuovo, `null` per rimuoverla, `undefined` per lasciarla. */
export type ReceiptChange = Omit<Receipt, 'id' | 'createdAt'> | null | undefined

function validate(input: TransactionInput): void {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Importo non valido')
  }
  if (!input.categoryId) throw new Error('Categoria mancante')
}

export async function addTransaction(
  input: TransactionInput,
  receipt?: ReceiptChange,
  db: GruzzoloDB = defaultDb,
): Promise<string> {
  validate(input)
  const now = Date.now()
  const id = newId()
  await db.transaction('rw', db.transactions, db.receipts, async () => {
    let receiptId: string | undefined
    if (receipt) {
      receiptId = newId()
      await db.receipts.add({ ...receipt, id: receiptId, createdAt: now })
    }
    await db.transactions.add({
      ...input,
      tags: normalizeTags(input.tags),
      note: input.note.trim(),
      id,
      receiptId,
      createdAt: now,
      updatedAt: now,
    })
  })
  return id
}

export async function updateTransaction(
  id: string,
  input: TransactionInput,
  receipt?: ReceiptChange,
  db: GruzzoloDB = defaultDb,
): Promise<void> {
  validate(input)
  await db.transaction('rw', db.transactions, db.receipts, async () => {
    const existing = await db.transactions.get(id)
    if (!existing) throw new Error('Movimento non trovato')
    let receiptId = existing.receiptId
    if (receipt !== undefined) {
      if (existing.receiptId) await db.receipts.delete(existing.receiptId)
      receiptId = undefined
      if (receipt) {
        receiptId = newId()
        await db.receipts.add({ ...receipt, id: receiptId, createdAt: Date.now() })
      }
    }
    await db.transactions.put({
      ...existing,
      ...input,
      tags: normalizeTags(input.tags),
      note: input.note.trim(),
      receiptId,
      updatedAt: Date.now(),
    })
  })
}

export interface DeletedTransaction {
  transaction: Transaction
  receipt?: Receipt
}

/** Elimina e restituisce quanto serve per annullare l'operazione. */
export async function deleteTransaction(
  id: string,
  db: GruzzoloDB = defaultDb,
): Promise<DeletedTransaction | undefined> {
  return db.transaction('rw', db.transactions, db.receipts, async () => {
    const transaction = await db.transactions.get(id)
    if (!transaction) return undefined
    const receipt = transaction.receiptId ? await db.receipts.get(transaction.receiptId) : undefined
    await db.transactions.delete(id)
    if (receipt) await db.receipts.delete(receipt.id)
    return { transaction, receipt }
  })
}

export async function restoreTransaction(
  deleted: DeletedTransaction,
  db: GruzzoloDB = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.transactions, db.receipts, async () => {
    if (deleted.receipt) await db.receipts.put(deleted.receipt)
    await db.transactions.put(deleted.transaction)
  })
}
