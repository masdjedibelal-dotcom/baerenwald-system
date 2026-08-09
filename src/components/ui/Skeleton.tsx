export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-title" />
      <div className="skeleton-text" />
      <div className="skeleton-text w-3/4" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="list-row">
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
  )
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
