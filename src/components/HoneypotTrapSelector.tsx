type TrapOption = {
  id: string
  name: string
  severity: string
  objective: string
  details: {
    label: string
    value: string
  }[]
}

type HoneypotTrapSelectorProps = {
  title: string
  description: string
  runLabel: string
  selectedId: string
  traps: TrapOption[]
  onSelect: (id: string) => void
  onRun: () => void
}

export function HoneypotTrapSelector({
  title,
  description,
  runLabel,
  selectedId,
  traps,
  onSelect,
  onRun,
}: HoneypotTrapSelectorProps) {
  const selectedTrap = traps.find((trap) => trap.id === selectedId) ?? traps[0]

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <button
          className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          onClick={onRun}
          type="button"
        >
          {runLabel}
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {traps.map((trap) => (
          <button
            className={
              trap.id === selectedId
                ? 'rounded-lg border border-cyan-300/70 bg-cyan-300/10 p-3 text-left'
                : 'rounded-lg border border-white/10 bg-slate-950/60 p-3 text-left transition hover:border-white/25'
            }
            key={trap.id}
            onClick={() => onSelect(trap.id)}
            type="button"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-cyan-200">{trap.id}</span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-300">
                {trap.severity}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-white">{trap.name}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">{trap.objective}</p>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {selectedTrap.details.map((detail) => (
          <Detail key={detail.label} label={detail.label} value={detail.value} />
        ))}
      </div>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  )
}
