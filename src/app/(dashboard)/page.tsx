import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { MockDashboardClient } from '@/components/dashboard/MockDashboardClient'
import type {
  MockDashboardKpi,
  MockDashboardPhase,
} from '@/components/dashboard/MockDashboardClient'
import { filterOutLegacyDemoLeads } from '@/lib/legacy-demo-data'
import { resolveStatusEinfach } from '@/lib/angebot-einfach'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { BEREICH_LABELS, STATUS_LABELS, formatDatum } from '@/lib/utils'
import { ANGEBOT_EINFACH_LABELS } from '@/lib/angebot-einfach'
import { AUFTRAG_STATUS_LABELS } from '@/lib/utils'
import { RECHNUNG_STATUS_LABELS } from '@/lib/rechnung-config'
import type { AuftragListeEintrag, LeadWithAngebote } from '@/lib/types'
import { auftragTitel, auftragKundenName } from '@/lib/auftraege/auftrag-liste-helpers'

export const revalidate = 60

function leadTitel(lead: LeadWithAngebote): string {
  const bereiche = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  const b = bereiche.map((x) => BEREICH_LABELS[x] ?? x).join(', ')
  const sit = lead.situation ? leadSituationDisplay(lead.situation) : ''
  return [sit, b].filter(Boolean).join(' · ') || 'Anfrage'
}

function statusKindLead(status: string): string {
  if (status === 'neu') return 'neu'
  if (status === 'kontaktiert' || status === 'termin') return 'aktiv'
  if (status === 'angebot') return 'warten'
  return 'plain'
}

function statusKindAngebot(einfach: string): string {
  if (einfach === 'entwurf') return 'neu'
  if (einfach === 'gesendet') return 'warten'
  if (einfach === 'angenommen') return 'fertig'
  return 'plain'
}

function statusKindAuftrag(status: string): string {
  if (status === 'abgeschlossen') return 'fertig'
  return 'aktiv'
}

async function safeCount(
  run: () => PromiseLike<{ count: number | null; error: { message: string } | null }>
): Promise<number> {
  try {
    const { count, error } = await run()
    if (error) throw error
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profil = user
    ? (
        await supabase.from('user_profiles').select('name').eq('id', user.id).maybeSingle()
      ).data
    : null

  const [leadsRes, angeboteRes, auftraegeRes, rechnungenRes, offeneRechnungenCount] =
    await Promise.all([
      withCrmReadFallback(async (db) =>
        db
          .from('leads')
          .select(
            'id, status, situation, bereiche, kontakt_name, created_at, kunden(name, vorname, nachname)'
          )
          .order('created_at', { ascending: false })
          .limit(20)
      ),
      withCrmReadFallback(async (db) =>
        db
          .from('angebote')
          .select('id, status, status_einfach, created_at, gesamt_fix, gesamt_max, leads(situation, bereiche)')
          .order('created_at', { ascending: false })
          .limit(20)
      ),
      withCrmReadFallback(async (db) =>
        db
          .from('auftraege')
          .select('id, status, titel, end_datum, kunden(name)')
          .in('status', ['offen', 'in_arbeit', 'abnahme'])
          .order('created_at', { ascending: false })
          .limit(20)
      ),
      withCrmReadFallback(async (db) =>
        db
          .from('rechnungen')
          .select('id, status, rechnungsnummer, brutto, faellig_am')
          .in('status', ['gesendet', 'entwurf'])
          .order('created_at', { ascending: false })
          .limit(20)
      ),
      safeCount(() =>
        supabase
          .from('rechnungen')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'gesendet')
      ),
    ])

  const leads = filterOutLegacyDemoLeads(
    (leadsRes.data ?? []) as unknown as LeadWithAngebote[]
  )
  const angebote = (angeboteRes.data ?? []) as Array<{
    id: string
    status: string
    status_einfach?: string | null
    created_at: string
    leads?: { situation?: string | null; bereiche?: string[] | null } | null
  }>
  const auftraege = (auftraegeRes.data ?? []) as unknown as AuftragListeEintrag[]
  const rechnungen = rechnungenRes.data ?? []

  const neueAnfragen = leads.filter((l) => l.status === 'neu' || l.status === 'kontaktiert').length
  const offeneAngebote = angebote.filter((a) => {
    const st = resolveStatusEinfach(a as Parameters<typeof resolveStatusEinfach>[0])
    return st !== 'angenommen' && st !== 'abgelehnt' && st !== 'ersetzt'
  }).length
  const aktiveAuftraege = auftraege.length

  const vorname = (profil?.name as string | undefined)?.split(/\s+/)[0] ?? 'Team'

  const kpis: MockDashboardKpi[] = [
    {
      icon: 'inbox',
      label: 'Neue Anfragen',
      value: neueAnfragen,
      href: '/anfragen',
    },
    {
      icon: 'file-invoice',
      label: 'Offene Angebote',
      value: offeneAngebote,
      href: '/angebote',
    },
    {
      icon: 'briefcase',
      label: 'Aktive Aufträge',
      value: aktiveAuftraege,
      href: '/auftraege',
    },
    {
      icon: 'receipt',
      label: 'Offene Rechnungen',
      value: offeneRechnungenCount,
      href: '/rechnungen',
    },
  ]

  const phasen: MockDashboardPhase[] = [
    {
      key: 'anfragen',
      title: 'Anfragen',
      icon: 'inbox',
      href: '/anfragen',
      rows: leads.slice(0, 4).map((l) => ({
        id: l.id,
        title: leadKontaktAnzeigeName(l),
        sub: leadTitel(l),
        badgeKind: statusKindLead(l.status),
        badgeLabel: STATUS_LABELS[l.status] ?? l.status,
        href: `/anfragen/${l.id}`,
      })),
    },
    {
      key: 'angebote',
      title: 'Angebote',
      icon: 'file-invoice',
      href: '/angebote',
      rows: angebote.slice(0, 4).map((a) => {
        const st = resolveStatusEinfach(a as Parameters<typeof resolveStatusEinfach>[0])
        const leadStub = {
          situation: a.leads?.situation,
          bereiche: a.leads?.bereiche,
        } as LeadWithAngebote
        return {
          id: a.id,
          title: leadTitel(leadStub) || a.id.slice(0, 8),
          sub: a.id.slice(0, 8).toUpperCase(),
          badgeKind: statusKindAngebot(st),
          badgeLabel: ANGEBOT_EINFACH_LABELS[st],
          href: `/angebote/${a.id}`,
        }
      }),
    },
    {
      key: 'auftraege',
      title: 'Aufträge',
      icon: 'briefcase',
      href: '/auftraege',
      rows: auftraege.slice(0, 4).map((o) => ({
        id: o.id,
        title: auftragTitel(o),
        sub: o.end_datum ? `bis ${formatDatum(o.end_datum)}` : auftragKundenName(o),
        badgeKind: statusKindAuftrag(o.status),
        badgeLabel: AUFTRAG_STATUS_LABELS[o.status] ?? o.status,
        href: `/auftraege/${o.id}`,
      })),
    },
    {
      key: 'rechnungen',
      title: 'Rechnungen',
      icon: 'receipt',
      href: '/rechnungen',
      rows: rechnungen.slice(0, 4).map((r) => ({
        id: r.id as string,
        title: (r.rechnungsnummer as string) || 'Rechnung',
        sub:
          r.brutto != null
            ? `${Math.round(Number(r.brutto)).toLocaleString('de-DE')} €`
            : '—',
        badgeKind: r.status === 'bezahlt' ? 'fertig' : 'warten',
        badgeLabel:
          RECHNUNG_STATUS_LABELS[r.status as keyof typeof RECHNUNG_STATUS_LABELS] ??
          String(r.status),
        href: `/rechnungen/${r.id}`,
      })),
    },
  ]

  return <MockDashboardClient vorname={vorname} kpis={kpis} phasen={phasen} />
}
