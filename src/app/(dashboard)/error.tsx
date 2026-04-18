'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-6 text-center shadow-card">
      <h1 className="text-lg font-semibold text-ink">Etwas ist schiefgelaufen</h1>
      <p className="mt-2 text-sm text-muted">
        Bitte erneut versuchen oder zur Übersicht wechseln.
      </p>
      {error.message ? (
        <p className="mt-3 rounded-md bg-canvas px-2 py-1 font-mono text-xs text-danger">{error.message}</p>
      ) : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="button" variant="primary" onClick={() => reset()}>
          Erneut versuchen
        </Button>
        <Button type="button" variant="secondary" onClick={() => (window.location.href = '/')}>
          Zurück zum Dashboard
        </Button>
      </div>
    </div>
  )
}
