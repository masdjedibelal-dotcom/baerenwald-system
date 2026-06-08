import type { RechnungAuswahlZeile } from '@/lib/rechnungen/rechnung-wizard-types'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import type { Angebot, AuftragDetail } from '@/lib/types'
import { normalizeUrlList } from '@/lib/utils'

export type AuftragDokumentZeile = {
  id: string
  name: string
  beschreibung: string
  datum: string
  fuerKunde: boolean
  href: string
  quelle: 'timeline' | 'rechnung' | 'protokoll' | 'angebot' | 'vertrag'
  timelineId?: string
}

/** Einzelnes Angebot aus FK-Join (PostgREST liefert teils ein Objekt, teils Array). */
export function angebotAusAuftragDetail(detail: AuftragDetail): Angebot | null {
  const raw = detail.angebote as unknown
  if (!raw) return null
  if (Array.isArray(raw)) {
    const first = raw[0]
    return first && typeof first === 'object' ? (first as Angebot) : null
  }
  if (typeof raw === 'object') return raw as Angebot
  return null
}

export function timelineDokumentZeilen(detail: AuftragDetail): AuftragDokumentZeile[] {
  const rows: AuftragDokumentZeile[] = []
  for (const ev of detail.auftrag_timeline ?? []) {
    if (!ev?.id) continue
    if (ev.typ === 'bautagebuch') continue
    const fotos = normalizeUrlList(ev.foto_urls)
    if (!fotos.length) continue
    const urls = fotos.length ? fotos : ['']
    urls.forEach((url, i) => {
      rows.push({
        id: `${ev.id}-${i}`,
        timelineId: ev.id,
        name: urls.length > 1 ? `${ev.titel} (${i + 1})` : ev.titel,
        beschreibung: ev.beschreibung?.trim() || '—',
        datum: ev.created_at ?? detail.created_at,
        fuerKunde: Boolean(ev.fuer_kunde_freigegeben),
        href: url || '#',
        quelle: 'timeline',
      })
    })
  }
  return rows
}

export function rechnungDokumentZeilen(rechnungen: RechnungAuswahlZeile[]): AuftragDokumentZeile[] {
  return rechnungen
    .filter((r) => r.pdf_url || r.status === 'gesendet')
    .map((r) => ({
      id: `rechnung-${r.id}`,
      name: r.rechnungsnummer?.trim() || 'Rechnung',
      beschreibung:
        r.status === 'gesendet'
          ? `Rechnung · ${r.status}`
          : `Rechnung · ${r.status ?? 'Entwurf'}`,
      datum: r.gesendet_at ?? r.rechnungsdatum ?? '',
      fuerKunde: r.status === 'gesendet',
      href: r.pdf_url?.trim() || `/api/rechnungen/${r.id}/pdf`,
      quelle: 'rechnung',
    }))
}

export function vertragDokumentZeilen(vertraege: HandwerkerVertragRow[]): AuftragDokumentZeile[] {
  return vertraege
    .filter((v) => v.typ === 'projekt' && v.pdf_url?.trim())
    .map((v) => ({
      id: `vertrag-${v.id}`,
      name: v.vertrags_nr?.trim() || 'Nachunternehmervertrag',
      beschreibung: [v.gewerk_name, v.status === 'unterschrieben' ? 'unterschrieben' : 'PDF']
        .filter(Boolean)
        .join(' · '),
      datum: v.updated_at ?? v.created_at,
      fuerKunde: false,
      href: v.pdf_url!.trim(),
      quelle: 'vertrag',
    }))
}

export function abschlussdokumentZeile(detail: AuftragDetail): AuftragDokumentZeile | null {
  const versendet = (detail.auftrag_timeline ?? []).some(
    (ev) => ev?.typ === 'abschlussdoku_versendet'
  )
  if (!versendet) return null
  const ev = (detail.auftrag_timeline ?? []).find((e) => e?.typ === 'abschlussdoku_versendet')
  return {
    id: 'abschlussdoku-pdf',
    name: 'Abschlussdokumentation',
    beschreibung: 'Abschluss',
    datum: ev?.created_at ?? detail.updated_at ?? detail.created_at,
    fuerKunde: true,
    href: `/api/auftraege/${detail.id}/abschlussdokumentation/pdf`,
    quelle: 'protokoll',
  }
}

export function zaehleAuftragDokumente(
  detail: AuftragDetail,
  rechnungen: RechnungAuswahlZeile[] = [],
  vertraege: HandwerkerVertragRow[] = []
): number {
  let n = timelineDokumentZeilen(detail).length
  n += rechnungDokumentZeilen(rechnungen).length
  n += vertragDokumentZeilen(vertraege).length
  const ang = angebotAusAuftragDetail(detail)
  if (ang?.pdf_url) n += 1
  if (detail.abnahme_protokoll_url) n += 1
  if (abschlussdokumentZeile(detail)) n += 1
  return n
}
