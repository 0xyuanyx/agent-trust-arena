type RiskSignalItem = {
  id: string
  label: string
  fieldLabel: string
  levelLabel: string
  reason: string
  tone: 'critical' | 'high' | 'medium' | 'low'
}

type RiskSignalPanelProps = {
  title: string
  emptyState: string
  signals: RiskSignalItem[]
}

const toneClassNames = {
  critical: 'border-rose-300/30 bg-rose-400/10 text-rose-100',
  high: 'border-orange-300/30 bg-orange-400/10 text-orange-100',
  medium: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
  low: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100',
}

export function RiskSignalPanel({ title, emptyState, signals }: RiskSignalPanelProps) {
  return (
    <section className="rounded-lg border border-orange-300/20 bg-orange-300/[0.05] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3 grid gap-2">
        {signals.length > 0 ? (
          signals.map((signal) => (
            <article
              className={`rounded-md border p-3 ${toneClassNames[signal.tone]}`}
              key={`${signal.id}-${signal.fieldLabel}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{signal.label}</p>
                  <p className="mt-1 text-xs opacity-75">{signal.fieldLabel}</p>
                </div>
                <span className="rounded-md border border-current/25 px-2 py-1 text-[11px] font-semibold">
                  {signal.levelLabel}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 opacity-80">{signal.reason}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-400">{emptyState}</p>
        )}
      </div>
    </section>
  )
}
