export default function DashboardLoading() {
  return (
    <div className="page-loading" aria-busy="true" aria-label="Wird geladen …">
      <span className="page-loading__spinner" aria-hidden />
    </div>
  )
}
