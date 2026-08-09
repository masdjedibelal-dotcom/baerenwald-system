'use client'

import Link from 'next/link'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { ProjektKontext, ProjektKetteKind } from '@/lib/crm/projekt-kontext-types'
import { RECHNUNG_STATUS_LABELS } from '@/lib/rechnung-config'
import { hubSpotStatusToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import {
  ANGEBOT_STATUS_LABELS,
  AUFTRAG_STATUS_LABELS,
  STATUS_LABELS,
  formatDatum,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import { PROJEKT_PHASEN_TAB_LABEL } from '@/lib/crm-labels'

type HistorieItem = {
  id: string
  kind: ProjektKetteKind
  title: string
  meta: string
  href: string
  dateLabel: string
  active: boolean
}

type HistorieGroup = {
  phase: 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'
  label: string
  items: HistorieItem[]
}

const PHASE_LABEL: Record<HistorieGroup['phase'], string> = {
  anfrage: 'Anfrage',
  angebot: 'Angebot',
  auftrag: 'Auftrag',
  rechnung: 'Rechnung',
}

function statusLabelAngebot(status: string, statusEinfach: string | null): string {
  const key = (statusEinfach || status || '').toLowerCase()
  const fromAngebot = ANGEBOT_STATUS_LABELS[key as keyof typeof ANGEBOT_STATUS_LABELS]
  if (fromAngebot) return fromAngebot
  const fromLead = STATUS_LABELS[key as keyof typeof STATUS_LABELS]
  if (fromLead) return fromLead
  return status.trim() || '—'
}

function statusLabelAuftrag(status: string): string {
  const key = status.toLowerCase()
  return (
    AUFTRAG_STATUS_LABELS[key as keyof typeof AUFTRAG_STATUS_LABELS] ?? (status.trim() || '—')
  )
}

function statusLabelRechnung(status: string): string {
  const key = status.toLowerCase()
  return (
    RECHNUNG_STATUS_LABELS[key as keyof typeof RECHNUNG_STATUS_LABELS] ?? (status.trim() || '—')
  )
}

function statusLabelLead(status: string): string {
  const key = status.toLowerCase()
  return STATUS_LABELS[key as keyof typeof STATUS_LABELS] ?? (status.trim() || '—')
}

function rechnungTitel(art: string | null | undefined, nr: string): string {
  const a = (art ?? 'voll').toLowerCase()
  const n = nr.trim() || 'Rechnung'
  if (a === 'schluss') return n.startsWith('Schluss') ? n : `Schlussrechnung ${n}`
  if (a === 'abschlag') return n.toLowerCase().includes('abschlag') ? n : `Abschlag · ${n}`
  return n.startsWith('Rechnung') ? n : `Rechnung ${n}`
}

function dateOf(iso: string | null | undefined): string {
  if (!iso) return '—'
  return formatDatum(iso.slice(0, 10))
}

/** Baut Phasen-Gruppen für die Projekt-Historie. */
export function buildProjektHistorieGroups(kontext: ProjektKontext): HistorieGroup[] {
  const groups: HistorieGroup[] = []
  const { activeKind, activeId } = kontext

  if (kontext.lead) {
    groups.push({
      phase: 'anfrage',
      label: PHASE_LABEL.anfrage,
      items: [
        {
          id: kontext.lead.id,
          kind: 'anfrage',
          title: kontext.lead.label,
          meta: statusLabelLead(kontext.lead.status),
          href: `/anfragen/${kontext.lead.id}`,
          dateLabel: dateOf(kontext.lead.created_at),
          active: activeKind === 'anfrage' && activeId === kontext.lead.id,
        },
      ],
    })
  }

  if (kontext.angebote.length) {
    const sorted = [...kontext.angebote].sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at))
    )
    groups.push({
      phase: 'angebot',
      label: PHASE_LABEL.angebot,
      items: sorted.map((a, idx) => {
        const nr = a.angebotsnr?.trim() || a.id.slice(0, 8).toUpperCase()
        const leading = idx === 0
        return {
          id: a.id,
          kind: 'angebot' as const,
          title: leading && sorted.length > 1 ? `Angebot ${nr} · aktuell` : `Angebot ${nr}`,
          meta: statusLabelAngebot(a.status, a.status_einfach),
          href: `/angebote/${a.id}`,
          dateLabel: dateOf(a.created_at),
          active: activeKind === 'angebot' && activeId === a.id,
        }
      }),
    })
  }

  if (kontext.auftrag) {
    groups.push({
      phase: 'auftrag',
      label: PHASE_LABEL.auftrag,
      items: [
        {
          id: kontext.auftrag.id,
          kind: 'auftrag',
          title: kontext.auftrag.titel?.trim() || 'Auftrag',
          meta: statusLabelAuftrag(kontext.auftrag.status),
          href: `/auftraege/${kontext.auftrag.id}`,
          dateLabel: dateOf(kontext.auftrag.created_at),
          active: activeKind === 'auftrag' && activeId === kontext.auftrag.id,
        },
      ],
    })
  }

  if (kontext.rechnungen.length) {
    const sorted = [...kontext.rechnungen].sort((a, b) => {
      const da = String(a.rechnungsdatum || a.created_at || '')
      const db = String(b.rechnungsdatum || b.created_at || '')
      return db.localeCompare(da)
    })
    groups.push({
      phase: 'rechnung',
      label: PHASE_LABEL.rechnung,
      items: sorted.map((r) => ({
        id: r.id,
        kind: 'rechnung' as const,
        title: rechnungTitel(r.rechnung_art, r.rechnungsnummer),
        meta: statusLabelRechnung(r.status),
        href: `/rechnungen/${r.id}`,
        dateLabel: dateOf(r.rechnungsdatum || r.created_at),
        active: activeKind === 'rechnung' && activeId === r.id,
      })),
    })
  }

  return groups.filter((g) => g.items.length > 0)
}

export function ProjektHistorieTab({
  kontext,
}: {
  kontext: ProjektKontext | null | undefined
}) {
  if (!kontext) {
    return (
      <MockEmpty
        icon="history"
        title={`Keine ${PROJEKT_PHASEN_TAB_LABEL}`}
        hint="Projektphasen erscheinen hier, sobald Anfrage, Angebot, Auftrag oder Rechnung verknüpft sind."
      />
    )
  }

  const groups = buildProjektHistorieGroups(kontext)
  if (!groups.length) {
    const reHint =
      kontext.activeKind === 'rechnung'
        ? 'Verknüpfte Phasen fehlen — öffne die Rechnung über Vorgänge (Filter Rechnung) oder aus dem Auftrag unter Finanzen.'
        : 'Noch keine Phasen in diesem Vorgang.'
    return (
      <MockEmpty
        icon="history"
        title={`Keine ${PROJEKT_PHASEN_TAB_LABEL}`}
        hint={reHint}
      />
    )
  }

  return (
    <div className="projekt-historie space-y-4">
      {groups.map((group) => (
        <MockCard key={group.phase} title={group.label} icon="history">
          <ul className="projekt-historie__list">
            {group.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    'projekt-historie__row',
                    item.active && 'projekt-historie__row--active'
                  )}
                  aria-current={item.active ? 'page' : undefined}
                >
                  <div className="projekt-historie__main">
                    <span className="projekt-historie__title">{item.title}</span>
                    <span className="projekt-historie__meta">
                      <MockBadge kind={hubSpotStatusToMockBadgeKind('done')}>{item.meta}</MockBadge>
                      <span className="projekt-historie__date">{item.dateLabel}</span>
                    </span>
                  </div>
                  {item.active ? (
                    <span className="projekt-historie__now">Hier</span>
                  ) : (
                    <MockIcon ctx="default" n="chevron-right" size={16} />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </MockCard>
      ))}
    </div>
  )
}
