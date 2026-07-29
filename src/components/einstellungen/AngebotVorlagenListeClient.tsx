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

function posCount(v: AngebotVorlage): number {
  return Array.isArray(v.positionen) ? v.positionen.length : 0
}

export function AngebotVorlagenListeClient({ vorlagen }: { vorlagen: AngebotVorlage[] }) {
  return (
    <Card
      title="Angebot-Vorlagen"
      action={
        <Link href="/einstellungen/vorlagen/neu" className="btn primary sm">
          + Neue Vorlage
        </Link>
      }
    >
      <EinstellungenListBody empty={vorlagen.length === 0 ? 'Noch keine Vorlagen angelegt.' : undefined}>
        {vorlagen.map((v) => (
          <EinstellungenListItem key={v.id}>
            <Link href={`/einstellungen/vorlagen/${v.id}`} className="min-w-0 flex-1 no-underline">
              <p className="text-[13.5px] font-medium text-bw-text">{v.name}</p>
              <EinstellungenListMeta>
                {posCount(v)} Positionen · {betragAnzeige(v.gesamt_fix ?? null, v.gesamt_min, v.gesamt_max)}
              </EinstellungenListMeta>
            </Link>
          </EinstellungenListItem>
        ))}
      </EinstellungenListBody>
    </Card>
  )
}
