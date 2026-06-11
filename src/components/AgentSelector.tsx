type AgentOption = {
  id: string
  name: string
  personality: string
  status: string
  strength: string
  weakness: string
}

type AgentSelectorProps = {
  title: string
  agents: AgentOption[]
  selectedAgentId: string
  onSelectAgent: (agentId: string) => void
}

export function AgentSelector({
  title,
  agents,
  selectedAgentId,
  onSelectAgent,
}: AgentSelectorProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3 grid gap-2">
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId

          return (
            <button
              className={`rounded-lg border p-3 text-left transition ${
                isSelected
                  ? 'border-cyan-300/45 bg-cyan-300/10 shadow-lg shadow-cyan-950/20'
                  : 'border-white/10 bg-slate-950/35 hover:border-white/25 hover:bg-white/[0.05]'
              }`}
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{agent.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                    {agent.personality}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] font-medium text-slate-300">
                  {agent.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-300">
                <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-emerald-100">
                  {agent.strength}
                </p>
                <p className="rounded-md border border-rose-300/20 bg-rose-300/10 px-2 py-1 text-rose-100">
                  {agent.weakness}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
