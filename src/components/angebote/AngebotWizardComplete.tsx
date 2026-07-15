'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Props = {
  angebotId: string
  kundeName: string
  versendet?: boolean
  onClose: () => void
}

export function AngebotWizardComplete({ angebotId, kundeName, versendet = false, onClose }: Props) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-order-bg text-status-order-text">
        <CheckCircle2 className="h-9 w-9" aria-hidden />
      </div>
      <h2 className="text-xl font-semibold text-bw-text">
        {versendet ? 'Angebot versendet' : 'Angebot erstellt'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-bw-text-muted">
        {versendet ? (
          <>
            Das Angebot für <strong className="font-medium text-bw-text">{kundeName}</strong> wurde
            erstellt und per E-Mail verschickt.
          </>
        ) : (
          <>
            Der Entwurf für <strong className="font-medium text-bw-text">{kundeName}</strong> ist
            gespeichert. Als Nächstes Handwerker anfragen oder das Angebot prüfen.
          </>
        )}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {versendet ? (
          <Link
            href={`/angebote/${angebotId}`}
            className="btn btn-primary btn-sm inline-flex gap-1.5"
            onClick={onClose}
          >
            Zum Angebot
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <Link
            href={`/angebote/${angebotId}#angebot-versand-handwerker`}
            className="btn btn-primary btn-sm inline-flex gap-1.5"
            onClick={onClose}
          >
            <Send className="h-4 w-4" aria-hidden />
            Handwerker anfragen
          </Link>
        )}
        {!versendet ? (
          <Link
            href={`/angebote/${angebotId}`}
            className="btn btn-secondary btn-sm inline-flex gap-1.5"
            onClick={onClose}
          >
            Zum Angebot
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Schließen
        </Button>
      </div>
    </div>
  )
}
