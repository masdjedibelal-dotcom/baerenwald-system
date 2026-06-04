'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { LinkChevron } from '@/components/ui/LinkChevron'
import { ZeitstrahlTypIcon } from '@/components/ui/ZeitstrahlTypIcon'
import {
  ANGEBOT_STATUS_LABELS,
  AUFTRAG_STATUS_LABELS,
  STATUS_LABELS,
  formatDatum,
  formatPreis,
} from '@/lib/utils'
import { sortByDateFieldAsc } from '@/lib/timeline-sort'
import type { KundeDetailPayload } from '@/lib/kunden/load-kunde-detail'

export interface ZeitstrahlEintrag {
  id: string
  datum: string
  typ: 'anfrage' | 'angebot' | 'auftrag' | 'rechnung' | 'notiz' | 'mail'
  titel: string
  beschreibung?: string
  betrag?: number | null
  status?: string
  link?: string
  link_label?: string
}

export function buildZeitstrahl(kunde: KundeDetailPayload): ZeitstrahlEintrag[] {
  const eintraege: ZeitstrahlEintrag[] = []

  for (const lead of kunde.leads ?? []) {
    eintraege.push({
      id: `lead-${lead.id}`,
      datum: lead.created_at,
      typ: 'anfrage',
      titel: 'Anfrage eingegangen',
      beschreibung: lead.bereiche?.length ? lead.bereiche.join(', ') : lead.situation ?? undefined,
      status: STATUS_LABELS[lead.status] ?? lead.status,
      link: `/anfragen/${lead.id}`,
      link_label: 'Zur Anfrage',
    })

    for (const ang of lead.angebote ?? []) {
      eintraege.push({
        id: `angebot-${ang.id}`,
        datum: ang.created_at ?? lead.created_at,
        typ: 'angebot',
        titel: 'Angebot',
        betrag: ang.gesamt_min,
        status: ANGEBOT_STATUS_LABELS[ang.status as keyof typeof ANGEBOT_STATUS_LABELS] ?? ang.status,
        link: `/angebote/${ang.id}`,
        link_label: 'Zum Angebot',
      })
    }
  }

  for (const a of kunde.auftraege ?? []) {
    const ag = a.angebote
    const angebotRow = Array.isArray(ag) ? ag[0] : ag
    eintraege.push({
      id: `auftrag-${a.id}`,
      datum: a.created_at,
      typ: 'auftrag',
      titel: a.titel?.trim() || 'Auftrag',
      betrag: angebotRow?.gesamt_min ?? null,
      status: AUFTRAG_STATUS_LABELS[a.status] ?? a.status,
      link: `/auftraege/${a.id}`,
      link_label: 'Zum Auftrag',
    })
  }

  for (const r of kunde.rechnungen ?? []) {
    eintraege.push({
      id: `rechnung-${r.id}`,
      datum: r.rechnungsdatum,
      typ: 'rechnung',
      titel: `Rechnung ${r.rechnungsnummer}`,
      betrag: r.brutto,
      status: r.status,
      link: `/rechnungen/${r.id}`,
      link_label: 'Zur Rechnung',
    })
  }

  for (const n of kunde.kunden_notizen ?? []) {
    eintraege.push({
      id: `notiz-${n.id}`,
      datum: n.created_at,
      typ: 'notiz',
      titel: 'Notiz',
      beschreibung: n.inhalt,
    })
  }

  for (const m of kunde.email_logs ?? []) {
    eintraege.push({
      id: `mail-${m.id}`,
      datum: m.created_at,
      typ: 'mail',
      titel: m.subject?.trim() || 'E-Mail',
      beschreibung: m.to_email ? `An ${m.to_email}` : undefined,
    })
  }

  return sortByDateFieldAsc(eintraege, 'datum')
}

export function KundenZeitstrahl({ kunde }: { kunde: KundeDetailPayload }) {
  const eintraege = useMemo(() => buildZeitstrahl(kunde), [kunde])

  const gruppen = useMemo(() => {
    const acc: Record<string, ZeitstrahlEintrag[]> = {}
    for (const e of eintraege) {
      const key = new Date(e.datum).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
      if (!acc[key]) acc[key] = []
      acc[key].push(e)
    }
    return acc
  }, [eintraege])

  const gruppenKeys = Object.keys(gruppen)

  if (!eintraege.length) {
    return <p className="text-sm text-bw-mid">Noch keine Aktivitäten.</p>
  }

  return (
    <div className="space-y-8">
      {gruppenKeys.map((monat) => (
        <section key={monat}>
          <h3 className="mb-3 border-b border-bw-border pb-1 text-xs font-semibold uppercase tracking-wide text-bw-mid">
            {monat}
          </h3>
          <ul className="space-y-4">
            {gruppen[monat].map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <ZeitstrahlTypIcon typ={e.typ} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-bw-text">{e.titel}</span>
                    <span className="text-xs text-bw-light">{formatDatum(e.datum)}</span>
                  </div>
                  {e.beschreibung ? (
                    <p className="mt-0.5 text-bw-mid line-clamp-3">{e.beschreibung}</p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-bw-mid">
                    {e.status ? <span>{e.status}</span> : null}
                    {e.betrag != null ? <span>{formatPreis(e.betrag)}</span> : null}
                    {e.link ? (
                      <Link href={e.link} className="font-medium text-bw-link hover:underline">
                        <LinkChevron>{e.link_label ?? 'Öffnen'}</LinkChevron>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
