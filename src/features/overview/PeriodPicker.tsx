import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SegmentedControl } from '../../components/SegmentedControl'
import { t } from '../../i18n'
import {
  fromISODate,
  isInRange,
  periodLabel,
  periodRange,
  shiftPeriod,
  todayISO,
  type PeriodKind,
} from '../../lib/dates'
import type { PeriodState } from './period-state'

const kinds = [
  { value: 'week', label: t().list.periodWeek },
  { value: 'month', label: t().list.periodMonth },
  { value: 'year', label: t().list.periodYear },
  { value: 'custom', label: t().list.periodCustom },
] as const

interface Props {
  value: PeriodState
  onChange: (p: PeriodState) => void
}

export function PeriodPicker({ value, onChange }: Props) {
  const { kind, range } = value

  const setKind = (k: PeriodKind) => {
    if (k === 'custom') return onChange({ kind: k, range })
    // Se il periodo mostrato contiene oggi, il nuovo periodo è quello di oggi.
    const ref = isInRange(todayISO(), range) ? new Date() : fromISODate(range.from)
    onChange({ kind: k, range: periodRange(k, ref) })
  }

  return (
    <div className="space-y-2">
      <SegmentedControl
        label={t().overview.period}
        value={kind}
        options={kinds}
        onChange={setKind}
      />
      {kind === 'custom' ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-2xl bg-surface p-3 text-sm text-muted">
            {t().list.from}
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) =>
                e.target.value && onChange({ kind, range: { ...range, from: e.target.value } })
              }
              className="mt-1 block w-full bg-transparent text-text"
            />
          </label>
          <label className="rounded-2xl bg-surface p-3 text-sm text-muted">
            {t().list.to}
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) =>
                e.target.value && onChange({ kind, range: { ...range, to: e.target.value } })
              }
              className="mt-1 block w-full bg-transparent text-text"
            />
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label={t().list.previous}
            onClick={() => onChange({ kind, range: shiftPeriod(range, kind, -1) })}
            className="pressable flex size-11 items-center justify-center rounded-xl text-accent-text"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <p aria-live="polite" className="text-lg font-semibold first-letter:uppercase">
            {periodLabel(kind, range)}
          </p>
          <button
            type="button"
            aria-label={t().list.next}
            onClick={() => onChange({ kind, range: shiftPeriod(range, kind, 1) })}
            className="pressable flex size-11 items-center justify-center rounded-xl text-accent-text"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
