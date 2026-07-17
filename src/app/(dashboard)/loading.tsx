import { LoadingBlock } from '@/components/layout/LoadingSpinner'

export default function DashboardLoading() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div
          className="skeleton"
          style={{ height: 14, width: 160, borderRadius: 6, marginBottom: 8 }}
        />
        <div
          className="skeleton"
          style={{ height: 24, width: 220, borderRadius: 8 }}
        />
      </div>

      <div
        className="dash-loading"
        style={{ marginBottom: 22 }}
        aria-busy="true"
      >
        <LoadingBlock label="Dashboard wird geladen …" />
      </div>
    </div>
  )
}
