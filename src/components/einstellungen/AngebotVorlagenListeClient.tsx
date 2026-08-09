'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import {
  EinstellungenListBody,
  EinstellungenListItem,
  EinstellungenListMeta,
} from '@/components/einstellungen/EinstellungenUi'
import type { AngebotVorlage } from '@/lib/types'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { MockIcon } from '@/components/mock-ui/MockIcon'

function posCount(v: AngebotVorlage): number {
  return Array.isArray(v.positionen) ? v.positionen.length : 0
}

export function AngebotVorlagenListeClient({ vorlagen }: { vorlagen: AngebotVorlage[] }) {
  return (
    <Card
      title="Angebot-Vorlagen"
      className="einst-list-card"
      action={
        <Link href="/einstellungen/vorlagen/neu" className="btn primary sm">
          + Neue Vorlage
        </Link>
      }
    >
      <EinstellungenListBody empty={vorlagen.length === 0 ? 'Noch keine Vorlagen angelegt.' : undefined}>
        {vorlagen.map((v) => (
          <EinstellungenListItem key={v.id}>
            <Link href={`/einstellungen/vorlagen/${v.id}`} className="einst-list-link">
              <span className="einst-list-title">{v.name}</span>
              <EinstellungenListMeta>
                {posCount(v)} Positionen · {betragAnzeige(v.gesamt_fix ?? null, v.gesamt_min, v.gesamt_max)}
              </EinstellungenListMeta>
            </Link>
            <span className="einst-list-chevron" aria-hidden>
              <MockIcon ctx="default" n="chevron-right" size={16} />
            </span>
          </EinstellungenListItem>
        ))}
      </EinstellungenListBody>
    </Card>
  )
}
