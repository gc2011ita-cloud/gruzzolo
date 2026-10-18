import type Dexie from 'dexie'
import { defaultCategories } from './seed'

/**
 * Elenco lineare delle versioni dello schema.
 * Regola: non modificare mai una versione già rilasciata. Per cambiare lo schema
 * (anche per un nuovo modulo in src/features) aggiungere `db.version(n + 1)` in fondo,
 * con eventuale `.upgrade(tx => ...)` per trasformare i dati esistenti.
 *
 * Nota: IndexedDB non indicizza i booleani, quindi i campi `archived` non sono indici.
 */
export function applyMigrations(db: Dexie): void {
  db.version(1).stores({
    transactions: 'id, date, type, categoryId, *tags, [type+date], updatedAt',
    categories: 'id, kind, order',
    receipts: 'id',
    investments: 'id, order',
    investmentEntries: 'id, investmentId, date, [investmentId+date]',
    settings: 'key',
  })

  // Eseguito solo alla creazione del database: il seed non può duplicarsi.
  db.on('populate', (tx) => {
    void tx.table('categories').bulkAdd(defaultCategories())
  })
}
