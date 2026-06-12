type PipelineStep = {
  role: string
  status?: string
  description: string
  permissionLabel: string
  permission: string
  reason?: string
}

type AgentExecutionPipelineProps = {
  title: string
  subtitle: string
  steps: PipelineStep[]
}

export function AgentExecutionPipeline({
  title,
  subtitle,
  steps,
}: AgentExecutionPipelineProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-0.5 line-clamp-1 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        {steps.map((step) => (
          <article className="h-[132px] overflow-hidden rounded-lg border border-white/10 bg-slate-950/70 p-2" key={step.role}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="truncate text-sm font-semibold text-white">{step.role}</h3>
              {step.status ? (
                <span className="shrink-0 rounded-md bg-emerald-300/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-100">
                  {step.status}
                </span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-1 text-sm leading-5 text-slate-400">{step.description}</p>
            <div className="mt-1.5 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-1.5">
              <p className="text-xs text-cyan-100/70">{step.permissionLabel}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-cyan-100">{step.permission}</p>
            </div>
            {step.reason ? (
              <p className="mt-1.5 line-clamp-1 text-xs leading-5 text-slate-500">{step.reason}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
