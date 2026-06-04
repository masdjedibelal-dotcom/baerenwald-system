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
    // Im Browser steht oft nur die generische RSC-Meldung; der echte Stack steht in den Server-Logs (Terminal).
    console.error('[Dashboard error]', {
      digest: error.digest ?? null,
      message: error.message,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-6 text-center shadow-card">
      <h1 className="text-lg font-semibold text-ink">Etwas ist schiefgelaufen</h1>
      <p className="mt-2 text-sm text-muted">
        Bitte erneut versuchen oder zur Übersicht wechseln.
      </p>
      {error.message?.includes('Loading chunk') ? (
        <p className="mt-2 text-left text-xs text-muted">
          Bei <strong>ChunkLoadError</strong>: Dev-Server stoppen, im Projektordner{' '}
          <code className="rounded bg-canvas px-1">npm run dev:clean</code> ausführen, dann Hard-Reload (
          <code className="rounded bg-canvas px-1">Cmd+Shift+R</code>).
        </p>
      ) : null}
      <p className="mt-3 text-left text-xs text-muted">
        Die Zeile mit <code className="rounded bg-canvas px-1">2117-….js</code> kommt vom gebündelten Next.js-Code im
        Browser. Sie ist <strong>kein</strong> Hinweis auf die Ursache — Server-Component-Fehler werden in Production
        absichtlich nicht an den Client durchgereicht.
      </p>
      {error.digest ? (
        <p className="mt-3 text-left text-xs text-muted">
          <span className="font-medium text-ink">Digest (für Abgleich in den Netlify-Server-Logs):</span>
        </p>
      ) : null}
      {error.digest ? (
        <p className="mt-1 rounded-md bg-canvas px-2 py-2 font-mono text-xs text-ink break-all">{error.digest}</p>
      ) : null}
      {error.message ? (
        <p className="mt-3 rounded-md bg-canvas px-2 py-1 text-left font-mono text-xs text-danger">{error.message}</p>
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
