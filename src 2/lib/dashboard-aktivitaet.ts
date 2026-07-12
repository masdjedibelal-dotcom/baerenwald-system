import { betragAnzeige, kundeNameAusAngebot } from '@/lib/angebot-einfach'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import { STATUS_LABELS, formatRelativeDate } from '@/lib/utils'
import type { AngebotListeEintrag, AuftragListeEintrag, LeadWithAngebote } from '@/lib/types'

export type DashboardAktivitaetEintrag = {
  id: string
  titel: string
  untertitel: string
  href: string
  typ: 'Anfrage' | 'Angebot' | 'Auftrag'
}

function leadName(l: LeadWithAngebote) {
  return leadKontaktAnzeigeName(l, 'Unbekannt')
}

/** Letzte CRM-Ereignisse für die Dashboard-Aktivitäts-Card. */
export function buildDashboardAktivitaet(
  anfragen: LeadWithAngebote[],
  angebote: AngebotListeEintrag[],
  auftraege: AuftragListeEintrag[],
  limit = 64
): DashboardAktivitaetEintrag[] {
  const items: (DashboardAktivitaetEintrag & { ts: number })[] = []

  for (const l of anfragen.slice(0, 20)) {
    const status = STATUS_LABELS[l.status] ?? l.status
    items.push({
      id: `lead-${l.id}`,
      titel: leadName(l),
      untertitel: `Neue Anfrage · ${status} · ${formatRelativeDate(l.created_at)}`,
      href: `/anfragen/${l.id}`,
      typ: 'Anfrage',
      ts: new Date(l.created_at).getTime(),
    })
  }

  for (const a of angebote.slice(0, 20)) {
    const kunde = kundeNameAusAngebot(a)
    const preis = betragAnzeige(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)
    items.push({
      id: `ang-${a.id}`,
      titel: kunde,
      untertitel: `Angebot · ${preis} · ${formatRelativeDate(a.created_at)}`,
      href: `/angebote/${a.id}`,
      typ: 'Angebot',
      ts: new Date(a.created_at ?? 0).getTime(),
    })
  }

  for (const o of auftraege.slice(0, 20)) {
    const titel = o.titel?.trim() || o.kunden?.name?.trim() || 'Auftrag'
    items.push({
      id: `auf-${o.id}`,
      titel,
      untertitel: `Auftrag in Bearbeitung · ${formatRelativeDate(o.updated_at ?? o.created_at)}`,
      href: `/auftraege/${o.id}`,
      typ: 'Auftrag',
      ts: new Date(o.updated_at ?? o.created_at ?? 0).getTime(),
    })
  }

  return items
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
    .map(({ titel, untertitel, href, typ, id }) => ({ titel, untertitel, href, typ, id }))
}
