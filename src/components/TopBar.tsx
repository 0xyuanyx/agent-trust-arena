type TopBarProps = {
  title: string
  subtitle: string
  badges: string[]
  primaryAction: string
  secondaryAction: string
}

export function TopBar({
  title,
  subtitle,
  badges,
  primaryAction,
  secondaryAction,
}: TopBarProps) {
  return (
    <header className="border-b border-white/10 bg-slate-950/95 px-6 py-4">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-normal text-white">{title}</h1>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-medium text-cyan-100"
                  key={badge}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/5">
            {secondaryAction}
          </button>
          <button className="rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">
            {primaryAction}
          </button>
        </div>
      </div>
    </header>
  )
}
