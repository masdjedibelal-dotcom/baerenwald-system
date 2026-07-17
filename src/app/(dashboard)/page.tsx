import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { MockDashboardClient } from '@/components/dashboard/MockDashboardClient'
import type { MockDashboardKpi, MockDashboardPhase } from '@/components/dashboard/MockDashboardClient'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotListeEintrag, AngebotPosition, LeadWithAngebote } from '@/lib/types'
import type { AuftragListeEintrag } from '@/lib/types'
import type { RechnungListeZeile } from '@/lib/types'
import { filterOutLegacyDemoLeads } from '@/lib/legacy-demo-data'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import { formatDatum } from '@/lib/utils'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { angebotKundenName, angebotSubline } from '@/components/dashboard/dashboard-list-utils'
import {
  angebotDashboardBadge,
  auftragDashboardBadge,
  isAktiverAuftragStatus,
  isNeueAnfrageStatus,
  isOffeneRechnungStatus,
  isOffenesAngebotStatus,
  leadDashboardBadge,
  rechnungDashboardBadge,
} from '@/lib/dashboard-mock-mapping'
import { RECHNUNGEN_LISTE_SELECT } from '@/lib/rechnungen/rechnungen-liste-data'

export const revalidate = 60

function parseAngebote(rows: unknown[]): AngebotListeEintrag[] {
  try {
    return (rows ?? []).map((row) => {
      const r = row as AngebotListeEintrag & { positionen: unknown }
      return {
        ...r,
        positionen: normalizeAngebotPositionen(r.positionen) as AngebotPosition[],
      }
    })
  } catch (e) {
    console.error('parseAngebote', e)
    return []
  }
}

type SupabaseErr = { message: string } | null

async function safeRows<T>(
  run: () => PromiseLike<{ data: T[] | null; error: SupabaseErr }>
): Promise<T[]> {
  try {
    const { data, error } = await run()
    if (error) throw error
    return data ?? []
  } catch (e) {
    console.error(e)
    return []
  }
}

async function safeMaybeSingle<T>(
  run: () => PromiseLike<{ data: T | null; error: SupabaseErr }>
): Promise<T | null> {
  try {
    const { data, error } = await run()
    if (error) throw error
    return data
  } catch (e) {
    console.error(e)
    return null
  }
}

function rechnungTitel(r: RechnungListeZeile): string {
  const nr = r.rechnungsnummer?.trim()
  const auftrag = Array.isArray(r.auftraege) ? r.auftraege[0] : r.auftraege
  const projekt = auftrag?.titel?.trim()
  if (nr && projekt) return `${nr} — ${projekt}`
  if (projekt) return projekt
  if (nr) return nr
  return 'Rechnung'
}

export default async function DashboardPage() {
  const supabase = createClient()

  let user: { id: string } | null = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    user = data.user
  } catch (e) {
    console.error(e)
  }

  const profil = user
    ? await safeMaybeSingle<{ name: string | null }>(() =>
        supabase.from('user_profiles').select('name').eq('id', user.id).maybeSingle()
      )
    : null

  const [letzteAnfragen, letzteAngebote, letzteAuftraege, letzteRechnungen] = await Promise.all([
    safeRows(() =>
      withCrmReadFallback(async (db) =>
        db
          .from('leads')
          .select(
            `
        id, status, kanal, situation,
        bereiche, preis_min, preis_max,
        kontakt_name, kontakt_email, kontakt_telefon,
        plz, created_at,
        kunden!kunde_id(id, name, email, telefon)
      `
          )
          .order('created_at', { ascending: false })
          .limit(64)
      )
    ),
    safeRows(() =>
      withCrmReadFallback(async (db) =>
        db
          .from('angebote')
          .select(
            `
        *,
        kunden(id, name, email, plz),
        leads(id, situation, bereiche, plz),
        angebot_handwerker(id, status, handwerker_id, gewerk_id, handwerker(name))
      `
          )
          .order('created_at', { ascending: false })
          .limit(64)
      )
    ),
    safeRows(() =>
      withCrmReadFallback(async (db) =>
        db
          .from('auftraege')
          .select(
            `
        *,
        kunden(id, name, email, telefon),
        angebote(id, gesamt_fix, gesamt_min, gesamt_max, positionen),
        auftrag_handwerker(*, handwerker(name), gewerke(name))
      `
          )
          .in('status', ['offen', 'in_arbeit', 'abnahme'])
          .order('created_at', { ascending: false })
          .limit(64)
      )
    ),
    safeRows(() =>
      withCrmReadFallback(async (db) =>
        db
          .from('rechnungen')
          .select(RECHNUNGEN_LISTE_SELECT)
          .order('created_at', { ascending: false })
          .limit(64)
      )
    ),
  ])

  const anfragenListe = filterOutLegacyDemoLeads(letzteAnfragen as unknown as LeadWithAngebote[])
  const angeboteListe = parseAngebote(letzteAngebote)
  const auftraegeListe = letzteAuftraege as AuftragListeEintrag[]
  const rechnungenListe = letzteRechnungen as RechnungListeZeile[]

  const neueAnfragenCount = anfragenListe.filter((l) => isNeueAnfrageStatus(l.status)).length
  const offeneAngeboteCount = angeboteListe.filter((a) =>
    isOffenesAngebotStatus(a.status, a.status_einfach)
  ).length
  const aktiveAuftraegeCount = auftraegeListe.filter((a) => isAktiverAuftragStatus(a.status)).length
  const offeneRechnungenCount = rechnungenListe.filter((r) => isOffeneRechnungStatus(r.status)).length

  const vorname = (profil?.name as string | undefined)?.split(/\s+/)[0] ?? 'Team'

  const kpis: MockDashboardKpi[] = [
    {
      icon: 'inbox',
      label: 'Neue Anfragen',
      value: neueAnfragenCount,
      href: '/vorgaenge?tab=anfrage',
    },
    {
      icon: 'file-invoice',
      label: 'Offene Angebote',
      value: offeneAngeboteCount,
      href: '/vorgaenge?tab=angebot',
    },
    {
      icon: 'tool',
      label: 'Aktive Aufträge',
      value: aktiveAuftraegeCount,
      href: '/vorgaenge?tab=auftrag',
    },
    {
      icon: 'receipt',
      label: 'Offene Rechnungen',
      value: offeneRechnungenCount,
      href: '/vorgaenge?tab=rechnung',
    },
  ]

  const phasen: MockDashboardPhase[] = [
    {
      key: 'anfragen',
      title: 'Anfragen',
      icon: 'inbox',
      href: '/vorgaenge?tab=anfrage',
      rows: anfragenListe.slice(0, 4).map((l) => {
        const badge = leadDashboardBadge(l.status)
        const name = leadKontaktAnzeigeName(l, 'Ohne Name')
        const sub = [l.situation?.trim(), l.plz?.trim()].filter(Boolean).join(' · ') || '—'
        return {
          id: l.id,
          title: name,
          sub,
          badgeKind: badge.kind,
          badgeLabel: badge.label,
          href: `/anfragen/${l.id}`,
        }
      }),
    },
    {
      key: 'angebote',
      title: 'Angebote',
      icon: 'file-invoice',
      href: '/vorgaenge?tab=angebot',
      rows: angeboteListe.slice(0, 4).map((a) => {
        const badge = angebotDashboardBadge(a.status, a.status_einfach)
        const kunde = angebotKundenName(a)
        const projekt = a.leads?.situation?.trim() || angebotSubline(a)
        const title = projekt.includes(kunde) ? projekt : `${projekt} — ${kunde}`
        return {
          id: a.id,
          title,
          sub: `AN-${a.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
          badgeKind: badge.kind,
          badgeLabel: badge.label,
          href: `/angebote/${a.id}`,
        }
      }),
    },
    {
      key: 'auftraege',
      title: 'Aufträge',
      icon: 'tool',
      href: '/vorgaenge?tab=auftrag',
      rows: auftraegeListe.slice(0, 4).map((o) => {
        const badge = auftragDashboardBadge(o.status)
        const ende = o.end_datum ? formatDatum(o.end_datum) : null
        return {
          id: o.id,
          title: o.titel?.trim() || 'Auftrag',
          sub: ende ? `bis ${ende}` : '—',
          badgeKind: badge.kind,
          badgeLabel: badge.label,
          href: `/auftraege/${o.id}`,
        }
      }),
    },
    {
      key: 'rechnungen',
      title: 'Rechnungen',
      icon: 'receipt',
      href: '/vorgaenge?tab=rechnung',
      rows: rechnungenListe.slice(0, 4).map((r) => {
        const badge = rechnungDashboardBadge({ status: r.status, faellig_am: r.faellig_am })
        return {
          id: r.id,
          title: rechnungTitel(r),
          sub: formatEurBetrag(Number(r.brutto) || 0),
          badgeKind: badge.kind,
          badgeLabel: badge.label,
          href: `/rechnungen/${r.id}`,
        }
      }),
    },
  ]

  return <MockDashboardClient vorname={vorname} kpis={kpis} phasen={phasen} />
}
