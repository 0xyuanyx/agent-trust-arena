type Guardrail = {
  label: string
  value: string
  active: boolean
}

type WalletGuardrailsProps = {
  title: string
  items: Guardrail[]
}

export function WalletGuardrails({ title, items }: WalletGuardrailsProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-950/35 px-3 py-2" key={item.label}>
            <p className="min-w-0 text-sm text-slate-200">{item.label}</p>
            <span
              className={
                item.active
                  ? 'shrink-0 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100'
                  : 'shrink-0 rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-slate-300'
              }
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
