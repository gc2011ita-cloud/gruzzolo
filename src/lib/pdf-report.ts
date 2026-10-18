import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Category, Cents, Transaction } from '../models'
import { balanceAt, totals } from './balances'
import { formatDate, isInRange, todayISO, type DateRange } from './dates'
import { formatCents } from './money'
import { categoryBreakdown } from './stats'

/** I font standard del PDF non hanno gli spazi speciali usati da Intl: li sostituiamo. */
const pdfText = (s: string) => s.replace(/\s/g, ' ')
const money = (c: Cents, signed = false) => pdfText(formatCents(c, { signed }))

export interface ReportInput {
  title: string
  periodLabel: string
  range: DateRange
  transactions: readonly Transaction[]
  categories: ReadonlyMap<string, Category>
  initialBalance: Cents
}

const ACCENT: [number, number, number] = [15, 118, 110]
const right = (content: string) => ({ content, styles: { halign: 'right' as const } })

/** Report del periodo: riepilogo, uscite ed entrate per categoria, elenco movimenti. */
export function buildReport(input: ReportInput): Blob {
  const { range, transactions, categories } = input
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(pdfText(input.title), margin, 56)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(90)
  doc.text(
    pdfText(
      `${input.periodLabel} · ${formatDate(range.from, 'd MMM yyyy')} – ${formatDate(range.to, 'd MMM yyyy')}`,
    ),
    margin,
    74,
  )
  doc.setTextColor(0)

  const sum = totals(transactions, range)
  const end = balanceAt(transactions, range.to, input.initialBalance)

  autoTable(doc, {
    startY: 92,
    theme: 'plain',
    margin: { left: margin, right: margin },
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    body: [
      ['Entrate', money(sum.income)],
      ['Uscite', money(sum.expense)],
      ['Risparmio', money(sum.net, true)],
      [`Saldo al ${formatDate(range.to, 'd MMM yyyy')}`, money(end)],
    ],
  })

  const section = (title: string, type: 'expense' | 'income') => {
    const { slices, total } = categoryBreakdown(transactions, range, type, categories, 1000)
    if (total === 0) return
    autoTable(doc, {
      startY: lastY(doc) + 18,
      margin: { left: margin, right: margin },
      head: [[title, right('Importo'), right('%')]],
      body: slices.map((s) => [
        pdfText(s.name),
        money(s.amount),
        pdfText(s.share.toLocaleString('it-IT', { style: 'percent', maximumFractionDigits: 1 })),
      ]),
      foot: [['Totale', right(money(total)), right('100%')]],
      headStyles: { fillColor: ACCENT },
      footStyles: { fillColor: [235, 235, 240], textColor: 20 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', cellWidth: 60 } },
      styles: { fontSize: 10 },
    })
  }
  section('Uscite per categoria', 'expense')
  section('Entrate per categoria', 'income')

  const inPeriod = transactions
    .filter((t) => isInRange(t.date, range))
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))

  if (inPeriod.length > 0) {
    autoTable(doc, {
      startY: lastY(doc) + 18,
      margin: { left: margin, right: margin },
      head: [['Data', 'Categoria', 'Dettagli', right('Importo')]],
      body: inPeriod.map((t) => [
        formatDate(t.date, 'dd/MM/yyyy'),
        pdfText(categories.get(t.categoryId)?.name ?? ''),
        pdfText([t.note, t.tags.map((x) => `#${x}`).join(' ')].filter(Boolean).join(' · ')),
        money(t.type === 'income' ? t.amountCents : -t.amountCents, true),
      ]),
      headStyles: { fillColor: ACCENT },
      columnStyles: { 0: { cellWidth: 68 }, 3: { halign: 'right', cellWidth: 80 } },
      styles: { fontSize: 9 },
    })
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(
      `Gruzzolo · generato il ${formatDate(todayISO(), 'd MMM yyyy')} · pagina ${i} di ${pages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' },
    )
  }

  return doc.output('blob')
}

function lastY(doc: jsPDF): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 92
}
