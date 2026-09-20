'use client'

import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty, MockSortHead } from '@/components/mock-ui'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  EinstellungenListItem,
  EinstellungenListMeta,
} from '@/components/einstellungen/EinstellungenUi'
import type { AngebotVorlage } from '@/lib/types'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { toast } from '@/components/ui/app-toast'
import { deleteAngebotVorlage } from '@/app/(dashboard)/angebote/actions'
import { TOAST } from '@/lib/copy'

function posCount(v: AngebotVorlage): number {
  return Array.isArray(v.positionen) ? v.positionen.length : 0
}

type SortCol = 'name' | 'positionen' | 'betrag'

export function AngebotVorlagenListeClient({ vorlagen }: { vorlagen: AngebotVorlage[] }) {
  const router = useRouter()
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortCol(col)
      setSortDir(1)
    }
  }

  const sorted = useMemo(() => {
    const rows = [...vorlagen]
    rows.sort((a, b) => {
      let cmp = 0
      if (sortCol === 'name') cmp = (a.name || '').localeCompare(b.name || '', 'de')
      else if (sortCol === 'positionen') cmp = posCount(a) - posCount(b)
      else {
        const av = a.gesamt_fix ?? a.gesamt_min ?? 0
        const bv = b.gesamt_fix ?? b.gesamt_min ?? 0
        cmp = av - bv
      }
      return cmp * sortDir
    })
    return rows
  }, [vorlagen, sortCol, sortDir])

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
          openDeleteConfirm(
            'Vorlage löschen?',
            async () => {
              const r = await deleteAngebotVorlage(v.id)
              if (!r.ok) {
                toast.systemError(r)
                throw new Error(r.message)
              }
              toast.success(TOAST.vorlage_geloescht)
              afterServerActionRefresh()
            },
            { sub: v.name }
          )
        },
      },
    ]
  }

  return (
    <MockCard
      title="Angebot-Vorlagen"
      className="einst-list"
      actions={
        <Link href="/einstellungen/vorlagen/neu" className="btn primary sm">
          + Neue Vorlage
        </Link>
      }
    >
      {sorted.length === 0 ? (
        <MockEmpty
          icon="file-text"
          title="Noch keine Vorlagen"
          hint="Lege eine Angebot-Vorlage an, um sie hier zu sehen."
          action={
            <Link href="/einstellungen/vorlagen/neu" className="btn primary sm">
              + Neue Vorlage
            </Link>
          }
        />
      ) : (
        <>
          <div
            className="listcard listcard--cols mb-2 hidden md:grid"
            style={{ ['--list-cols' as string]: 'minmax(0, 1.6fr) 6.25rem 7.5rem 2.5rem' }}
          >
            <div className="list-row head">
              <MockSortHead col="name" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
                Name
              </MockSortHead>
              <MockSortHead col="positionen" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
                Positionen
              </MockSortHead>
              <MockSortHead col="betrag" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)} right>
                Betrag
              </MockSortHead>
              <div />
            </div>
          </div>
          <ul className="einst-list">
            {sorted.map((v) => (
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
          </ul>
        </>
      )}
    </MockCard>
  )
}
