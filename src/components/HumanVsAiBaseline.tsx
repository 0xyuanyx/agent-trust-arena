type BaselineRow = {
  actor: string
  result: string
}

type HumanVsAiBaselineProps = {
  title: string
  rows: BaselineRow[]
  finalLabel: string
  finalResult?: string
  emptyState: string
}

export function HumanVsAiBaseline({
  title,
  rows,
  finalLabel,
  finalResult,
  emptyState,
}: HumanVsAiBaselineProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div className="flex items-center justify-between gap-3" key={row.actor}>
              <span className="text-sm text-slate-400">{row.actor}</span>
              <span className="text-right text-sm font-medium text-slate-100">{row.result}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">{emptyState}</p>
        )}
      </div>
      {finalResult ? (
        <div className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3">
          <p className="text-xs text-emerald-100/70">{finalLabel}</p>
          <p className="mt-1 text-sm font-semibold text-emerald-100">{finalResult}</p>
        </div>
      ) : null}
    </section>
  )
}
