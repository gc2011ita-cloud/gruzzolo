import Papa from 'papaparse'
import type { Category, Cents, ISODate, Transaction, TransactionType } from '../models'
import { isISODate } from './dates'
import { foldText } from './filters'
import { centsToInput, parseAmount } from './money'
import { normalizeTags } from './tags'

/* ---------- Export ---------- */

const BOM = String.fromCharCode(0xfeff)

function cell(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function itDate(iso: ISODate): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/**
 * CSV compatibile con Excel in italiano: separatore ";", virgola decimale,
 * date gg/mm/aaaa, codifica UTF-8 con BOM (così Excel legge correttamente gli accenti).
 */
export function transactionsToCsv(
  transactions: readonly Transaction[],
  categories: ReadonlyMap<string, Category>,
): string {
  const header = ['Data', 'Tipo', 'Importo', 'Categoria', 'Tag', 'Nota']
  const rows = [...transactions]
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
    .map((t) => [
      itDate(t.date),
      t.type === 'income' ? 'Entrata' : 'Uscita',
      centsToInput(t.type === 'income' ? t.amountCents : -t.amountCents),
      categories.get(t.categoryId)?.name ?? '',
      t.tags.join(', '),
      t.note,
    ])
  return BOM + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n'
}

/* ---------- Import ---------- */

/** Legge un CSV riconoscendo da solo il separatore (";", "," o tabulazione). */
export function parseCsv(text: string): string[][] {
  const result = Papa.parse<string[]>(text.startsWith(BOM) ? text.slice(1) : text, {
    delimitersToGuess: [';', ',', '\t'],
    skipEmptyLines: 'greedy',
  })
  return result.data.map((r) => r.map((c) => c.trim()))
}

export type ImportField = 'date' | 'amount' | 'type' | 'category' | 'tags' | 'note'

/** Indice della colonna per ogni campo (-1 = non presente). */
export type ColumnMapping = Record<ImportField, number>

const fieldHints: Record<ImportField, string[]> = {
  date: ['data', 'date', 'giorno', 'valuta', 'contabile'],
  amount: ['importo', 'amount', 'valore', 'euro', 'eur', 'totale', 'somma'],
  type: ['tipo', 'type', 'segno', 'entrata/uscita'],
  category: ['categoria', 'category', 'cat'],
  tags: ['tag', 'tags', 'etichette', 'etichetta', 'sottocategoria'],
  note: ['nota', 'note', 'descrizione', 'description', 'causale', 'dettagli', 'memo'],
}

/** Prova a riconoscere le colonne dai nomi dell'intestazione. */
export function guessMapping(header: readonly string[]): ColumnMapping {
  const folded = header.map((h) => foldText(h))
  const used = new Set<number>()
  const mapping = {} as ColumnMapping
  for (const field of Object.keys(fieldHints) as ImportField[]) {
    const hints = fieldHints[field]
    let idx = folded.findIndex((h, i) => !used.has(i) && hints.includes(h))
    if (idx < 0) idx = folded.findIndex((h, i) => !used.has(i) && hints.some((k) => h.includes(k)))
    mapping[field] = idx
    if (idx >= 0) used.add(idx)
  }
  return mapping
}

/** Riconosce gg/mm/aaaa, gg-mm-aa, gg.mm.aaaa e aaaa-mm-gg. */
export function parseFlexibleDate(raw: string): ISODate | null {
  const s = raw.trim().split(/[ T]/)[0] ?? ''
  let y: number, m: number, d: number
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s)
  if (match) {
    y = +match[1]!
    m = +match[2]!
    d = +match[3]!
  } else {
    match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s)
    if (!match) return null
    d = +match[1]!
    m = +match[2]!
    y = +match[3]!
    if (y < 100) y += y >= 70 ? 1900 : 2000
  }
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return isISODate(iso) ? iso : null
}

/** Importo con segno: "-12,50", "−12,50", "12,50-", "(12,50)", "+1.234,00 €". */
export function parseSignedAmount(raw: string): Cents | null {
  let s = raw.replace(/[\s€]/g, '').replace(/[−–]/g, '-')
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (s.startsWith('-')) {
    negative = !negative
    s = s.slice(1)
  } else if (s.endsWith('-')) {
    negative = !negative
    s = s.slice(0, -1)
  } else if (s.startsWith('+')) s = s.slice(1)
  const cents = parseAmount(s)
  if (cents === null) return null
  return negative ? -cents : cents
}

function parseType(raw: string): TransactionType | null {
  const s = foldText(raw.trim())
  if (/^(uscit|spes|addebit|expense|debit|out|-)/.test(s)) return 'expense'
  if (/^(entrat|incass|accredit|income|credit|in$|\+)/.test(s)) return 'income'
  return null
}

export interface ImportOptions {
  createMissingCategories: boolean
  skipDuplicates: boolean
}

export interface ImportRow {
  line: number
  type: TransactionType
  amountCents: Cents
  date: ISODate
  /** Categoria esistente, oppure nome di una categoria da creare. */
  categoryId?: string
  newCategoryName?: string
  tags: string[]
  note: string
  duplicate: boolean
}

export interface ImportError {
  line: number
  reason: 'date' | 'amount' | 'zero'
}

export interface ImportPlan {
  rows: ImportRow[]
  errors: ImportError[]
  /** Categorie da creare, per tipo. */
  newCategories: { name: string; kind: TransactionType }[]
}

const fallbackCategory: Record<TransactionType, string> = {
  expense: 'exp-other',
  income: 'inc-other',
}

export function duplicateKey(t: Pick<Transaction, 'date' | 'type' | 'amountCents' | 'note'>) {
  return `${t.date}|${t.type}|${t.amountCents}|${foldText(t.note.trim())}`
}

/**
 * Trasforma le righe del CSV in movimenti pronti da salvare, senza toccare il database.
 * Senza colonna "tipo" il segno dell'importo decide: negativo = uscita.
 */
export function planImport(
  rows: readonly string[][],
  mapping: ColumnMapping,
  hasHeader: boolean,
  categories: readonly Category[],
  existing: readonly Pick<Transaction, 'date' | 'type' | 'amountCents' | 'note'>[],
  options: ImportOptions,
): ImportPlan {
  const byName = new Map(categories.map((c) => [`${c.kind}|${foldText(c.name)}`, c]))
  const seen = new Set(existing.map(duplicateKey))
  const newCategories = new Map<string, { name: string; kind: TransactionType }>()
  const plan: ImportPlan = { rows: [], errors: [], newCategories: [] }
  const get = (r: readonly string[], f: ImportField) =>
    mapping[f] >= 0 ? (r[mapping[f]] ?? '') : ''

  rows.forEach((r, i) => {
    if (hasHeader && i === 0) return
    const line = i + 1
    const date = parseFlexibleDate(get(r, 'date'))
    if (!date) return plan.errors.push({ line, reason: 'date' })
    const signed = parseSignedAmount(get(r, 'amount'))
    if (signed === null) return plan.errors.push({ line, reason: 'amount' })
    if (signed === 0) return plan.errors.push({ line, reason: 'zero' })

    const type = parseType(get(r, 'type')) ?? (signed < 0 ? 'expense' : 'income')
    const amountCents = Math.abs(signed)
    const note = get(r, 'note')
    const tags = normalizeTags(get(r, 'tags').split(/[,|#]/))

    const catName = get(r, 'category').trim()
    let categoryId: string | undefined
    let newCategoryName: string | undefined
    if (catName) {
      const found = byName.get(`${type}|${foldText(catName)}`)
      if (found) categoryId = found.id
      else if (options.createMissingCategories) {
        newCategoryName = catName
        newCategories.set(`${type}|${foldText(catName)}`, { name: catName, kind: type })
      } else categoryId = fallbackCategory[type]
    } else categoryId = fallbackCategory[type]

    const key = duplicateKey({ date, type, amountCents, note })
    const duplicate = options.skipDuplicates && seen.has(key)
    seen.add(key)
    plan.rows.push({
      line,
      type,
      amountCents,
      date,
      categoryId,
      newCategoryName,
      tags,
      note,
      duplicate,
    })
  })
  plan.newCategories = [...newCategories.values()]
  return plan
}
