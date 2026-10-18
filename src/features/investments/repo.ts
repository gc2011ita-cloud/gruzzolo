import { db as defaultDb, newId, type GruzzoloDB } from '../../db/db'
import type { Investment, InvestmentEntry } from '../../models'

export type InvestmentInput = Pick<Investment, 'name' | 'kind' | 'color' | 'note'>
export type EntryInput = Pick<InvestmentEntry, 'type' | 'amountCents' | 'date' | 'note'>

function cleanName(name: string): string {
  const clean = name.trim()
  if (!clean) throw new Error('name-empty')
  return clean
}

function validateEntry(e: EntryInput): void {
  const min = e.type === 'valuation' ? 0 : 1 // un valore di 0 € è ammesso (investimento azzerato)
  if (!Number.isSafeInteger(e.amountCents) || e.amountCents < min) throw new Error('amount')
}

export async function addInvestment(
  input: InvestmentInput,
  firstDeposit?: Omit<EntryInput, 'type'>,
  db: GruzzoloDB = defaultDb,
): Promise<string> {
  const name = cleanName(input.name)
  if (firstDeposit) validateEntry({ ...firstDeposit, type: 'deposit' })
  return db.transaction('rw', db.investments, db.investmentEntries, async () => {
    const last = await db.investments.orderBy('order').last()
    const id = newId()
    const now = Date.now()
    await db.investments.add({
      ...input,
      name,
      note: input.note.trim(),
      id,
      order: (last?.order ?? -1) + 1,
      archived: false,
      createdAt: now,
    })
    if (firstDeposit) {
      await db.investmentEntries.add({
        ...firstDeposit,
        type: 'deposit',
        note: firstDeposit.note.trim(),
        id: newId(),
        investmentId: id,
        createdAt: now,
      })
    }
    return id
  })
}

export async function updateInvestment(
  id: string,
  input: InvestmentInput,
  db: GruzzoloDB = defaultDb,
): Promise<void> {
  await db.investments.update(id, {
    ...input,
    name: cleanName(input.name),
    note: input.note.trim(),
  })
}

export async function setInvestmentArchived(
  id: string,
  archived: boolean,
  db: GruzzoloDB = defaultDb,
): Promise<void> {
  await db.investments.update(id, { archived })
}

/** Elimina l'investimento con tutto il suo storico. */
export async function deleteInvestment(id: string, db: GruzzoloDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.investments, db.investmentEntries, async () => {
    await db.investmentEntries.where('investmentId').equals(id).delete()
    await db.investments.delete(id)
  })
}

export async function addEntry(
  investmentId: string,
  input: EntryInput,
  db: GruzzoloDB = defaultDb,
): Promise<string> {
  validateEntry(input)
  const id = newId()
  await db.transaction('rw', db.investments, db.investmentEntries, async () => {
    if (!(await db.investments.get(investmentId))) throw new Error('not-found')
    await db.investmentEntries.add({
      ...input,
      note: input.note.trim(),
      id,
      investmentId,
      createdAt: Date.now(),
    })
  })
  return id
}

export async function updateEntry(
  id: string,
  input: EntryInput,
  db: GruzzoloDB = defaultDb,
): Promise<void> {
  validateEntry(input)
  const changed = await db.investmentEntries.update(id, { ...input, note: input.note.trim() })
  if (!changed && !(await db.investmentEntries.get(id))) throw new Error('not-found')
}

export async function deleteEntry(
  id: string,
  db: GruzzoloDB = defaultDb,
): Promise<InvestmentEntry | undefined> {
  return db.transaction('rw', db.investmentEntries, async () => {
    const entry = await db.investmentEntries.get(id)
    if (entry) await db.investmentEntries.delete(id)
    return entry
  })
}

export async function restoreEntry(entry: InvestmentEntry, db: GruzzoloDB = defaultDb) {
  await db.investmentEntries.put(entry)
}
