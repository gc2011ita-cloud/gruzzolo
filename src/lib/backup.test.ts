import { afterEach, describe, expect, it } from 'vitest'
import { GruzzoloDB, newId } from '../db/db'
import { getSettings, setSetting } from '../db/settings'
import { addEntry, addInvestment } from '../features/investments/repo'
import { addTransaction } from '../features/transactions/repo'
import {
  backupDue,
  BackupError,
  base64ToBlob,
  blobToBase64,
  createBackup,
  parseBackup,
  restoreBackup,
  summarize,
} from './backup'

const dbs: GruzzoloDB[] = []
const fresh = () => {
  const db = new GruzzoloDB(`test-${newId()}`)
  dbs.push(db)
  return db
}
afterEach(async () => {
  await Promise.all(dbs.splice(0).map((d) => d.delete()))
})

async function seed(db: GruzzoloDB) {
  await addTransaction(
    {
      type: 'expense',
      amountCents: 1250,
      categoryId: 'exp-dining',
      date: '2026-10-05',
      note: 'pizza',
      tags: ['amici'],
    },
    {
      blob: new Blob([new Uint8Array([255, 216, 255, 0, 1, 2])], { type: 'image/jpeg' }),
      mimeType: 'image/jpeg',
      width: 1,
      height: 1,
      size: 6,
    },
    db,
  )
  const inv = await addInvestment(
    { name: 'ETF', kind: 'etf', color: '#000', note: '' },
    { amountCents: 100000, date: '2026-01-01', note: '' },
    db,
  )
  await addEntry(inv, { type: 'valuation', amountCents: 110000, date: '2026-06-30', note: '' }, db)
  await setSetting('initialBalanceCents', 50000, db)
  await setSetting('pin', { hash: 'h', salt: 's', iterations: 1 }, db)
}

describe('base64', () => {
  it('andata e ritorno senza perdite', async () => {
    const bytes = new Uint8Array(70000).map((_, i) => i % 256)
    const b64 = await blobToBase64(new Blob([bytes]))
    const back = new Uint8Array(await base64ToBlob(b64, 'application/octet-stream').arrayBuffer())
    expect(back).toEqual(bytes)
  })
})

describe('backup e ripristino', () => {
  it('ripristina tutto in un database nuovo, scontrini compresi', async () => {
    const source = fresh()
    await seed(source)
    const backup = await createBackup({ includeReceipts: true }, source)
    const parsed = parseBackup(JSON.stringify(backup), source.verno)
    expect(summarize(parsed)).toMatchObject({ transactions: 1, investments: 1, receipts: 1 })

    const target = fresh()
    await setSetting('pin', { hash: 'locale', salt: 'x', iterations: 1 }, target)
    await restoreBackup(parsed, target)

    const [t] = await target.transactions.toArray()
    expect(t).toMatchObject({ amountCents: 1250, note: 'pizza', tags: ['amici'] })
    const receipt = await target.receipts.get(t!.receiptId!)
    expect(new Uint8Array(await receipt!.blob.arrayBuffer())).toEqual(
      new Uint8Array([255, 216, 255, 0, 1, 2]),
    )
    expect(await target.investmentEntries.count()).toBe(2)
    expect(await target.categories.count()).toBe(await source.categories.count())
    const settings = await getSettings(target)
    expect(settings.initialBalanceCents).toBe(50000)
    // Il PIN non viaggia nel backup: resta quello del dispositivo.
    expect(settings.pin?.hash).toBe('locale')
  })

  it('senza scontrini toglie i riferimenti alle immagini', async () => {
    const source = fresh()
    await seed(source)
    const backup = await createBackup({ includeReceipts: false }, source)
    expect(backup.data.receipts).toEqual([])
    expect(backup.data.transactions[0]?.receiptId).toBeUndefined()
    expect(backup.data.settings.some((s) => s.key === 'pin')).toBe(false)
  })

  it('il ripristino sostituisce i dati esistenti', async () => {
    const source = fresh()
    await seed(source)
    const backup = await createBackup({ includeReceipts: true }, source)
    const target = fresh()
    await addTransaction(
      {
        type: 'income',
        amountCents: 1,
        categoryId: 'inc-other',
        date: '2020-01-01',
        note: '',
        tags: [],
      },
      undefined,
      target,
    )
    await restoreBackup(backup, target)
    expect(await target.transactions.count()).toBe(1)
    expect((await target.transactions.toArray())[0]?.note).toBe('pizza')
  })

  it('rifiuta file non validi', () => {
    expect(() => parseBackup('non json')).toThrow(BackupError)
    expect(() => parseBackup('{"app":"altro","format":1}')).toThrow('not-gruzzolo')
    expect(() => parseBackup('{"app":"gruzzolo","format":99,"data":{}}')).toThrow('too-new')
    expect(() =>
      parseBackup('{"app":"gruzzolo","format":1,"schemaVersion":1,"data":{"transactions":[]}}', 1),
    ).toThrow('corrupt')
  })
})

describe('promemoria backup', () => {
  const day = 24 * 60 * 60 * 1000
  const now = 1_000 * day
  it('scatta dopo N giorni dall’ultimo backup o dal primo dato', () => {
    expect(backupDue(now - 15 * day, now - 100 * day, 14, now)).toBe(true)
    expect(backupDue(now - 3 * day, now - 100 * day, 14, now)).toBe(false)
    expect(backupDue(null, now - 20 * day, 14, now)).toBe(true)
    expect(backupDue(null, now - 2 * day, 14, now)).toBe(false)
    expect(backupDue(null, null, 14, now)).toBe(false)
    expect(backupDue(now - 400 * day, now - 500 * day, 0, now)).toBe(false)
  })
})
