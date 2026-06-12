import { useEffect, useRef } from 'react'

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
  const consoleBodyRef = useRef<HTMLDivElement>(null)
  const latestEventKey =
    events.length > 0
      ? `${events.length}-${events[events.length - 1].elapsedMs}-${events[events.length - 1].message}`
      : 'empty'

  useEffect(() => {
    const consoleBody = consoleBodyRef.current

    if (!consoleBody) {
      return
    }

    consoleBody.scrollTop = consoleBody.scrollHeight
  }, [latestEventKey])

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="font-mono text-[11px] text-slate-500">
          {lineCountLabel}
        </span>
      </div>
      <div
        className="mt-4 max-h-[21rem] space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-3 font-mono text-[11px] leading-4 text-slate-300"
        ref={consoleBodyRef}
      >
        {events.length > 0 ? (
          <>
            {events.map((event) => (
              <div
                className="grid grid-cols-[38px_86px_minmax(0,1fr)] gap-1.5"
                key={`${event.elapsedMs}-${event.label}-${event.message}`}
              >
                <span className="text-[10px] text-slate-500">{formatElapsedTime(event.elapsedMs)}</span>
                <span className={`whitespace-nowrap text-[10px] font-semibold ${getLabelClassName(event.tone)}`}>
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
