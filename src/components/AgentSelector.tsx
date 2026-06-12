type AgentOption = {
  id: string
  name: string
  personality: string
  status: string
  strength: string
  weakness: string
}

type ProfileFact = {
  label: string
  value: string
}

type SelectedAgentDetails = {
  name: string
  description: string
  facts: ProfileFact[]
}

type AgentSelectorProps = {
  title: string
  agents: AgentOption[]
  selectedAgentId: string
  selectedAgentDetails: SelectedAgentDetails
  onSelectAgent: (agentId: string) => void
  disabled?: boolean
}

export function AgentSelector({
  title,
  agents,
  selectedAgentId,
  selectedAgentDetails,
  onSelectAgent,
  disabled,
}: AgentSelectorProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-2 grid gap-1.5">
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId

          return (
            <button
              className={`rounded-md border p-1.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? 'border-cyan-300/45 bg-cyan-300/10 shadow-lg shadow-cyan-950/20'
                  : 'border-white/10 bg-slate-950/35 hover:border-white/25 hover:bg-white/[0.05]'
              }`}
              disabled={disabled}
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{agent.name}</p>
                  <p className="line-clamp-1 text-xs leading-4 text-slate-400">
                    {agent.personality}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 text-[11px] font-medium text-slate-300">
                  {agent.status}
                </span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] leading-4 text-slate-300">
                <p className="line-clamp-1 rounded-md border border-emerald-300/20 bg-emerald-300/10 px-1.5 py-0.5 text-emerald-100">
                  {agent.strength}
                </p>
                <p className="line-clamp-1 rounded-md border border-rose-300/20 bg-rose-300/10 px-1.5 py-0.5 text-rose-100">
                  {agent.weakness}
                </p>
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-2 rounded-md border border-cyan-300/15 bg-slate-950/45 p-2">
        <h3 className="truncate text-sm font-semibold text-white">{selectedAgentDetails.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs leading-4 text-slate-400">
          {selectedAgentDetails.description}
        </p>
        <dl className="mt-2 grid grid-cols-3 gap-1.5">
          {selectedAgentDetails.facts.map((fact) => (
            <div className="min-w-0 rounded-md border border-white/10 bg-slate-950/40 px-1.5 py-1" key={fact.label}>
              <dt className="truncate text-[9px] text-slate-500">{fact.label}</dt>
              <dd className="truncate text-[11px] font-medium text-slate-200">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
