type ReportMetric = {
  label: string
  value: string
}

type ReportLink = {
  label: string
  value: string
  href?: string
}

type AgentReportCardModalProps = {
  open: boolean
  title: string
  agentName: string
  scoreLabel: string
  scoreValue: string
  summaryLine: string
  metrics: ReportMetric[]
  recentVerdict: ReportLink
  lastDecision: ReportLink
  copySummaryLabel: string
  copiedLabel: string
  closeLabel: string
  isCopied: boolean
  onClose: () => void
  onCopySummary: () => void
}

export function AgentReportCardModal({
  open,
  title,
  agentName,
  scoreLabel,
  scoreValue,
  summaryLine,
  metrics,
  recentVerdict,
  lastDecision,
  copySummaryLabel,
  copiedLabel,
  closeLabel,
  isCopied,
  onClose,
  onCopySummary,
}: AgentReportCardModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-[560px] rounded-lg border border-cyan-300/25 bg-slate-950 p-5 shadow-2xl shadow-cyan-950/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-200/75">
              {title}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-normal text-white">{agentName}</h2>
          </div>
          <button
            className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/25 hover:bg-white/5"
            onClick={onClose}
            type="button"
          >
            {closeLabel}
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
          <p className="text-xs text-emerald-100/70">{scoreLabel}</p>
          <p className="mt-1 text-4xl font-black tracking-normal text-emerald-100">
            {scoreValue}
          </p>
          <p className="mt-3 text-sm font-semibold text-emerald-50">{summaryLine}</p>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3" key={metric.label}>
              <dt className="text-xs text-slate-500">{metric.label}</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-100">{metric.value}</dd>
            </div>
          ))}
        </dl>

        <dl className="mt-4 space-y-3 rounded-md border border-white/10 bg-slate-900/60 p-3">
          <ReportRow link={recentVerdict} />
          <ReportRow link={lastDecision} />
        </dl>

        <button
          className="mt-5 w-full rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          onClick={onCopySummary}
          type="button"
        >
          {isCopied ? copiedLabel : copySummaryLabel}
        </button>
      </section>
    </div>
  )
}

function ReportRow({ link }: { link: ReportLink }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-xs text-slate-500">{link.label}</dt>
      <dd className="break-all text-sm font-medium text-slate-100">
        {link.href ? (
          <a
            className="text-cyan-100 underline decoration-cyan-200/30 underline-offset-4 transition hover:text-cyan-50"
            href={link.href}
            rel="noreferrer"
            target="_blank"
          >
            {link.value}
          </a>
        ) : (
          link.value
        )}
      </dd>
    </div>
  )
}
