type DecisionConsoleProps = {
  title: string
  events: string[]
}

export function DecisionConsole({ title, events }: DecisionConsoleProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-slate-950 p-3 font-mono text-xs text-slate-300">
        {events.map((event) => (
          <p key={event}>{event}</p>
        ))}
      </div>
    </section>
  )
}
