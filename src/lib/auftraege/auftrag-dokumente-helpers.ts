import { gesendetAmWert } from '@/lib/angebot-einfach'
import type { RechnungAuswahlZeile } from '@/lib/rechnungen/rechnung-wizard-types'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import type { Angebot, AngebotHandwerkerRow, AuftragDetail } from '@/lib/types'
import {
  parseHwAnhangStoragePaths,
  partnerHwDokumentListenName,
} from '@/lib/partner/partner-hw-dokument-typen'
import { normalizeUrlList } from '@/lib/utils'

function dokumentDatumMs(datum: string | null | undefined): number {
  if (!datum?.trim()) return 0
  const ms = new Date(datum).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

/** Neueste zuerst; ohne Datum unten; bei Gleichstand alphabetisch (wie Kunden-/Partnerportal). */
export function sortDokumentZeilenNachDatum<T extends { datum: string; name: string }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const ta = dokumentDatumMs(a.datum)
    const tb = dokumentDatumMs(b.datum)
    if (ta !== tb) {
      if (ta === 0) return 1
      if (tb === 0) return -1
      return tb - ta
    }
    return a.name.localeCompare(b.name, 'de')
  })
}

/** Sichtbarkeit Angebot im Kundenportal (portal-dokumente.ts). */
export function isAngebotKundenportalSichtbar(
  ang: Pick<Angebot, 'gesendet_am' | 'gesendet_kunde_at' | 'status_einfach' | 'status'>
): boolean {
  const st = (ang.status_einfach ?? ang.status ?? '').toLowerCase()
  return (
    Boolean(gesendetAmWert(ang)) ||
    st === 'gesendet' ||
    st === 'angenommen' ||
    st === 'kunde_akzeptiert'
  )
}

export type AuftragDokumentZeile = {
  id: string
  name: string
  beschreibung: string
  datum: string
  fuerKunde: boolean
  href: string
  quelle: 'timeline' | 'rechnung' | 'protokoll' | 'angebot' | 'vertrag' | 'handwerker'
  timelineId?: string
  /** Storage-Pfad im Bucket handwerker-uploads — wird serverseitig signiert. */
  storagePath?: string
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
    .filter((r) => (r.status ?? '').toLowerCase() === 'gesendet' && Boolean(r.pdf_url?.trim()))
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
    .map((v) => {
      const istErgaenzung = v.dokument_art === 'ergaenzung'
      const bezug = v.bezug_vertrag_vom?.trim()
        ? `Bezug: Vertrag vom ${v.bezug_vertrag_vom.trim()}`
        : v.bezug_vertrags_nr?.trim()
          ? `Bezug: ${v.bezug_vertrags_nr.trim()}`
          : null
      return {
        id: `vertrag-${v.id}`,
        name:
          v.dokument_titel?.trim() ||
          (istErgaenzung ? 'Ergänzungsvereinbarung' : 'Nachunternehmervertrag'),
        beschreibung: [v.gewerk_name, bezug, v.status === 'unterschrieben' ? 'unterschrieben' : 'PDF']
          .filter(Boolean)
          .join(' · '),
        datum: v.updated_at ?? v.created_at,
        fuerKunde: false,
        href: v.pdf_url!.trim(),
        quelle: 'vertrag' as const,
      }
    })
}

export function angebotHandwerkerAusAuftragDetail(detail: AuftragDetail): AngebotHandwerkerRow[] {
  const ang = angebotAusAuftragDetail(detail) as { angebot_handwerker?: AngebotHandwerkerRow[] | null } | null
  return ang?.angebot_handwerker ?? []
}

export function handwerkerDokumentZeilen(rows: AngebotHandwerkerRow[]): AuftragDokumentZeile[] {
  const out: AuftragDokumentZeile[] = []
  for (const row of rows) {
    const gewerkName = row.gewerke?.name?.trim() || 'Gewerk'
    const hwName = row.handwerker?.name?.trim() || 'Handwerker'
    const beschreibung = `${gewerkName} · ${hwName}`

    const paths = parseHwAnhangStoragePaths(row.hw_angebot_anhang_urls, row.hw_angebot_pdf_url)
    const total = paths.length
    paths.forEach((path, i) => {
      out.push({
        id: `hw-${row.id}-unterlage-${i}`,
        name: partnerHwDokumentListenName('unterlage', { index: i, total }),
        beschreibung,
        datum: row.hw_eingereicht_at ?? '',
        fuerKunde: false,
        href: '#',
        storagePath: path,
        quelle: 'handwerker',
      })
    })

    const rechnungPath = row.hw_rechnung_pdf_url?.trim()
    if (rechnungPath) {
      out.push({
        id: `hw-${row.id}-rechnung`,
        name: partnerHwDokumentListenName('rechnung'),
        beschreibung,
        datum: row.hw_rechnung_eingereicht_at ?? '',
        fuerKunde: false,
        href: '#',
        storagePath: rechnungPath,
        quelle: 'handwerker',
      })
    }
  }
  return out
}

export function zaehleHandwerkerDokumente(rows: AngebotHandwerkerRow[]): number {
  return handwerkerDokumentZeilen(rows).length
}

export function abschlussdokumentZeile(detail: AuftragDetail): AuftragDokumentZeile | null {
  const url =
    (detail as { abschlussdokumentation_url?: string | null }).abschlussdokumentation_url?.trim() ??
    null
  const gesendetAt = (detail as { abschlussdokumentation_gesendet_at?: string | null })
    .abschlussdokumentation_gesendet_at

  if (!url) {
    const versendet = (detail.auftrag_timeline ?? []).some(
      (ev) => ev?.typ === 'abschlussdoku_versendet'
    )
    if (!versendet) return null
    const ev = (detail.auftrag_timeline ?? []).find((e) => e?.typ === 'abschlussdoku_versendet')
    const timelinePdf = normalizeUrlList(ev?.foto_urls)[0]?.trim()
    if (!timelinePdf) {
      return {
        id: 'abschlussdoku-pdf',
        name: 'Abschlussdokumentation',
        beschreibung: 'Abschluss',
        datum: ev?.created_at ?? detail.updated_at ?? detail.created_at,
        fuerKunde: Boolean(ev?.fuer_kunde_freigegeben),
        href: `/api/auftraege/${detail.id}/abschlussdokumentation/pdf`,
        quelle: 'protokoll',
      }
    }
    return {
      id: 'abschlussdoku-pdf',
      name: 'Abschlussdokumentation',
      beschreibung: 'Abschluss',
      datum: gesendetAt ?? ev?.created_at ?? detail.updated_at ?? detail.created_at,
      fuerKunde: true,
      href: timelinePdf,
      quelle: 'protokoll',
    }
  }

  return {
    id: 'abschlussdoku-pdf',
    name: 'Abschlussdokumentation',
    beschreibung: 'Abschluss',
    datum: gesendetAt ?? detail.updated_at ?? detail.created_at,
    fuerKunde: true,
    href: url,
    quelle: 'protokoll',
  }
}

export function angebotDokumentZeile(
  detail: AuftragDetail,
  ang: Angebot
): AuftragDokumentZeile | null {
  const href = ang.pdf_url?.trim()
  if (!href) return null
  return {
    id: 'angebot-pdf',
    name: 'Angebot PDF',
    beschreibung: ang.angebotsnr?.trim() || 'Angebot',
    datum: gesendetAmWert(ang) ?? ang.updated_at ?? detail.created_at,
    fuerKunde: isAngebotKundenportalSichtbar(ang),
    href,
    quelle: 'angebot',
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
  if (ang?.pdf_url?.trim()) n += 1
  if (detail.abnahme_protokoll_url) n += 1
  if (abschlussdokumentZeile(detail)) n += 1
  n += zaehleHandwerkerDokumente(angebotHandwerkerAusAuftragDetail(detail))
  return n
}
