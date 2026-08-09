'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { KiVisualisierung } from '@/lib/visualize/types'
import { formatDatumZeit } from '@/lib/utils'

export function AngebotVisualisierungenTab({
  angebotId,
  sessions,
}: {
  angebotId: string
  sessions: KiVisualisierung[]
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-bw-text-muted">
          KI-Visualisierungen für dieses Angebot — Vorher/Nachher für Kunden-PDF und Mail.
        </p>
        <Link href={`/angebote/${angebotId}/visualisierung`}>
          <Button type="button" variant="primary" className="bg-[#1A3D2B]">
            <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
            Neue Visualisierung
          </Button>
        </Link>
      </div>

      {!sessions.length ? (
        <Card>
          <p className="text-sm text-bw-text-muted">Noch keine Visualisierungen. Erstelle die erste mit Ist-Fotos und einem Prompt.</p>
        </Card>
      ) : (
        <ul className="divide-y divide-bw-border rounded-xl border border-bw-border bg-white">
          {sessions.map((s) => {
            const thumb =
              s.ausgewaehlte_urls[0] ??
              s.prompt_history[s.prompt_history.length - 1]?.ergebnis_url ??
              s.ist_bilder_urls[0]
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-bw-bg">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-bw-text-muted">—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-bw-text">
                    {formatDatumZeit(s.created_at)}
                    <span className="ml-2 text-xs font-normal text-bw-text-muted">
                      {s.prompt_history.length} Version{s.prompt_history.length === 1 ? '' : 'en'}
                    </span>
                  </p>
                  <p className="text-xs text-bw-text-muted">
                    Status: {s.status} · Im Angebot: {s.ins_angebot ? 'Ja' : 'Nein'}
                  </p>
                </div>
                <Link
                  href={`/angebote/${angebotId}/visualisierung?session=${encodeURIComponent(s.id)}`}
                  className="text-sm text-bw-link hover:underline"
                >
                  Öffnen →
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
