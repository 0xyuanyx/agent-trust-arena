type VerdictCardProps = {
  eyebrow: string
  verdict: string
  intentLabel: string
  intent: string
  calldataLabel: string
  calldata: string
  mismatchLabel: string
  mismatch: string
  actionLabel: string
  action: string
}

export function VerdictCard({
  eyebrow,
  verdict,
  intentLabel,
  intent,
  calldataLabel,
  calldata,
  mismatchLabel,
  mismatch,
  actionLabel,
  action,
}: VerdictCardProps) {
  return (
    <section className="rounded-lg border border-rose-300/30 bg-rose-500/10 p-5 shadow-2xl shadow-rose-950/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-rose-100/70">{eyebrow}</p>
      <strong className="mt-2 block text-5xl font-black tracking-normal text-rose-100">
        {verdict}
      </strong>
      <dl className="mt-5 grid gap-3 md:grid-cols-2">
        <Detail label={intentLabel} value={intent} />
        <Detail label={calldataLabel} value={calldata} />
        <Detail label={mismatchLabel} value={mismatch} />
        <Detail label={actionLabel} value={action} />
      </dl>
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
