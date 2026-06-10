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
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <article className="rounded-lg border border-white/10 bg-slate-950/70 p-4" key={step.role}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">{step.role}</h3>
              {step.status ? (
                <span className="rounded-md bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100">
                  {step.status}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">{step.description}</p>
            <div className="mt-4 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3">
              <p className="text-xs text-cyan-100/70">{step.permissionLabel}</p>
              <p className="mt-1 text-sm font-semibold text-cyan-100">{step.permission}</p>
            </div>
            {step.reason ? (
              <p className="mt-3 text-xs leading-5 text-slate-500">{step.reason}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
