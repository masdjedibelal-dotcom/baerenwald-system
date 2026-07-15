import { SkeletonCard, SkeletonList } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 md:px-6">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-[72px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="space-y-2">
        <div className="skeleton h-4 w-16 rounded" />
        <div className="dashboard-grid-2">
          <SkeletonList rows={4} />
          <SkeletonList rows={4} />
        </div>
      </div>
    </div>
  )
}
