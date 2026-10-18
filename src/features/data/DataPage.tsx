import { useLiveQuery } from 'dexie-react-hooks'
import { FileDown, FileText, FileUp, RotateCcw, ShieldCheck } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SubpageHeader } from '../../components/SubpageHeader'
import { Toggle } from '../../components/Toggle'
import { useToast } from '../../components/toast-context'
import { db } from '../../db/db'
import { defaultSettings, setSetting, useSettings } from '../../db/settings'
import { fmt, t } from '../../i18n'
import {
  BackupError,
  backupFileName,
  createBackup,
  parseBackup,
  restoreBackup,
  summarize,
  type BackupFile,
} from '../../lib/backup'
import { transactionsToCsv } from '../../lib/csv'
import { formatDate, periodLabel, toISODate, type DateRange } from '../../lib/dates'
import { shareOrDownload } from '../../lib/share'
import { formatBytes } from '../../lib/storage'
import { PeriodPicker } from '../overview/PeriodPicker'
import { usePeriod } from '../overview/period-state'
import { useCategoryMap } from '../transactions/hooks'

const reminderOptions = [0, 7, 14, 30, 60]

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-4">
      <h2 className="px-4 pb-1.5 text-sm font-medium text-muted uppercase">{title}</h2>
      <div className="rounded-2xl bg-surface p-4">{children}</div>
    </section>
  )
}

const buttonClass =
  'pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold disabled:opacity-50'

export function DataPage() {
  const settings = useSettings() ?? defaultSettings
  const toast = useToast()
  const categories = useCategoryMap()
  const fileRef = useRef<HTMLInputElement>(null)
  const [includeReceipts, setIncludeReceipts] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [scope, setScope] = useState<'all' | 'period'>('period')
  const [period, setPeriod] = usePeriod()

  const receipts = useLiveQuery(async () => {
    let size = 0
    let count = 0
    await db.receipts.each((r) => {
      size += r.size
      count++
    })
    return { size, count }
  }, [])
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])

  const runBackup = async () => {
    setBusy(true)
    try {
      const backup = await createBackup({ includeReceipts })
      const file = new File([JSON.stringify(backup)], backupFileName(), {
        type: 'application/json',
      })
      if (await shareOrDownload(file)) {
        await setSetting('lastBackupAt', Date.now())
        toast({ message: t().data.backupDone })
      }
    } finally {
      setBusy(false)
    }
  }

  const pickRestore = async (file: File | undefined) => {
    if (!file) return
    setRestoreError(null)
    try {
      setPending(parseBackup(await file.text()))
    } catch (e) {
      setRestoreError(
        e instanceof BackupError ? t().data.restoreErrors[e.code] : t().data.restoreErrors.corrupt,
      )
    }
  }

  const confirmRestore = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await restoreBackup(pending)
      toast({ message: t().data.restored })
    } catch {
      setRestoreError(t().data.restoreErrors.corrupt)
    } finally {
      setPending(null)
      setBusy(false)
    }
  }

  const exportRange = (): { range: DateRange; label: string } | null => {
    if (!transactions?.length) return null
    if (scope === 'period') {
      return { range: period.range, label: periodLabel(period.kind, period.range) }
    }
    const dates = transactions.map((x) => x.date).sort()
    return { range: { from: dates[0]!, to: dates.at(-1)! }, label: t().data.allTime }
  }

  const inRange = (r: DateRange) =>
    (transactions ?? []).filter((x) => x.date >= r.from && x.date <= r.to)

  const exportCsv = async () => {
    const sel = exportRange()
    const list = sel ? inRange(sel.range) : []
    if (!sel || list.length === 0) return toast({ message: t().data.nothingToExport })
    const name = `gruzzolo-movimenti-${sel.range.from}_${sel.range.to}.csv`
    await shareOrDownload(
      new File([transactionsToCsv(list, categories)], name, { type: 'text/csv;charset=utf-8' }),
    )
  }

  const exportPdf = async () => {
    const sel = exportRange()
    if (!sel || inRange(sel.range).length === 0) return toast({ message: t().data.nothingToExport })
    setBusy(true)
    try {
      // jsPDF si carica solo quando serve.
      const { buildReport } = await import('../../lib/pdf-report')
      const blob = buildReport({
        title: t().data.reportTitle,
        periodLabel: sel.label.charAt(0).toUpperCase() + sel.label.slice(1),
        range: sel.range,
        transactions: transactions ?? [],
        categories,
        initialBalance: settings.initialBalanceCents,
      })
      const name = `gruzzolo-report-${sel.range.from}_${sel.range.to}.pdf`
      await shareOrDownload(new File([blob], name, { type: 'application/pdf' }))
    } finally {
      setBusy(false)
    }
  }

  const summary = pending ? summarize(pending) : null

  return (
    <>
      <SubpageHeader title={t().data.title} backTo="/impostazioni" backLabel={t().settings.title} />

      <Card title={t().data.backup}>
        <p className="text-sm text-muted">{t().data.backupIntro}</p>
        <p className="mt-3 flex items-center gap-2 font-medium">
          <ShieldCheck aria-hidden="true" className="size-5 text-accent-text" />
          {settings.lastBackupAt
            ? fmt(t().data.lastBackup, {
                date: formatDate(toISODate(new Date(settings.lastBackupAt)), 'd MMMM yyyy'),
              })
            : t().data.neverBackedUp}
        </p>
        {(receipts?.count ?? 0) > 0 && (
          <div className="mt-2 border-t border-border pt-1">
            <Toggle
              checked={includeReceipts}
              onChange={setIncludeReceipts}
              label={t().data.includeReceipts}
              description={fmt(t().data.receiptsInfo, {
                n: receipts!.count,
                size: formatBytes(receipts!.size * 1.37),
              })}
            />
          </div>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void runBackup()}
          className={`${buttonClass} mt-3 bg-accent text-white`}
        >
          <FileDown aria-hidden="true" className="size-5" />
          {t().data.createBackup}
        </button>

        <label className="mt-4 flex min-h-12 items-center justify-between gap-3 border-t border-border pt-3">
          <span>{t().data.reminder}</span>
          <select
            value={settings.backupReminderDays}
            onChange={(e) => void setSetting('backupReminderDays', Number(e.target.value))}
            className="min-h-11 rounded-xl bg-surface-2 px-3"
          >
            {reminderOptions.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? t().data.reminderOff : fmt(t().data.reminderDays, { n })}
              </option>
            ))}
          </select>
        </label>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void pickRestore(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className={`${buttonClass} mt-3 bg-surface-2`}
        >
          <RotateCcw aria-hidden="true" className="size-5" />
          {t().data.restore}
        </button>
        {restoreError && (
          <p role="alert" className="mt-2 text-sm text-expense">
            {restoreError}
          </p>
        )}
      </Card>

      <Card title={t().data.export}>
        <p className="mb-3 text-sm text-muted">{t().data.exportIntro}</p>
        <SegmentedControl
          label={t().overview.period}
          value={scope}
          options={[
            { value: 'period', label: t().data.exportPeriod },
            { value: 'all', label: t().data.exportAll },
          ]}
          onChange={setScope}
        />
        {scope === 'period' && (
          <div className="mt-3">
            <PeriodPicker value={period} onChange={setPeriod} />
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void exportCsv()}
            className={`${buttonClass} bg-surface-2`}
          >
            <FileDown aria-hidden="true" className="size-5" />
            {t().data.exportCsv}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void exportPdf()}
            className={`${buttonClass} bg-surface-2`}
          >
            <FileText aria-hidden="true" className="size-5" />
            {t().data.exportPdf}
          </button>
        </div>
      </Card>

      <Card title={t().data.import}>
        <p className="mb-3 text-sm text-muted">{t().data.importIntro}</p>
        <Link to="/impostazioni/dati/importa" className={`${buttonClass} bg-surface-2`}>
          <FileUp aria-hidden="true" className="size-5" />
          {t().data.importOpen}
        </Link>
      </Card>

      {summary && (
        <ConfirmDialog
          title={t().data.restoreTitle}
          confirmLabel={t().data.restoreConfirm}
          destructive
          confirmDisabled={busy}
          onConfirm={() => void confirmRestore()}
          onCancel={() => setPending(null)}
        >
          <p>
            {fmt(t().data.restoreBody, {
              date: formatDate(toISODate(new Date(summary.exportedAt)), 'd MMMM yyyy'),
              tx: summary.transactions,
              cat: summary.categories,
              inv: summary.investments,
              rec: summary.receipts,
            })}
          </p>
        </ConfirmDialog>
      )}
    </>
  )
}
