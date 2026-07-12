'use client'

import { Card } from '@/components/ui/Card'
import { KalenderTerminZeile } from '@/components/kalender/KalenderTerminZeile'
import type { KalenderTermin } from '@/lib/types'
import { isHeute } from '@/lib/kalender-auslastung'

export function KalenderHeuteCard({
  termine,
  onTerminClick,
}: {
  termine: KalenderTermin[]
  onTerminClick?: (t: KalenderTermin) => void
}) {
  const heute = termine
    .filter((t) => !t.erledigt && isHeute(t.datum))
    .sort((a, b) => (a.uhrzeit_von ?? '').localeCompare(b.uhrzeit_von ?? ''))

  const label = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })

  return (
    <Card
      title={`Heute · ${label}`}
      bodyClassName="p-0"
    >
      {heute.length === 0 ? (
        <p className="px-4 py-6 text-sm text-bw-text-muted">Keine Termine für heute.</p>
      ) : (
        <div className="divide-y divide-bw-border">
          {heute.map((t) => (
            <KalenderTerminZeile
              key={t.id}
              termin={t}
              onClick={onTerminClick ? () => onTerminClick(t) : undefined}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
