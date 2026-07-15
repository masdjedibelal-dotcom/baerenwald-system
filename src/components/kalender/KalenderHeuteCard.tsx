'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
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
    <MockCard title={`Heute · ${label}`} icon="calendar-event">
      {heute.length === 0 ? (
        <MockEmpty icon="calendar-event" title="Keine Termine" hint="Heute steht nichts an." />
      ) : (
        <div style={{ margin: -14 }}>
          {heute.map((t) => (
            <KalenderTerminZeile
              key={t.id}
              termin={t}
              onClick={onTerminClick ? () => onTerminClick(t) : undefined}
            />
          ))}
        </div>
      )}
    </MockCard>
  )
}
