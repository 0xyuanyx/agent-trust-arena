import type { ReactNode } from 'react'

type EvidenceFact = {
  label: string
  value: string
  href?: string
}

type DecisionEvidencePanelProps = {
  title: string
  modeLabel?: string
  facts: EvidenceFact[]
  explorerLabel: string
  explorerHref?: string
  emptyState: string
  recordAction?: ReactNode
}

export function DecisionEvidencePanel({
  title,
  modeLabel,
  facts,
  explorerLabel,
  explorerHref,
  emptyState,
  recordAction,
}: DecisionEvidencePanelProps) {
  return (
    <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {modeLabel ? (
          <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100">
            {modeLabel}
          </span>
        ) : null}
      </div>
      <dl className="mt-4 divide-y divide-white/10">
        {facts.length > 0 ? (
          facts.map((fact) => (
            <div className="grid grid-cols-[minmax(96px,0.8fr)_minmax(0,1fr)] gap-4 py-2.5 first:pt-0 last:pb-0" key={fact.label}>
              <dt className="text-xs text-slate-500">{fact.label}</dt>
              <dd className="min-w-0 break-all text-right font-mono text-xs text-slate-200">
                {fact.href ? (
                  <a
                    className="text-cyan-100 underline decoration-cyan-200/30 underline-offset-4 transition hover:text-cyan-50"
                    href={fact.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {fact.value}
                  </a>
                ) : (
                  fact.value
                )}
              </dd>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">{emptyState}</p>
        )}
      </dl>
      {recordAction ? <div className="mt-4">{recordAction}</div> : null}
      <button
        className="mt-4 w-full rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition enabled:hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!explorerHref}
        onClick={() => {
          if (explorerHref) {
            window.open(explorerHref, '_blank', 'noopener,noreferrer')
          }
        }}
        type="button"
      >
        {explorerLabel}
      </button>
    </section>
  )
}
