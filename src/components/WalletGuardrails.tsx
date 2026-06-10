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
          <div className="flex items-center justify-between gap-3" key={item.label}>
            <div>
              <p className="text-sm text-slate-200">{item.label}</p>
              <p className="text-xs text-slate-500">{item.value}</p>
            </div>
            <span
              className={
                item.active
                  ? 'h-5 w-9 rounded-full border border-emerald-300/30 bg-emerald-400/25'
                  : 'h-5 w-9 rounded-full border border-white/10 bg-white/10'
              }
            />
          </div>
        ))}
      </div>
    </section>
  )
}
