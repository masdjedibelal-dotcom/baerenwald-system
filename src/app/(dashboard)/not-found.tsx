import Link from 'next/link'
export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-6 text-center shadow-card">
      <h1 className="text-lg font-semibold text-ink">Nicht gefunden</h1>
      <p className="mt-2 text-sm text-muted">Die angeforderte Seite oder der Eintrag existiert nicht.</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:opacity-95"
      >
        Zurück zum Dashboard
      </Link>
    </div>
  )
}
