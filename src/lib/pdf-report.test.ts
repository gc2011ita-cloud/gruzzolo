import { describe, expect, it } from 'vitest'
import { defaultCategories } from '../db/seed'
import type { Transaction } from '../models'
import { buildReport } from './pdf-report'

describe('report PDF', () => {
  it('genera un PDF valido anche su più pagine', async () => {
    const categories = new Map(defaultCategories().map((c) => [c.id, c]))
    const transactions: Transaction[] = Array.from({ length: 120 }, (_, i) => ({
      id: String(i),
      type: i % 10 === 0 ? 'income' : 'expense',
      amountCents: 1000 + i * 37,
      categoryId: i % 10 === 0 ? 'inc-salary' : 'exp-dining',
      date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
      note: 'Caffè – più · città €',
      tags: ['prova'],
      createdAt: i,
      updatedAt: i,
    }))
    const blob = buildReport({
      title: 'Gruzzolo – Report',
      periodLabel: 'Ottobre 2026',
      range: { from: '2026-10-01', to: '2026-10-31' },
      transactions,
      categories,
      initialBalance: 100000,
    })
    const head = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5))
    expect(head).toBe('%PDF-')
    expect(blob.size).toBeGreaterThan(5000)
  })
})
