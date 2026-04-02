export function SkeletonKPI() {
  return (
    <div className="rounded-2xl p-5 bg-white border border-slate-100 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="skeleton w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-6 w-32 rounded" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonTabla({ filas = 5, cols = 5 }) {
  return (
    <div className="tabla-panel">
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1 rounded" />
        ))}
      </div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: filas }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="skeleton h-4 flex-1 rounded" style={{ animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonGrafico() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="skeleton h-4 w-40 rounded mb-2" />
      <div className="skeleton h-3 w-28 rounded mb-6" />
      <div className="skeleton h-48 w-full rounded-xl" />
    </div>
  )
}
