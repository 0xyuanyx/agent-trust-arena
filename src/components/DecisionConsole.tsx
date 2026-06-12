type DecisionConsoleProps = {
  title: string
  events: {
    label: string
    message: string
    elapsedMs: number
    tone: 'neutral' | 'proposer' | 'verifier' | 'auditorVeto' | 'auditorPass' | 'executor'
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
        <span className="font-mono text-[11px] text-slate-500">
          {lineCountLabel}
        </span>
      </div>
      <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-slate-950 p-3 font-mono text-xs text-slate-300">
        {events.length > 0 ? (
          <>
            {events.map((event) => (
              <div
                className="grid grid-cols-[52px_104px_minmax(0,1fr)] gap-2"
                key={`${event.elapsedMs}-${event.label}-${event.message}`}
              >
                <span className="text-[11px] text-slate-500">{formatElapsedTime(event.elapsedMs)}</span>
                <span className={`font-semibold ${getLabelClassName(event.tone)}`}>
                  {event.label}
                </span>
                <span className="min-w-0 whitespace-pre-wrap break-words text-slate-300 [overflow-wrap:anywhere]">
                  {event.message}
                </span>
              </div>
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

function getLabelClassName(tone: DecisionConsoleProps['events'][number]['tone']) {
  switch (tone) {
    case 'proposer':
      return 'text-indigo-200'
    case 'verifier':
      return 'text-amber-200'
    case 'auditorVeto':
      return 'text-rose-200'
    case 'auditorPass':
      return 'text-emerald-200'
    case 'executor':
      return 'text-emerald-200'
    case 'neutral':
    default:
      return 'text-slate-400'
  }
}
