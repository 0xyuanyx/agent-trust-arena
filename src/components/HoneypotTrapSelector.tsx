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
  disabled?: boolean
}

export function HoneypotTrapSelector({
  title,
  description,
  runLabel,
  selectedId,
  traps,
  onSelect,
  onRun,
  disabled,
}: HoneypotTrapSelectorProps) {
  const selectedTrap = traps.find((trap) => trap.id === selectedId) ?? traps[0]

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {traps.map((trap) => (
          <button
            className={
              trap.id === selectedId
                ? 'min-h-[112px] rounded-lg border border-cyan-300/70 bg-cyan-300/10 p-3 text-left disabled:cursor-not-allowed disabled:opacity-60'
                : 'min-h-[112px] rounded-lg border border-white/10 bg-slate-950/60 p-3 text-left transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-60'
            }
            disabled={disabled}
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
            <h3 className="mt-3 text-sm font-semibold text-white">{trap.name}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">{trap.objective}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-3 md:grid-cols-3">
        {selectedTrap.details.map((detail) => (
          <Detail key={detail.label} label={detail.label} value={detail.value} />
        ))}
        </div>
      </div>
      <button
        className="mt-4 w-full rounded-md bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition enabled:hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={onRun}
        type="button"
      >
        {runLabel}
      </button>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-200">{value}</p>
    </div>
  )
}
