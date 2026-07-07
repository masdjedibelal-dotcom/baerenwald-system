import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-4 text-center">
      <h1 className="text-2xl font-semibold text-ink">Seite nicht gefunden</h1>
      <p className="max-w-sm text-sm text-muted">
        Der angeforderte Inhalt existiert nicht oder wurde verschoben.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-lg bg-primary px-4 text-base font-medium text-white hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Zum Dashboard
      </Link>
    </div>
  )
}
