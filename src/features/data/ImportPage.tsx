import { useLiveQuery } from 'dexie-react-hooks'
import { FileUp } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SubpageHeader } from '../../components/SubpageHeader'
import { Toggle } from '../../components/Toggle'
import { useToast } from '../../components/toast-context'
import { db } from '../../db/db'
import { fmt, t } from '../../i18n'
import {
  guessMapping,
  parseCsv,
  planImport,
  type ColumnMapping,
  type ImportField,
} from '../../lib/csv'
import { formatDate } from '../../lib/dates'
import { formatCents } from '../../lib/money'
import { applyImport } from './import'

const fields: ImportField[] = ['date', 'amount', 'type', 'category', 'tags', 'note']

export function ImportPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const existing = useLiveQuery(() => db.transactions.toArray(), [])

  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<string[][]>([])
  const [hasHeader, setHasHeader] = useState(true)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [createCategories, setCreateCategories] = useState(true)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async (file: File | undefined) => {
    if (!file) return
    const parsed = parseCsv(await file.text())
    const guessed = guessMapping(parsed[0] ?? [])
    setFileName(file.name)
    setRows(parsed)
    // Se nessuna colonna è stata riconosciuta per nome, la prima riga è probabilmente un dato.
    const header = guessed.date >= 0 || guessed.amount >= 0
    setHasHeader(header)
    setMapping(header ? guessed : { date: 0, amount: 1, type: -1, category: -1, tags: -1, note: 2 })
  }

  const columns = useMemo(() => {
    const width = Math.max(0, ...rows.slice(0, 20).map((r) => r.length))
    return Array.from({ length: width }, (_, i) =>
      hasHeader && rows[0]?.[i] ? rows[0][i]! : fmt(t().imp.column, { n: i + 1 }),
    )
  }, [rows, hasHeader])

  const ready = mapping && mapping.date >= 0 && mapping.amount >= 0
  const plan = useMemo(() => {
    if (!ready || !categories || !existing) return null
    return planImport(rows, mapping, hasHeader, categories, existing, {
      createMissingCategories: createCategories,
      skipDuplicates,
    })
  }, [ready, rows, mapping, hasHeader, categories, existing, createCategories, skipDuplicates])

  const toImport = plan ? plan.rows.filter((r) => !r.duplicate) : []
  const duplicates = plan ? plan.rows.length - toImport.length : 0
  const catName = (id?: string, fallback?: string) =>
    (id && categories?.find((c) => c.id === id)?.name) || fallback || ''

  const run = async () => {
    if (!plan || toImport.length === 0) return
    setBusy(true)
    try {
      const n = await applyImport(plan)
      toast({ message: n === 1 ? t().imp.doneOne : fmt(t().imp.done, { n }) })
      navigate('/movimenti')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pb-8">
      <SubpageHeader title={t().imp.title} backTo="/impostazioni/dati" backLabel={t().data.title} />

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void load(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="pressable mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-white"
      >
        <FileUp aria-hidden="true" className="size-5" />
        {t().imp.chooseFile}
      </button>
      {fileName && (
        <p className="mt-2 px-1 text-sm text-muted">
          {fmt(t().imp.fileInfo, { name: fileName, n: rows.length })}
        </p>
      )}

      {mapping && (
        <>
          <section className="mt-5">
            <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">
              {t().imp.mapping}
            </h2>
            <div className="rounded-2xl bg-surface p-4">
              <Toggle checked={hasHeader} onChange={setHasHeader} label={t().imp.hasHeader} />
              <p className="mt-2 text-sm text-muted">{t().imp.mappingHint}</p>
              <div className="mt-2 divide-y divide-border">
                {fields.map((f) => (
                  <label key={f} className="flex min-h-12 items-center justify-between gap-3 py-1">
                    <span className="font-medium">{t().imp.fields[f]}</span>
                    <select
                      value={mapping[f]}
                      onChange={(e) => setMapping({ ...mapping, [f]: Number(e.target.value) })}
                      className="min-h-11 max-w-[55%] rounded-xl bg-surface-2 px-3"
                    >
                      <option value={-1}>{t().imp.none}</option>
                      {columns.map((c, i) => (
                        <option key={i} value={i}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {mapping.type < 0 && <p className="mt-2 text-sm text-muted">{t().imp.signHint}</p>}
            </div>
          </section>

          <section className="mt-5">
            <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">
              {t().imp.options}
            </h2>
            <div className="rounded-2xl bg-surface px-4 py-2">
              <Toggle
                checked={createCategories}
                onChange={setCreateCategories}
                label={t().imp.createCategories}
                description={createCategories ? undefined : t().imp.createCategoriesOff}
              />
              <Toggle
                checked={skipDuplicates}
                onChange={setSkipDuplicates}
                label={t().imp.skipDuplicates}
              />
            </div>
          </section>

          <section className="mt-5" aria-live="polite">
            <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">
              {t().imp.preview}
            </h2>
            <div className="rounded-2xl bg-surface p-4 text-sm">
              {!ready || !plan ? (
                <p className="text-expense">{t().imp.missingRequired}</p>
              ) : (
                <>
                  <p className="font-semibold">
                    {toImport.length === 1
                      ? t().imp.readyOne
                      : fmt(t().imp.ready, { n: toImport.length })}
                  </p>
                  {duplicates > 0 && (
                    <p className="text-muted">
                      {duplicates === 1
                        ? t().imp.duplicatesOne
                        : fmt(t().imp.duplicates, { n: duplicates })}
                    </p>
                  )}
                  {plan.errors.length > 0 && (
                    <p className="text-warning">
                      {fmt(plan.errors.length === 1 ? t().imp.errorsOne : t().imp.errors, {
                        n: plan.errors.length,
                        lines: plan.errors
                          .slice(0, 8)
                          .map(
                            (e) =>
                              `${fmt(t().imp.line, { n: e.line })} (${t().imp.reasons[e.reason]})`,
                          )
                          .join(', '),
                      })}
                    </p>
                  )}
                  {plan.newCategories.length > 0 && (
                    <p className="text-muted">
                      {fmt(t().imp.newCategories, {
                        names: plan.newCategories.map((c) => c.name).join(', '),
                      })}
                    </p>
                  )}
                  {toImport.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left tabular-nums">
                        <thead className="text-muted">
                          <tr>
                            <th scope="col" className="py-1 pr-2 font-medium">
                              {t().tx.date}
                            </th>
                            <th scope="col" className="py-1 pr-2 font-medium">
                              {t().tx.category}
                            </th>
                            <th scope="col" className="py-1 text-right font-medium">
                              {t().tx.amount}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {toImport.slice(0, 8).map((r) => (
                            <tr key={r.line}>
                              <td className="py-1.5 pr-2 whitespace-nowrap">
                                {formatDate(r.date, 'dd/MM/yy')}
                              </td>
                              <td className="py-1.5 pr-2">
                                <span className="block">
                                  {catName(r.categoryId, r.newCategoryName)}
                                </span>
                                {(r.note || r.tags.length > 0) && (
                                  <span className="block text-xs text-muted">
                                    {[r.note, r.tags.map((x) => `#${x}`).join(' ')]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 text-right whitespace-nowrap">
                                {formatCents(r.type === 'income' ? r.amountCents : -r.amountCents, {
                                  signed: true,
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <button
            type="button"
            disabled={busy || toImport.length === 0}
            onClick={() => void run()}
            className="pressable mt-5 min-h-12 w-full rounded-2xl bg-accent text-lg font-semibold text-white disabled:opacity-40"
          >
            {toImport.length === 1
              ? t().imp.importButtonOne
              : fmt(t().imp.importButton, { n: toImport.length })}
          </button>
        </>
      )}
    </div>
  )
}
