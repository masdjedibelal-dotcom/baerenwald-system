/** Listen- und Detail-Skeletons für Next.js `loading.tsx` / Suspense. */

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
    <div className="crm-skel-row" aria-hidden>
      <div className="crm-skel-row__main">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
  )
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="crm-skel-list" role="status" aria-busy="true" aria-label="Liste wird geladen">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

/** Listen-Seite: Chip-Leiste + Zeilen (Vorgänge, Kunden, Partner …). */
export function SkeletonListPage({ rows = 8 }: { rows?: number }) {
  return (
    <div className="crm-skel-page" role="status" aria-busy="true" aria-label="Seite wird geladen">
      <div className="crm-skel-listbar">
        <div className="skeleton crm-skel-chip" />
        <div className="skeleton crm-skel-chip" />
        <div className="skeleton crm-skel-chip" />
        <div className="skeleton crm-skel-chip crm-skel-chip--wide" />
      </div>
      <SkeletonList rows={rows} />
    </div>
  )
}

/** Detail-Seite: Kopf + Tab-Nav + Karten. */
export function SkeletonDetailPage() {
  return (
    <div className="crm-skel-page" role="status" aria-busy="true" aria-label="Detail wird geladen">
      <div className="crm-skel-detail-head">
        <div className="skeleton h-3 w-40" />
        <div className="skeleton h-6 w-2/3 max-w-md" />
        <div className="skeleton h-4 w-1/3 max-w-xs" />
      </div>
      <div className="crm-skel-detail-body">
        <div className="crm-skel-detail-nav">
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-8 w-3/4" />
        </div>
        <div className="crm-skel-detail-main">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  )
}
