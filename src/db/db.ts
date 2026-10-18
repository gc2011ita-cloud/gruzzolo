import Dexie, { type EntityTable } from 'dexie'
import type {
  Category,
  Investment,
  InvestmentEntry,
  Receipt,
  SettingRow,
  Transaction,
} from '../models'
import { applyMigrations } from './migrations'

export class GruzzoloDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>
  categories!: EntityTable<Category, 'id'>
  receipts!: EntityTable<Receipt, 'id'>
  investments!: EntityTable<Investment, 'id'>
  investmentEntries!: EntityTable<InvestmentEntry, 'id'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'gruzzolo') {
    super(name)
    applyMigrations(this)
  }
}

export const db = new GruzzoloDB()

export function newId(): string {
  return crypto.randomUUID()
}
