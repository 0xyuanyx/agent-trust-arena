type EvidenceFact = {
  label: string
  value: string
}

type DecisionEvidencePanelProps = {
  title: string
  modeLabel: string
  facts: EvidenceFact[]
  explorerLabel: string
}

export function DecisionEvidencePanel({
  title,
  modeLabel,
  facts,
  explorerLabel,
}: DecisionEvidencePanelProps) {
  return (
    <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100">
          {modeLabel}
        </span>
      </div>
      <dl className="mt-4 space-y-2">
        {facts.map((fact) => (
          <div className="grid grid-cols-[96px_1fr] gap-3" key={fact.label}>
            <dt className="text-xs text-slate-500">{fact.label}</dt>
            <dd className="break-all font-mono text-xs text-slate-200">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <button className="mt-4 w-full rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
        {explorerLabel}
      </button>
    </section>
  )
}
