'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import {
  EinstellungenListBody,
  EinstellungenListItem,
  EinstellungenListMeta,
} from '@/components/einstellungen/EinstellungenUi'
import type { AngebotVorlage } from '@/lib/types'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { confirmDelete } from '@/components/ui/confirm-delete'
import { toast } from '@/components/ui/app-toast'
import { deleteAngebotVorlage } from '@/app/(dashboard)/angebote/actions'

function posCount(v: AngebotVorlage): number {
  return Array.isArray(v.positionen) ? v.positionen.length : 0
}

export function AngebotVorlagenListeClient({ vorlagen }: { vorlagen: AngebotVorlage[] }) {
  const router = useRouter()

  function rowMenu(v: AngebotVorlage): EntityMenuItem[] {
    return [
      {
        icon: 'external-link',
        label: 'Öffnen',
        onClick: () => router.push(`/einstellungen/vorlagen/${v.id}`),
      },
      'sep',
      {
        icon: 'trash',
        label: 'Löschen',
        danger: true,
        onClick: () => {
          confirmDelete(
            'Vorlage löschen?',
            async () => {
              const r = await deleteAngebotVorlage(v.id)
              if (!r.ok) {
                toast.error(r.message)
                throw new Error(r.message)
              }
              toast.success('Vorlage gelöscht')
              router.refresh()
            },
            { sub: v.name }
          )
        },
      },
    ]
  }

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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MockEntityRowMenu items={rowMenu(v)} title="Vorlage" />
              <span className="einst-list-chevron" aria-hidden>
                <MockIcon ctx="default" n="chevron-right" size={16} />
              </span>
            </div>
          </EinstellungenListItem>
        ))}
      </EinstellungenListBody>
    </Card>
  )
}
