/**
 * Schlanker CRM-Verlauf: nur relevante Ereignisse + Inspect-Ziele für Pop-ups.
 */

import type { AuftragTimelineEvent, LeadTimelineRow } from '@/lib/types'
import { formatRelativeDate, formatTimelineStamp } from '@/lib/utils'
import type { TimelineItem } from '@/components/ui/timeline'
import {
  buildRechnungMahnverlauf,
  type RechnungMahnKontext,
} from '@/lib/rechnungen/mahnverlauf'

export type RechnungMahnMailZeile = {
  id: string
  betreff: string
  created_at: string
}

export type VerlaufInspectKind = 'email' | 'angebot' | 'rechnung' | 'event'

export type VerlaufInspectTarget = {
  kind: VerlaufInspectKind
  title: string
  description?: string | null
  createdAt?: string | null
  typ?: string | null
  emailLogId?: string | null
  angebotId?: string | null
  rechnungId?: string | null
  fotoUrls?: string[] | null
  href?: string | null
  hrefLabel?: string | null
}

export type VerlaufBuiltItem = TimelineItem & {
  inspect: VerlaufInspectTarget | null
  ts: number
  source: 'lead' | 'auftrag' | 'fallback' | 'open'
}

/** Lead-Timeline: nur geschäftlich relevante Typen. */
const LEAD_WHITELIST = new Set([
  'email',
  'angebot',
  'angebot_angenommen',
  'created',
  'termin',
  'besichtigung',
  'org_freigabe_angefordert',
  'org_freigabe_ergebnis',
  'rueckfrage',
])

/** Auftrag-Timeline: Meilensteine, Versand, Geld — keine Mikro-Notizen. */
const AUFTRAG_WHITELIST = new Set([
  'auftrag_erstellt',
  'arbeit_gestartet',
  'zur_abnahme',
  'abnahme_abgeschlossen',
  'abnahme',
  'mail_kunde',
  'mail_handwerker',
  'formular_link_gesendet',
  'nachtrag_gesendet',
  'nachtrag_akzeptiert',
  'nachtrag_abgelehnt',
  'baustopp',
  'baustopp_beendet',
  'abschlussdoku_versendet',
  'abnahmeprotokoll_erstellt',
  'rechnung_gesendet',
  'rechnung_bezahlt',
  'rechnung_erinnerung',
  'vor_baubeginn_protokoll',
])

function normTyp(typ: string | null | undefined): string {
  return String(typ ?? '')
    .trim()
    .toLowerCase()
}

function isAngebotBearbeitetNoise(ev: LeadTimelineRow): boolean {
  if (normTyp(ev.typ) !== 'angebot') return false
  return /bearbeitet/i.test(ev.titel ?? '')
}

export function isLeadVerlaufRelevant(ev: LeadTimelineRow): boolean {
  if (ev.email_log_id) return true
  if (isAngebotBearbeitetNoise(ev)) return false
  return LEAD_WHITELIST.has(normTyp(ev.typ))
}

export function isAuftragVerlaufRelevant(ev: AuftragTimelineEvent): boolean {
  if (ev.email_log_id) return true
  return AUFTRAG_WHITELIST.has(normTyp(ev.typ))
}

function leadInspect(ev: LeadTimelineRow): VerlaufInspectTarget {
  const title = ev.titel?.trim() || 'Ereignis'
  const description = ev.beschreibung
  const createdAt = ev.created_at
  const typ = ev.typ

  if (ev.email_log_id) {
    return {
      kind: 'email',
      title,
      description,
      createdAt,
      typ,
      emailLogId: ev.email_log_id,
      angebotId: ev.angebot_id,
      href: ev.angebot_id ? `/angebote/${ev.angebot_id}` : null,
      hrefLabel: ev.angebot_id ? 'Zum Angebot' : null,
    }
  }

  if (ev.angebot_id && (normTyp(ev.typ) === 'angebot' || normTyp(ev.typ) === 'angebot_angenommen')) {
    return {
      kind: 'angebot',
      title,
      description,
      createdAt,
      typ,
      angebotId: ev.angebot_id,
      href: `/angebote/${ev.angebot_id}`,
      hrefLabel: 'Zum Angebot',
    }
  }

  return {
    kind: 'event',
    title,
    description,
    createdAt,
    typ,
    angebotId: ev.angebot_id,
    href: ev.angebot_id ? `/angebote/${ev.angebot_id}` : null,
    hrefLabel: ev.angebot_id ? 'Zum Angebot' : null,
  }
}

function auftragInspect(ev: AuftragTimelineEvent): VerlaufInspectTarget {
  const title = ev.titel?.trim() || 'Ereignis'
  const description = ev.beschreibung
  const createdAt = ev.created_at
  const typ = ev.typ
  const t = normTyp(typ)
  const fotos = Array.isArray(ev.foto_urls) ? ev.foto_urls.filter(Boolean) : null

  if (ev.email_log_id) {
    // Rechnungs-Mails: Filter „Rechnungen“, Klick öffnet Mail-Vorschau (PDF)
    if (t === 'rechnung_gesendet' || t === 'rechnung_bezahlt' || t === 'rechnung_erinnerung') {
      return {
        kind: 'rechnung',
        title,
        description,
        createdAt,
        typ,
        emailLogId: ev.email_log_id,
        fotoUrls: fotos,
        rechnungId: null,
        href: ev.auftrag_id ? `/auftraege/${ev.auftrag_id}?tab=finanzen` : '/vorgaenge?tab=rechnung',
        hrefLabel: 'Zur Abrechnung',
      }
    }
    return {
      kind: 'email',
      title,
      description,
      createdAt,
      typ,
      emailLogId: ev.email_log_id,
      fotoUrls: fotos,
      href: ev.auftrag_id ? `/auftraege/${ev.auftrag_id}` : null,
      hrefLabel: ev.auftrag_id ? 'Zum Auftrag' : null,
    }
  }

  if (t === 'rechnung_gesendet' || t === 'rechnung_bezahlt' || t === 'rechnung_erinnerung') {
    return {
      kind: 'rechnung',
      title,
      description,
      createdAt,
      typ,
      fotoUrls: fotos,
      href: ev.auftrag_id ? `/auftraege/${ev.auftrag_id}?tab=finanzen` : '/vorgaenge?tab=rechnung',
      hrefLabel: 'Zur Abrechnung',
    }
  }

  if (t === 'mail_kunde' || t === 'mail_handwerker' || t === 'formular_link_gesendet' || t === 'abschlussdoku_versendet') {
    return {
      kind: 'event',
      title,
      description,
      createdAt,
      typ,
      fotoUrls: fotos,
      href: ev.auftrag_id ? `/auftraege/${ev.auftrag_id}` : null,
      hrefLabel: ev.auftrag_id ? 'Zum Auftrag' : null,
    }
  }

  return {
    kind: 'event',
    title,
    description,
    createdAt,
    typ,
    fotoUrls: fotos,
    href: ev.auftrag_id ? `/auftraege/${ev.auftrag_id}` : null,
    hrefLabel: ev.auftrag_id ? 'Zum Auftrag' : null,
  }
}

function toItem(
  id: string,
  text: string,
  createdAt: string,
  inspect: VerlaufInspectTarget | null,
  source: VerlaufBuiltItem['source'],
  state: TimelineItem['state'] = 'done'
): VerlaufBuiltItem {
  return {
    id,
    text,
    time: formatTimelineStamp(createdAt) || formatRelativeDate(createdAt),
    state,
    inspectable: Boolean(inspect),
    inspect,
    ts: new Date(createdAt).getTime(),
    source,
  }
}

/**
 * Dedup: Auftragsbestätigung nicht doppelt (Lead-Mail + Auftrag-Mail).
 * Auftrag-Mails mit eigenem email_log_id behalten (Bautagebuch, Nachtrag, …).
 */
function dedupeAuftragMailsAgainstLeadEmails(
  leadItems: VerlaufBuiltItem[],
  auftragItems: VerlaufBuiltItem[]
): VerlaufBuiltItem[] {
  const leadEmailIds = new Set(
    leadItems
      .map((i) => i.inspect?.emailLogId?.trim())
      .filter((id): id is string => Boolean(id))
  )
  const hasLeadEmail = leadItems.some((i) => i.inspect?.kind === 'email')
  return auftragItems.filter((i) => {
    const t = normTyp(i.inspect?.typ)
    if (t !== 'mail_kunde' && t !== 'mail_handwerker') return true
    const logId = i.inspect?.emailLogId?.trim()
    if (logId && leadEmailIds.has(logId)) return false
    if (logId) return true
    if (hasLeadEmail) return false
    return true
  })
}

/**
 * Mahnpunkte (Erinnerungen / interne Warnung) als normale Verlaufseinträge —
 * nur tatsächlich versendete Stufen, keine offene Prozess-Timeline.
 */
export function buildRechnungMahnVerlaufItems(
  rechnung: RechnungMahnKontext & { id?: string },
  mahnMails: RechnungMahnMailZeile[] = []
): VerlaufBuiltItem[] {
  if ((rechnung.beleg_typ ?? 'rechnung') === 'gutschrift') return []

  const stufen = buildRechnungMahnverlauf(rechnung)
  const stufe1Mail = mahnMails[0] ?? null
  const stufe2Mail = mahnMails[1] ?? null
  const items: VerlaufBuiltItem[] = []

  for (const s of stufen) {
    if (!s.sentAt) continue
    // Prozess-Start „Rechnung versendet“ gehört nicht zu den Mahnpunkten
    if (s.id === 'rechnung') continue

    const mail =
      s.id === 'stufe1' ? stufe1Mail : s.id === 'stufe2' ? stufe2Mail : null

    const inspect: VerlaufInspectTarget = mail
      ? {
          kind: 'email',
          title: s.label,
          description: s.hint ?? mail.betreff,
          createdAt: s.sentAt,
          typ: 'rechnung_erinnerung',
          emailLogId: mail.id,
        }
      : {
          kind: 'rechnung',
          title: s.label,
          description: s.hint ?? null,
          createdAt: s.sentAt,
          typ: 'rechnung_erinnerung',
          rechnungId: rechnung.id ?? null,
          href: rechnung.id ? `/rechnungen/${rechnung.id}` : null,
          hrefLabel: rechnung.id ? 'Zur Rechnung' : null,
        }

    items.push(toItem(`mahn-${s.id}`, s.label, s.sentAt, inspect, 'fallback', 'done'))
  }

  return items
}

export function buildLeadVerlaufItems(
  events: LeadTimelineRow[],
  opts?: {
    fallbackCreatedAt?: string
    fallbackCreatedLabel?: string
  }
): VerlaufBuiltItem[] {
  const relevant = events.filter(isLeadVerlaufRelevant)
  const items = relevant.map((ev) =>
    toItem(
      ev.id,
      ev.beschreibung ? `${ev.titel} — ${ev.beschreibung}` : ev.titel,
      ev.created_at,
      leadInspect(ev),
      'lead'
    )
  )

  if (items.length) return items.sort((a, b) => a.ts - b.ts)

  if (opts?.fallbackCreatedAt && opts.fallbackCreatedLabel) {
    return [
      toItem(
        'fallback-created',
        opts.fallbackCreatedLabel,
        opts.fallbackCreatedAt,
        {
          kind: 'event',
          title: opts.fallbackCreatedLabel,
          createdAt: opts.fallbackCreatedAt,
        },
        'fallback'
      ),
    ]
  }
  return []
}

export function buildAuftragVerlaufItems(
  auftragEvents: AuftragTimelineEvent[],
  leadEvents: LeadTimelineRow[] = []
): VerlaufBuiltItem[] {
  const leadItems = buildLeadVerlaufItems(leadEvents)
  const auftragRaw = auftragEvents
    .filter(isAuftragVerlaufRelevant)
    .map((ev) =>
      toItem(
        ev.id,
        ev.beschreibung ? `${ev.titel} — ${ev.beschreibung}` : ev.titel,
        ev.created_at,
        auftragInspect(ev),
        'auftrag'
      )
    )
  const auftragItems = dedupeAuftragMailsAgainstLeadEmails(leadItems, auftragRaw)
  return [...leadItems, ...auftragItems].sort((a, b) => a.ts - b.ts)
}

export function asTimelineItems(items: VerlaufBuiltItem[]): TimelineItem[] {
  return items.map(({ id, text, time, state, inspectable, linkLabel, onLinkClick }) => ({
    id,
    text,
    time,
    state,
    inspectable,
    linkLabel,
    onLinkClick,
  }))
}

/** Filter-Chips / Card-Farben für die Aktivitäts-Ansicht */
export type VerlaufCardKategorie =
  | 'email'
  | 'angebot'
  | 'rechnung'
  | 'termin'
  | 'status'
  | 'offen'
  | 'sonstiges'

export const VERLAUF_CARD_FILTERS: {
  id: VerlaufCardKategorie | 'alle'
  label: string
  icon?: string
}[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'email', label: 'E-Mails', icon: 'mail' },
  { id: 'angebot', label: 'Angebote', icon: 'file-invoice' },
  { id: 'rechnung', label: 'Rechnungen', icon: 'receipt' },
  { id: 'termin', label: 'Termine', icon: 'calendar-event' },
  { id: 'status', label: 'Status', icon: 'activity' },
  { id: 'offen', label: 'Offen', icon: 'circle' },
]

export function verlaufCardKategorie(item: VerlaufBuiltItem): VerlaufCardKategorie {
  if (item.state === 'open' || item.source === 'open') return 'offen'
  const kind = item.inspect?.kind
  if (kind === 'email') return 'email'
  if (kind === 'angebot') return 'angebot'
  if (kind === 'rechnung') return 'rechnung'
  const typ = normTyp(item.inspect?.typ)
  if (typ === 'termin' || typ === 'besichtigung') return 'termin'
  if (
    typ === 'created' ||
    typ === 'auftrag_erstellt' ||
    typ === 'arbeit_gestartet' ||
    typ === 'zur_abnahme' ||
    typ === 'abnahme' ||
    typ === 'abnahme_abgeschlossen' ||
    typ.startsWith('org_freigabe') ||
    typ.startsWith('nachtrag') ||
    typ.startsWith('baustopp')
  ) {
    return 'status'
  }
  if (typ === 'mail_kunde' || typ === 'mail_handwerker' || typ.includes('mail')) return 'email'
  return 'sonstiges'
}

export type VerlaufCardView = {
  kategorie: VerlaufCardKategorie
  badge: string
  title: string
  subtitle: string | null
  meta: string[]
  dateLabel: string
  clickable: boolean
}

export function verlaufCardView(item: VerlaufBuiltItem): VerlaufCardView {
  const kategorie = verlaufCardKategorie(item)
  const raw = (item.text ?? '').trim()
  const split = raw.includes(' — ')
    ? raw.split(' — ')
    : raw.includes(' – ')
      ? raw.split(' – ')
      : null
  const title = (split?.[0] ?? item.inspect?.title ?? (raw || 'Ereignis')).trim()
  const subtitle =
    (split?.slice(1).join(' — ') || item.inspect?.description || '').trim() || null

  const badgeByKat: Record<VerlaufCardKategorie, string> = {
    email: 'E-Mail',
    angebot: 'Angebot',
    rechnung: 'Rechnung',
    termin: 'Termin',
    status: 'Status',
    offen: 'Offen',
    sonstiges: 'Aktivität',
  }
  let badge = badgeByKat[kategorie]
  const typ = normTyp(item.inspect?.typ)
  if (kategorie === 'email' && typ.includes('handwerker')) badge = 'E-Mail · Partner'
  if (typ === 'rechnung_bezahlt') badge = 'Bezahlt'
  if (typ === 'rechnung_erinnerung') badge = 'Mahnung'
  if (typ === 'angebot_angenommen') badge = 'Angenommen'

  const meta: string[] = []
  if (item.inspect?.emailLogId) meta.push('Vorschau')
  if (item.inspect?.fotoUrls && item.inspect.fotoUrls.length > 0) {
    meta.push(
      `${item.inspect.fotoUrls.length} Foto${item.inspect.fotoUrls.length === 1 ? '' : 's'}`
    )
  }
  if (item.inspect?.hrefLabel && item.inspect.href) {
    meta.push(item.inspect.hrefLabel.replace(/^Zum /, ''))
  }
  if (kategorie === 'offen') meta.push('Nächster Schritt')

  return {
    kategorie,
    badge,
    title,
    subtitle: subtitle && subtitle !== title ? subtitle : null,
    meta: meta.slice(0, 3),
    dateLabel: item.time,
    clickable: Boolean(item.inspect) && item.state !== 'open',
  }
}
