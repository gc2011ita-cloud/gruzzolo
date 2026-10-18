/** Tooltip comune ai grafici. */

export function TooltipBox({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: string; color?: string; dashed?: boolean }[]
}) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2 text-sm shadow-lg ring-1 ring-border">
      <p className="mb-1 font-semibold first-letter:uppercase">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          {r.color && (
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: r.color }}
            />
          )}
          <span className="text-muted">{r.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  )
}
