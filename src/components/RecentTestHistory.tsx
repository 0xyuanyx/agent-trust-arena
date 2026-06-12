type HistoryItem = {
  label: string
  meta: string
  verdict: string
}

type RecentTestHistoryProps = {
  title: string
  items: HistoryItem[]
  emptyState: string
}

export function RecentTestHistory({ title, items, emptyState }: RecentTestHistoryProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item, index) => (
            <article
              className="border-l border-cyan-300/30 pl-3"
              key={`${item.label}-${item.meta}-${index}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-slate-200">{item.label}</h3>
                <span className="rounded-md bg-rose-400/15 px-2 py-1 text-xs font-semibold text-rose-100">
                  {item.verdict}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-400">{emptyState}</p>
        )}
      </div>
    </section>
  )
}
