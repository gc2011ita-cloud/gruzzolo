/** Data in formato ISO locale `yyyy-MM-dd` (nessun fuso orario). */
export type ISODate = string

/** Importo in centesimi di euro: sempre un intero, mai un float. */
export type Cents = number

export type TransactionType = 'expense' | 'income'

export interface Transaction {
  id: string
  type: TransactionType
  /** Sempre positivo: il segno dipende da `type`. */
  amountCents: Cents
  categoryId: string
  date: ISODate
  note: string
  /** Etichette libere, usate come sottocategorie personalizzate. */
  tags: string[]
  receiptId?: string
  createdAt: number
  updatedAt: number
}

export type CategoryKind = TransactionType

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  /** Nome di un'icona della mappa in `components/CategoryIcon`. */
  icon: string
  color: string
  order: number
  archived: boolean
}

export interface Receipt {
  id: string
  blob: Blob
  mimeType: string
  width: number
  height: number
  size: number
  createdAt: number
}

export type InvestmentKind = 'etf' | 'stock' | 'fund' | 'bond' | 'crypto' | 'pension' | 'other'

export interface Investment {
  id: string
  name: string
  kind: InvestmentKind
  note: string
  color: string
  order: number
  archived: boolean
  createdAt: number
}

/**
 * - deposit: soldi versati nell'investimento
 * - withdrawal: soldi ritirati
 * - valuation: valore di mercato complessivo alla data indicata
 */
export type InvestmentEntryType = 'deposit' | 'withdrawal' | 'valuation'

export interface InvestmentEntry {
  id: string
  investmentId: string
  type: InvestmentEntryType
  amountCents: Cents
  date: ISODate
  note: string
  createdAt: number
}

export type ThemePreference = 'auto' | 'light' | 'dark'

export interface PinConfig {
  hash: string
  salt: string
  iterations: number
}

export interface Settings {
  theme: ThemePreference
  accent: string
  /** Saldo di partenza da cui si sommano entrate e uscite. */
  initialBalanceCents: Cents
  backupReminderDays: number
  lastBackupAt: number | null
  autoLockMinutes: number
  pin: PinConfig | null
  installHintDismissedAt: number | null
}

export interface SettingRow<K extends keyof Settings = keyof Settings> {
  key: K
  value: Settings[K]
}
