import { db as defaultDb, type GruzzoloDB } from '../db/db'
import type {
  Category,
  Investment,
  InvestmentEntry,
  Receipt,
  SettingRow,
  Settings,
  Transaction,
} from '../models'

export const BACKUP_APP = 'gruzzolo'
export const BACKUP_FORMAT = 1

/** Impostazioni che non viaggiano nel backup: il PIN resta legato al dispositivo. */
const LOCAL_ONLY_SETTINGS: (keyof Settings)[] = ['pin', 'lastBackupAt', 'installHintDismissedAt']

export interface SerializedReceipt extends Omit<Receipt, 'blob'> {
  /** Immagine in base64. */
  data: string
}

export interface BackupFile {
  app: typeof BACKUP_APP
  format: number
  schemaVersion: number
  exportedAt: string
  includesReceipts: boolean
  data: {
    transactions: Transaction[]
    categories: Category[]
    investments: Investment[]
    investmentEntries: InvestmentEntry[]
    settings: SettingRow[]
    receipts: SerializedReceipt[]
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

export async function createBackup(
  options: { includeReceipts: boolean },
  db: GruzzoloDB = defaultDb,
): Promise<BackupFile> {
  return db.transaction('r', db.tables, async () => {
    const [transactions, categories, investments, investmentEntries, settings] = await Promise.all([
      db.transactions.toArray(),
      db.categories.toArray(),
      db.investments.toArray(),
      db.investmentEntries.toArray(),
      db.settings.toArray(),
    ])
    const receipts: SerializedReceipt[] = []
    if (options.includeReceipts) {
      for (const r of await db.receipts.toArray()) {
        const { blob, ...meta } = r
        receipts.push({ ...meta, data: await blobToBase64(blob) })
      }
    }
    return {
      app: BACKUP_APP,
      format: BACKUP_FORMAT,
      schemaVersion: db.verno,
      exportedAt: new Date().toISOString(),
      includesReceipts: options.includeReceipts,
      data: {
        // Senza scontrini, i movimenti non devono puntare a immagini assenti.
        transactions: options.includeReceipts
          ? transactions
          : transactions.map(({ receiptId: _r, ...t }) => t),
        categories,
        investments,
        investmentEntries,
        settings: settings.filter((s) => !LOCAL_ONLY_SETTINGS.includes(s.key)),
        receipts,
      },
    }
  })
}

export class BackupError extends Error {
  constructor(public code: 'not-json' | 'not-gruzzolo' | 'too-new' | 'corrupt') {
    super(code)
  }
}

const isArray = (v: unknown): v is unknown[] => Array.isArray(v)

/** Controlla che il file sia un backup di Gruzzolo leggibile da questa versione. */
export function parseBackup(text: string, currentSchema: number = defaultDb.verno): BackupFile {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new BackupError('not-json')
  }
  const b = json as Partial<BackupFile>
  if (!b || b.app !== BACKUP_APP || typeof b.format !== 'number') {
    throw new BackupError('not-gruzzolo')
  }
  if (b.format > BACKUP_FORMAT || (b.schemaVersion ?? 0) > currentSchema) {
    throw new BackupError('too-new')
  }
  const d = b.data
  if (
    !d ||
    !isArray(d.transactions) ||
    !isArray(d.categories) ||
    !isArray(d.investments) ||
    !isArray(d.investmentEntries) ||
    !isArray(d.settings) ||
    !isArray(d.receipts)
  ) {
    throw new BackupError('corrupt')
  }
  return b as BackupFile
}

export interface BackupSummary {
  transactions: number
  categories: number
  investments: number
  receipts: number
  exportedAt: string
}

export function summarize(b: BackupFile): BackupSummary {
  return {
    transactions: b.data.transactions.length,
    categories: b.data.categories.length,
    investments: b.data.investments.length,
    receipts: b.data.receipts.length,
    exportedAt: b.exportedAt,
  }
}

/**
 * Sostituisce tutti i dati con quelli del backup, in un'unica transazione:
 * se qualcosa va storto non cambia nulla. PIN e preferenze locali restano invariati.
 */
export async function restoreBackup(b: BackupFile, db: GruzzoloDB = defaultDb): Promise<void> {
  const receipts: Receipt[] = b.data.receipts.map(({ data, ...meta }) => ({
    ...meta,
    blob: base64ToBlob(data, meta.mimeType),
  }))
  const receiptIds = new Set(receipts.map((r) => r.id))
  const transactions = b.data.transactions.map((t) =>
    t.receiptId && !receiptIds.has(t.receiptId) ? { ...t, receiptId: undefined } : t,
  )
  const keep = await db.settings.where('key').anyOf(LOCAL_ONLY_SETTINGS).toArray()

  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await db.transactions.bulkAdd(transactions)
    await db.categories.bulkAdd(b.data.categories)
    await db.investments.bulkAdd(b.data.investments)
    await db.investmentEntries.bulkAdd(b.data.investmentEntries)
    await db.receipts.bulkAdd(receipts)
    await db.settings.bulkPut([
      ...b.data.settings.filter((s) => !LOCAL_ONLY_SETTINGS.includes(s.key)),
      ...keep,
    ])
  })
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `gruzzolo-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

/** true se è il momento di ricordare un backup. `days` = 0 disattiva il promemoria. */
export function backupDue(
  lastBackupAt: number | null,
  oldestDataAt: number | null,
  days: number,
  now = Date.now(),
): boolean {
  if (days <= 0 || oldestDataAt === null) return false
  const reference = lastBackupAt ?? oldestDataAt
  return now - reference >= days * 24 * 60 * 60 * 1000
}
