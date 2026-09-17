'use client'

import { useEffect, useMemo, useState } from 'react'
import { rechnungPdfHref } from '@/lib/rechnungen/rechnung-pdf-href'
import {
  AnfrageDokumenteTab,
  type AkteProtokollDokument,
} from '@/components/anfragen/AnfrageDokumenteTab'
import { MockDokumenteCard } from '@/components/mock-ui/MockDetailCards'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import {
  loadAbnahmeprotokolleListe,
  type AbnahmeprotokollListeEintrag,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import {
  abnahmeDokumentZeile,
  abschlussdokumentZeile,
} from '@/lib/auftraege/auftrag-dokumente-helpers'
import type { AuftragDetail, LeadDokumentRow, Rechnung } from '@/lib/types'
import { formatDatum } from '@/lib/utils'

const COLS = 'minmax(0, 1fr) auto auto'

function pdfName(detail: Rechnung): string {
  const nr = detail.rechnungsnummer?.trim() || `RE-${detail.id.slice(0, 8).toUpperCase()}`
  return `Rechnung_${nr.replace(/\s+/g, '_')}_Baerenwald.pdf`
}

type RechnungKurz = {
  id: string
  created_at?: string | null
  rechnungsnummer?: string | null
  status?: string | null
  rechnungsdatum?: string | null
  gesendet_at?: string | null
  pdf_url?: string | null
  rechnung_art?: string | null
  abschlag_index?: number | null
  beleg_typ?: string | null
}

function protokolleFromAuftrag(
  auftrag: AuftragDetail | null | undefined,
  liste: AbnahmeprotokollListeEintrag[]
): AkteProtokollDokument[] {
  const byHref = new Map<string, AkteProtokollDokument>()

  function add(doc: AkteProtokollDokument) {
    const href = doc.href.trim()
    if (!href || byHref.has(href)) return
    byHref.set(href, doc)
  }

  if (auftrag) {
    const abnahme = abnahmeDokumentZeile(auftrag)
    if (abnahme) {
      add({
        id: abnahme.id,
        name: abnahme.name,
        href: abnahme.href,
        created_at: abnahme.datum,
        beschreibung: abnahme.beschreibung,
      })
    }
    const abschluss = abschlussdokumentZeile(auftrag)
    if (abschluss) {
      add({
        id: abschluss.id,
        name: abschluss.name,
        href: abschluss.href,
        created_at: abschluss.datum,
        beschreibung: abschluss.beschreibung,
      })
    }
  }

  for (const p of liste) {
    const href = p.pdf_url?.trim()
    if (!href) continue
    if (p.freigabe_status === 'abgelehnt' || p.freigabe_status === 'entwurf') continue
    const label =
      p.ebene === 'handwerker'
        ? `Abnahmeprotokoll${p.handwerker_name ? ` · ${p.handwerker_name}` : ''}`
        : 'Abnahmeprotokoll'
    add({
      id: `abnahme-${p.id}`,
      name: label,
      href,
      created_at: p.an_kunde_gesendet_at ?? p.created_at ?? p.abnahme_datum,
      beschreibung: 'Abnahme',
    })
  }

  return Array.from(byHref.values())
}

/** Eine Dokumente-Liste: aktuelle RE + Geschwister + Angebote + Abnahme/Abschluss + Uploads. */
export function RechnungDokumenteTab({
  detail,
  leadId,
  dokumente = [],
  rechnungen = [],
  angebote = [],
  auftragDetail = null,
  onReload,
}: {
  detail: Rechnung
  leadId?: string | null
  dokumente?: LeadDokumentRow[]
  rechnungen?: RechnungKurz[]
  angebote?: {
    id: string
    created_at: string
    angebotsnr?: string | null
    pdf_url?: string | null
  }[]
  auftragDetail?: AuftragDetail | null
  onReload: () => void
}) {
  const pdfHref = rechnungPdfHref(detail.id, detail.pdf_url)
  const name = pdfName(detail)
  const datum = detail.rechnungsdatum
    ? formatDatum(detail.rechnungsdatum)
    : detail.created_at
      ? formatDatum(detail.created_at.slice(0, 10))
      : '—'

  const auftragId = detail.auftrag_id?.trim() || auftragDetail?.id?.trim() || null
  const [abnahmeListe, setAbnahmeListe] = useState<AbnahmeprotokollListeEintrag[]>([])

  useEffect(() => {
    if (!auftragId) {
      setAbnahmeListe([])
      return
    }
    let cancelled = false
    void loadAbnahmeprotokolleListe(auftragId).then((list) => {
      if (!cancelled) setAbnahmeListe(list)
    })
    return () => {
      cancelled = true
    }
  }, [auftragId, auftragDetail?.abnahme_protokoll_url, auftragDetail?.updated_at])

  const alleRechnungen = useMemo((): RechnungKurz[] => {
    const extra = detail as Rechnung & {
      rechnung_art?: string | null
      abschlag_index?: number | null
    }
    const byId = new Map<string, RechnungKurz>()
    for (const r of rechnungen) byId.set(r.id, r)
    byId.set(detail.id, {
      id: detail.id,
      created_at: detail.created_at,
      rechnungsnummer: detail.rechnungsnummer,
      status: detail.status,
      rechnungsdatum: detail.rechnungsdatum,
      gesendet_at: detail.gesendet_at,
      pdf_url: detail.pdf_url,
      rechnung_art: extra.rechnung_art ?? null,
      abschlag_index: extra.abschlag_index ?? null,
      beleg_typ: detail.beleg_typ,
    })
    return Array.from(byId.values())
  }, [rechnungen, detail])

  const protokolle = useMemo(
    () => protokolleFromAuftrag(auftragDetail, abnahmeListe),
    [auftragDetail, abnahmeListe]
  )

  if (leadId) {
    return (
      <AnfrageDokumenteTab
        leadId={leadId}
        dokumente={dokumente}
        angebote={angebote}
        rechnungen={alleRechnungen}
        immerRechnungIds={[detail.id]}
        protokolle={protokolle}
        onReload={onReload}
      />
    )
  }

  const standaloneRows = [
    {
      key: 'rechnung',
      label: name,
      meta: `Rechnungs-PDF${datum ? ` · ${datum}` : ''}`,
      href: pdfHref,
    },
    ...protokolle.map((p) => ({
      key: p.id ?? p.name,
      label: p.name,
      meta: p.beschreibung?.trim() || 'Protokoll',
      href: p.href,
    })),
  ]

  return (
    <MockDokumenteCard count={standaloneRows.length}>
      <div className="dok-list">
        {standaloneRows.map((row) => (
          <div
            key={row.key}
            className="list-row"
            style={{ gridTemplateColumns: COLS, cursor: 'default' }}
          >
            <div className="dok-list__main min-w-0">
              <div className="dok-list__name">
                <a
                  href={row.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-bw-link"
                >
                  {row.label}
                </a>
                <span className="dok-list__name-size"> · {row.meta}</span>
              </div>
            </div>
            <span className="dok-list__freigabe">
              <span>—</span>
            </span>
            <div className="dok-list__actions">
              <MockBtn
                sm
                kind="ghost"
                icon="eye"
                title="Vorschau"
                onClick={() => window.open(row.href, '_blank')}
              />
              <a href={row.href} download className="btn ghost sm icon" title="Download">
                <MockIcon ctx="btn" n="download" size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </MockDokumenteCard>
  )
}
