type DecisionConsoleProps = {
  title: string
  events: {
    message: string
    elapsedMs: number
  }[]
  emptyState: string
  lineCountLabel: string
}

export function DecisionConsole({
  title,
  events,
  emptyState,
  lineCountLabel,
}: DecisionConsoleProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 font-mono text-[11px] font-semibold text-cyan-100">
          {lineCountLabel}
        </span>
      </div>
      <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-slate-950 p-3 font-mono text-xs text-slate-300">
        {events.length > 0 ? (
          <>
            {events.map((event) => (
              <p className="grid grid-cols-[64px_1fr] gap-2" key={`${event.elapsedMs}-${event.message}`}>
                <span className="text-cyan-200/70">{formatElapsedTime(event.elapsedMs)}</span>
                <span>{event.message}</span>
              </p>
            ))}
            <span aria-hidden className="arena-console-cursor mt-1" />
          </>
        ) : (
          <p>{emptyState}</p>
        )}
      </div>
    </section>
  )
}

function formatElapsedTime(elapsedMs: number) {
  return `+${(elapsedMs / 1000).toFixed(2)}s`
}
