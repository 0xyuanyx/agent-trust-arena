type ComparisonRow = {
  field: string
  intent: string
  plan: string
  calldata: string
  status: string
  tone: 'match' | 'warning' | 'critical'
}

type IntentCalldataVerifierProps = {
  title: string
  subtitle?: string
  columns: {
    field: string
    intent: string
    plan: string
    calldata: string
    status: string
  }
  rows: ComparisonRow[]
  emptyState: string
}

export function IntentCalldataVerifier({
  title,
  subtitle,
  columns,
  rows,
  emptyState,
}: IntentCalldataVerifierProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-[16%] px-3 py-3">{columns.field}</th>
              <th className="w-[20%] px-3 py-3">{columns.intent}</th>
              <th className="w-[20%] px-3 py-3">{columns.plan}</th>
              <th className="w-[25%] px-3 py-3">{columns.calldata}</th>
              <th className="w-[19%] px-3 py-3">{columns.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.field}>
                  <td className="px-3 py-3 font-medium text-slate-200">{row.field}</td>
                  <td className="px-3 py-3 text-slate-400">{row.intent}</td>
                  <td className="px-3 py-3 text-slate-400">{row.plan}</td>
                  <td className="break-words px-3 py-3 font-mono text-xs text-slate-300">
                    {row.calldata}
                  </td>
                  <td className="px-3 py-3">
                    <span className={statusClassName(row.tone)}>{row.status}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-5 text-sm text-slate-400" colSpan={5}>
                  {emptyState}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function statusClassName(tone: ComparisonRow['tone']) {
  if (tone === 'match') {
    return 'rounded-md bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100'
  }

  if (tone === 'warning') {
    return 'rounded-md bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100'
  }

  return 'rounded-md bg-rose-400/15 px-2 py-1 text-xs font-semibold text-rose-100'
}
