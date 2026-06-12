type ScoreMetric = {
  label: string
  value: number
}

type AgentReadinessScoreProps = {
  title: string
  scoreLabel?: string
  scoreValue: string
  status?: string
  reason?: string
  formula?: string
  metrics: ScoreMetric[]
}

export function AgentReadinessScore({
  title,
  scoreLabel,
  scoreValue,
  status,
  reason,
  formula,
  metrics,
}: AgentReadinessScoreProps) {
  return (
    <section className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {scoreLabel ? <p className="mt-1 text-xs text-amber-100/70">{scoreLabel}</p> : null}
        </div>
        <ScoreValue value={scoreValue} />
      </div>
      {status ? (
        <p className="mt-3 rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-100">
          {status}
        </p>
      ) : null}
      {formula ? <p className="mt-3 text-xs leading-5 text-amber-100/65">{formula}</p> : null}
      {reason ? <p className="mt-3 text-sm leading-6 text-slate-300">{reason}</p> : null}
      <div className="mt-4 space-y-2">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{metric.label}</span>
              <span>{metric.value}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amber-300"
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ScoreValue({ value }: { value: string }) {
  const parsed = parseScoreValue(value)

  if (!parsed) {
    return <strong className="text-2xl font-semibold text-amber-200">{value}</strong>
  }

  const emphasisClassName = parsed.delta >= 0 ? 'text-emerald-200' : 'text-rose-100'

  return (
    <strong className="text-right leading-none">
      <span className="block text-sm font-medium text-slate-500">
        {parsed.previous} -&gt;
      </span>
      <span className={`block text-2xl font-semibold ${emphasisClassName}`}>
        {parsed.next}
      </span>
      <span className={`block text-2xl font-semibold ${emphasisClassName}`}>
        ({formatSignedNumber(parsed.delta)})
      </span>
    </strong>
  )
}

function parseScoreValue(value: string) {
  const match = value.match(/^(\d+)\s*(?:->|→)\s*(\d+)\s*\(([+-]?\d+)\)$/)

  if (!match) {
    return undefined
  }

  return {
    previous: match[1],
    next: match[2],
    delta: Number(match[3]),
  }
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value)
}
