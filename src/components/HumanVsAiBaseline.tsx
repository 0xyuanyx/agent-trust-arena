type BaselineRow = {
  actor: string
  result: string
}

type BaselineFact = {
  label: string
  value: string
}

type BaselineAction = {
  id: string
  label: string
  tone: 'approve' | 'block' | 'review'
}

type HumanVsAiBaselineProps = {
  title: string
  prompt?: string
  facts?: BaselineFact[]
  actions?: BaselineAction[]
  selectedAction?: string
  onSelectAction?: (actionId: string) => void
  rows: BaselineRow[]
  finalLabel: string
  finalResult?: string
  emptyState: string
}

export function HumanVsAiBaseline({
  title,
  prompt,
  facts = [],
  actions = [],
  selectedAction,
  onSelectAction,
  rows,
  finalLabel,
  finalResult,
  emptyState,
}: HumanVsAiBaselineProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {prompt ? (
        <div className="mt-4 rounded-md border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
          <p className="text-sm font-semibold text-cyan-100">{prompt}</p>
          {facts.length > 0 ? (
            <dl className="mt-3 space-y-2">
              {facts.map((fact) => (
                <div className="grid grid-cols-[88px_1fr] gap-3" key={fact.label}>
                  <dt className="text-xs text-slate-500">{fact.label}</dt>
                  <dd className="text-xs leading-5 text-slate-200">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {actions.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {actions.map((action) => (
                <button
                  className={getActionClassName(action.tone, action.id === selectedAction)}
                  key={action.id}
                  onClick={() => onSelectAction?.(action.id)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div className="flex items-center justify-between gap-3" key={row.actor}>
              <span className="text-sm text-slate-400">{row.actor}</span>
              <span className="text-right text-sm font-medium text-slate-100">{row.result}</span>
            </div>
          ))
        ) : prompt ? null : (
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

function getActionClassName(tone: BaselineAction['tone'], isSelected: boolean) {
  const baseClassName =
    'rounded-md border px-2 py-2 text-xs font-semibold transition hover:bg-white/10'
  const toneClassName =
    tone === 'approve'
      ? 'border-rose-300/25 bg-rose-300/10 text-rose-100'
      : tone === 'block'
        ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
        : 'border-amber-300/25 bg-amber-300/10 text-amber-100'
  const selectedClassName = isSelected ? 'ring-2 ring-white/35' : ''

  return `${baseClassName} ${toneClassName} ${selectedClassName}`
}
