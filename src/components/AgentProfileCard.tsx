type ProfileFact = {
  label: string
  value: string
}

type AgentProfileCardProps = {
  title: string
  name: string
  description: string
  facts: ProfileFact[]
}

export function AgentProfileCard({
  title,
  name,
  description,
  facts,
}: AgentProfileCardProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">{title}</p>
      <div className="mt-3">
        <h2 className="text-lg font-semibold text-white">{name}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
      </div>
      <dl className="mt-4 grid gap-2">
        {facts.map((fact) => (
          <div className="flex items-center justify-between gap-3" key={fact.label}>
            <dt className="text-xs text-slate-500">{fact.label}</dt>
            <dd className="text-right text-sm font-medium text-slate-200">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
