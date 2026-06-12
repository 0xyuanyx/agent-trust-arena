type VerdictCardProps = {
  verdict?: string
  tone?: 'blocked' | 'safe'
  details: {
    label: string
    value: string
  }[]
  emptyState: string
}

export function VerdictCard({
  verdict,
  tone = 'blocked',
  details,
  emptyState,
}: VerdictCardProps) {
  const hasVerdict = Boolean(verdict)
  const sectionClassName = !hasVerdict
    ? 'rounded-lg border border-white/10 bg-white/[0.04] p-5'
    : tone === 'safe'
      ? 'rounded-lg border border-emerald-300/30 bg-emerald-500/10 p-5 shadow-2xl shadow-emerald-950/30'
      : 'rounded-lg border border-rose-300/30 bg-rose-500/10 p-5 shadow-2xl shadow-rose-950/30'
  const verdictClassName =
    tone === 'safe'
      ? 'arena-verdict-stamp border-emerald-100 text-emerald-100'
      : 'arena-verdict-stamp border-rose-100 text-rose-100'

  return (
    <section className={sectionClassName}>
      {verdict ? (
        <>
          <strong className={verdictClassName}>{verdict}</strong>
          <dl className="mt-5 grid gap-3 md:grid-cols-2">
            {details.map((detail) => (
              <Detail key={detail.label} label={detail.label} value={detail.value} />
            ))}
          </dl>
        </>
      ) : (
        <p className="text-sm text-slate-400">{emptyState}</p>
      )}
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/60 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-100">{value}</dd>
    </div>
  )
}
