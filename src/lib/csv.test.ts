import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '../models'
import {
  guessMapping,
  parseCsv,
  parseFlexibleDate,
  parseSignedAmount,
  planImport,
  transactionsToCsv,
  type ImportOptions,
} from './csv'

const cat = (id: string, name: string, kind: Category['kind'] = 'expense'): Category => ({
  id,
  name,
  kind,
  icon: 'more',
  color: '#000',
  order: 0,
  archived: false,
})

const categories = [
  cat('exp-dining', 'Ristoranti e bar'),
  cat('exp-other', 'Altro'),
  cat('inc-salary', 'Stipendio', 'income'),
  cat('inc-other', 'Altro', 'income'),
]
const catMap = new Map(categories.map((c) => [c.id, c]))

const tx = (p: Partial<Transaction>): Transaction => ({
  id: 'x',
  type: 'expense',
  amountCents: 1250,
  categoryId: 'exp-dining',
  date: '2026-10-05',
  note: '',
  tags: [],
  createdAt: 1,
  updatedAt: 1,
  ...p,
})

describe('export CSV', () => {
  it('formato Excel italiano: BOM, ";", virgola decimale, date gg/mm/aaaa', () => {
    const csv = transactionsToCsv(
      [
        tx({ note: 'Pizza; birra "media"', tags: ['amici', 'sabato'], createdAt: 2 }),
        tx({ type: 'income', amountCents: 185000, categoryId: 'inc-salary', date: '2026-10-01' }),
      ],
      catMap,
    )
    expect(csv.startsWith(String.fromCharCode(0xfeff))).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Data;Tipo;Importo;Categoria;Tag;Nota',
      '01/10/2026;Entrata;1850,00;Stipendio;;',
      '05/10/2026;Uscita;-12,50;Ristoranti e bar;amici, sabato;"Pizza; birra ""media"""',
      '',
    ])
  })

  it('il CSV esportato si rilegge e si reimporta identico', () => {
    const original = [
      tx({ note: 'Pizza; birra "media"', tags: ['amici'] }),
      tx({ type: 'income', amountCents: 185000, categoryId: 'inc-salary', date: '2026-10-01' }),
    ]
    const rows = parseCsv(transactionsToCsv(original, catMap))
    const plan = planImport(rows, guessMapping(rows[0]!), true, categories, [], {
      createMissingCategories: false,
      skipDuplicates: false,
    })
    expect(plan.errors).toEqual([])
    expect(
      plan.rows.map((r) => [r.date, r.type, r.amountCents, r.categoryId, r.tags, r.note]),
    ).toEqual([
      ['2026-10-01', 'income', 185000, 'inc-salary', [], ''],
      ['2026-10-05', 'expense', 1250, 'exp-dining', ['amici'], 'Pizza; birra "media"'],
    ])
  })
})

describe('parsing', () => {
  it('riconosce il separatore', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
    expect(parseCsv('a;b\r\n1,5;2\r\n\r\n')).toEqual([
      ['a', 'b'],
      ['1,5', '2'],
    ])
  })

  it.each([
    ['05/10/2026', '2026-10-05'],
    ['5/1/26', '2026-01-05'],
    ['05-10-2026', '2026-10-05'],
    ['05.10.2026', '2026-10-05'],
    ['2026-10-05', '2026-10-05'],
    ['2026-10-05T10:00:00', '2026-10-05'],
    ['31/02/2026', null],
    ['ieri', null],
  ])('data %s', (input, expected) => {
    expect(parseFlexibleDate(input)).toBe(expected)
  })

  it.each([
    ['-12,50', -1250],
    ['−12,50', -1250],
    ['12,50-', -1250],
    ['(12,50)', -1250],
    ['+1.234,00 €', 123400],
    ['1,234.56', 123456],
    ['abc', null],
  ])('importo %s', (input, expected) => {
    expect(parseSignedAmount(input)).toBe(expected)
  })

  it('indovina le colonne da intestazioni comuni', () => {
    expect(guessMapping(['Data operazione', 'Descrizione', 'Importo (€)', 'Categoria'])).toEqual({
      date: 0,
      amount: 2,
      type: -1,
      category: 3,
      tags: -1,
      note: 1,
    })
  })
})

describe('planImport', () => {
  const opts: ImportOptions = { createMissingCategories: true, skipDuplicates: true }
  const rows = [
    ['Data', 'Importo', 'Tipo', 'Categoria', 'Tag', 'Descrizione'],
    ['01/10/2026', '1850', 'Entrata', 'stipendio', '', 'Ottobre'],
    ['03/10/2026', '-45,20', '', 'Palestra', 'sport, #abbonamento', 'Mensile'],
    ['04/10/2026', '30', 'uscita', '', '', 'Regalo'],
    ['xx', '10', '', '', '', ''],
    ['05/10/2026', 'dieci', '', '', '', ''],
    ['06/10/2026', '0', '', '', '', ''],
    ['01/10/2026', '1850', 'Entrata', 'stipendio', '', 'Ottobre'],
  ]
  const mapping = guessMapping(rows[0]!)

  it('converte, crea categorie mancanti e segnala errori e duplicati', () => {
    const existing = [
      { date: '2026-10-04', type: 'expense' as const, amountCents: 3000, note: 'regalo' },
    ]
    const plan = planImport(rows, mapping, true, categories, existing, opts)
    expect(plan.errors).toEqual([
      { line: 5, reason: 'date' },
      { line: 6, reason: 'amount' },
      { line: 7, reason: 'zero' },
    ])
    expect(plan.newCategories).toEqual([{ name: 'Palestra', kind: 'expense' }])
    const [salary, gym, gift, again] = plan.rows
    expect(salary).toMatchObject({ type: 'income', amountCents: 185000, categoryId: 'inc-salary' })
    expect(gym).toMatchObject({
      type: 'expense',
      amountCents: 4520,
      newCategoryName: 'Palestra',
      tags: ['sport', 'abbonamento'],
    })
    expect(gift).toMatchObject({ type: 'expense', categoryId: 'exp-other', duplicate: true })
    expect(again?.duplicate).toBe(true) // ripetuto nello stesso file
  })

  it('senza creare categorie usa "Altro"', () => {
    const plan = planImport(rows, mapping, true, categories, [], {
      ...opts,
      createMissingCategories: false,
    })
    expect(plan.newCategories).toEqual([])
    expect(plan.rows[1]?.categoryId).toBe('exp-other')
  })
})
