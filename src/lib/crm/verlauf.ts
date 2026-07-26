/**
 * Schlanker CRM-Verlauf: nur relevante Ereignisse + Inspect-Ziele für Pop-ups.
 */

import type { AuftragTimelineEvent, LeadTimelineRow } from '@/lib/types'
import { formatRelativeDate, formatTimelineStamp } from '@/lib/utils'
import type { TimelineItem } from '@/components/ui/timeline'

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
 * Dedup: Wenn Lead-Mails existieren, Auftrag-Mail-Zeilen ohne echten Log weglassen
 * (sonst doppelte Auftragsbestätigung).
 */
function dedupeAuftragMailsAgainstLeadEmails(
  leadItems: VerlaufBuiltItem[],
  auftragItems: VerlaufBuiltItem[]
): VerlaufBuiltItem[] {
  const hasLeadEmail = leadItems.some((i) => i.inspect?.kind === 'email')
  if (!hasLeadEmail) return auftragItems
  return auftragItems.filter((i) => {
    const t = normTyp(i.inspect?.typ)
    return t !== 'mail_kunde' && t !== 'mail_handwerker'
  })
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
