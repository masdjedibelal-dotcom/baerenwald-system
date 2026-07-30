import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { filterOutLegacyDemoLeads } from '@/lib/legacy-demo-data'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import {
  isAktiverAuftragStatus,
  isAngenommenesAngebotStatus,
  isFunnelAuftragStatus,
  isOffeneRechnungStatus,
  isOffenesAngebotStatus,
} from '@/lib/dashboard-mock-mapping'
import {
  buildGewerkUmsatz,
  buildHandwerkerRanking,
  buildKundenRanking,
  buildUmsatzverlauf,
  buildVertriebsFunnel,
  countUniqueVorgaengeByLead,
  getDashboardZeitraumRange,
  inZeitraum,
  parseDashboardZeitraum,
  auftragNetto,
  type DashboardZeitraumFilter,
} from '@/lib/dashboard/dashboard-analytics'
import { loadDashboardMarketing } from '@/lib/dashboard/dashboard-marketing'
import type { LeadWithAngebote } from '@/lib/types'

export const dynamic = 'force-dynamic'

type SupabaseErr = { message: string } | null

async function safeRows<T>(
  run: () => PromiseLike<{ data: T[] | null; error: SupabaseErr }>
): Promise<T[]> {
  try {
    const { data, error } = await run()
    if (error) throw error
    return data ?? []
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Abgelaufene Session: nicht still als „0 Einträge“ maskieren
    if (
      /jwt expired|invalid jwt|not authenticated|pgrst301|auth session/i.test(msg)
    ) {
      throw e
    }
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

async function DashboardData({ zeitraumFilter }: { zeitraumFilter: DashboardZeitraumFilter }) {
  const supabase = createClient()
  const zeitraumRange = getDashboardZeitraumRange(zeitraumFilter)

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

  const [leadsRaw, angeboteRaw, auftraegeRaw, rechnungenRaw, zuweisungenRaw, marketing] =
    await Promise.all([
    safeRows(() =>
      withCrmReadFallback(async (db) =>
        db
          .from('leads')
          .select('id, status, kunde_id, created_at')
          .order('created_at', { ascending: false })
          .limit(2000)
      )
    ),
    safeRows(() =>
      withCrmReadFallback(async (db) =>
        db
          .from('angebote')
          .select(
            `
            id, status, status_einfach, kunde_id, lead_id, created_at,
            gesamt_fix, gesamt_min, gesamt_max, positionen,
            leads(id, status),
            auftraege(id, status)
          `
          )
          .order('created_at', { ascending: false })
          .limit(2000)
      )
    ),
    safeRows(() =>
      withCrmReadFallback(async (db) =>
        db
          .from('auftraege')
          .select(
            `
            id, status, kunde_id, lead_id, angebot_id, created_at, titel, ist_wiederkehrend,
            letzte_aktivitaet, fortschritt,
            angebote(id, gesamt_fix, gesamt_min, gesamt_max, positionen),
            kunden(id, name, vorname, nachname)
          `
          )
          .order('created_at', { ascending: false })
          .limit(2000)
      )
    ),
    safeRows(() =>
      withCrmReadFallback(async (db) =>
        db
          .from('rechnungen')
          .select('id, status, created_at, faellig_am')
          .order('created_at', { ascending: false })
          .limit(2000)
      )
    ),
    safeRows(() =>
      withCrmReadFallback(async (db) =>
        db
          .from('auftrag_handwerker')
          .select(
            `
            id, auftrag_id, handwerker_id, vereinbarter_preis,
            handwerker(id, name, firma),
            gewerke(name),
            auftraege(id, status, lead_id, angebot_id, kunde_id, created_at,
              angebote(gesamt_fix, gesamt_min, gesamt_max, positionen))
          `
          )
          .limit(3000)
      )
    ),
    loadDashboardMarketing(zeitraumFilter),
  ])

  const leads = filterOutLegacyDemoLeads(
    (leadsRaw as unknown as LeadWithAngebote[]).map((l) => ({
      ...l,
      kontakt_email: null,
      kontakt_name: null,
      kontakt_telefon: null,
      notizen: null,
      funnel_daten: null,
    }))
  )
  const angebote = angeboteRaw as Array<Record<string, unknown>>
  const auftraege = auftraegeRaw as Array<Record<string, unknown>>
  const rechnungen = rechnungenRaw as Array<{
    id: string
    status: string
    created_at: string
    faellig_am?: string | null
  }>

  const leadsZ = leads.filter((l) => {
    if (!inZeitraum(l.created_at, zeitraumRange)) return false
    return String(l.status ?? '').toLowerCase() !== 'abgebrochen'
  })
  const angeboteZ = angebote.filter((a) => inZeitraum(String(a.created_at ?? ''), zeitraumRange))
  const auftraegeZ = auftraege.filter((a) => inZeitraum(String(a.created_at ?? ''), zeitraumRange))
  const rechnungenZ = rechnungen.filter((r) => inZeitraum(r.created_at, zeitraumRange))

  const neueAnfragenCount = leadsZ.filter(
    (l) => String(l.status ?? '').toLowerCase() === 'neu'
  ).length
  const offeneAngeboteCount = angeboteZ.filter((a) =>
    isOffenesAngebotStatus(a.status as string, a.status_einfach as string | null)
  ).length
  const aktiveAuftraegeCount = auftraegeZ.filter((a) =>
    isAktiverAuftragStatus(a.status as string)
  ).length
  const offeneRechnungenCount = rechnungenZ.filter((r) => isOffeneRechnungStatus(r.status)).length

  const vorname = (profil?.name as string | undefined)?.split(/\s+/)[0] ?? 'Team'

  const kpis = [
    {
      icon: 'inbox',
      label: 'Neue Anfragen',
      value: neueAnfragenCount,
      href: '/vorgaenge?tab=anfrage&lifecycle=offen',
    },
    {
      icon: 'file-invoice',
      label: 'Offene Angebote',
      value: offeneAngeboteCount,
      href: '/vorgaenge?tab=angebot&lifecycle=offen',
    },
    {
      icon: 'tool',
      label: 'Aktive Aufträge',
      value: aktiveAuftraegeCount,
      href: '/vorgaenge?tab=auftrag&lifecycle=offen',
    },
    {
      icon: 'receipt',
      label: 'Offene Rechnungen',
      value: offeneRechnungenCount,
      href: '/vorgaenge?tab=rechnung&lifecycle=offen',
    },
  ]

  // Umsatzverlauf: immer letzte 6 Monate (unabhängig vom KPI-Filter), Auftragssummen
  const umsatzMonate = buildUmsatzverlauf(
    auftraege.map((a) => ({
      status: String(a.status ?? ''),
      created_at: String(a.created_at ?? ''),
      angebote: a.angebote as never,
    })),
    6
  )

  const angeboteAngenommen = angeboteZ.filter((a) => {
    if (!isAngenommenesAngebotStatus(a.status as string, a.status_einfach as string | null)) {
      return false
    }
    // Nur angenommene Angebote, die zu einem Auftrag gehören
    if (a.auftrag_id) return true
    const aufs = a.auftraege
    if (Array.isArray(aufs)) return aufs.length > 0
    return Boolean(aufs)
  })
  const auftraegeFunnel = auftraegeZ.filter((a) => isFunnelAuftragStatus(a.status as string))

  const funnel = buildVertriebsFunnel({
    anfragen: leadsZ.length,
    angebote: countUniqueVorgaengeByLead(
      angeboteAngenommen.map((a) => ({
        id: String(a.id ?? ''),
        lead_id: (a.lead_id as string | null) ?? null,
      }))
    ),
    auftraege: countUniqueVorgaengeByLead(
      auftraegeFunnel.map((a) => ({
        id: String(a.id ?? ''),
        lead_id: (a.lead_id as string | null) ?? null,
      }))
    ),
  })

  const gewerk = buildGewerkUmsatz(
    angeboteZ.map((a) => ({
      positionen: a.positionen,
      leads: a.leads as never,
      auftraege: a.auftraege as never,
    }))
  )

  // Handwerker-Ranking aus Zuweisungen (Zeitraum über Auftrag.created_at)
  const hwRows: Parameters<typeof buildHandwerkerRanking>[0] = []
  for (const z of zuweisungenRaw as Array<Record<string, unknown>>) {
    const auftrag = Array.isArray(z.auftraege) ? z.auftraege[0] : z.auftraege
    const auf = auftrag as Record<string, unknown> | null
    if (!auf?.id) continue
    if (!inZeitraum(String(auf.created_at ?? ''), zeitraumRange)) continue
    if (String(auf.status ?? '') === 'storniert') continue
    const hw = Array.isArray(z.handwerker) ? z.handwerker[0] : z.handwerker
    const h = hw as { id?: string; name?: string | null; firma?: string | null } | null
    const hwId = String(z.handwerker_id ?? h?.id ?? '')
    if (!hwId) continue
    const gewerkRow = Array.isArray(z.gewerke) ? z.gewerke[0] : z.gewerke
    const gName = (gewerkRow as { name?: string } | null)?.name?.trim() || ''
    hwRows.push({
      handwerker_id: hwId,
      handwerker_name: (h?.firma || h?.name || 'Handwerker').trim(),
      gewerk: gName,
      vereinbarter_preis: Number(z.vereinbarter_preis) || 0,
      auftrag_id: String(auf.id),
      auftrag_netto: auftragNetto({ angebote: auf.angebote as never }),
      lead_id: (auf.lead_id as string | null) ?? null,
      angebot_id: (auf.angebot_id as string | null) ?? null,
    })
  }

  // Auch Anfragen/Angebote ohne Auftrag: über angebot_handwerker für Vorgänge-Zählung
  const angebotHw = await safeRows(() =>
    withCrmReadFallback(async (db) =>
      db
        .from('angebot_handwerker')
        .select(
          `
          angebot_id, handwerker_id,
          handwerker(id, name, firma),
          gewerke(name),
          angebote(id, lead_id, kunde_id, created_at, status)
        `
        )
        .limit(3000)
    )
  )

  for (const row of angebotHw as Array<Record<string, unknown>>) {
    const ang = Array.isArray(row.angebote) ? row.angebote[0] : row.angebote
    const a = ang as Record<string, unknown> | null
    if (!a?.id) continue
    if (!inZeitraum(String(a.created_at ?? ''), zeitraumRange)) continue
    const hw = Array.isArray(row.handwerker) ? row.handwerker[0] : row.handwerker
    const h = hw as { id?: string; name?: string | null; firma?: string | null } | null
    const hwId = String(row.handwerker_id ?? h?.id ?? '')
    if (!hwId) continue
    const gewerkRow = Array.isArray(row.gewerke) ? row.gewerke[0] : row.gewerke
    const gName = (gewerkRow as { name?: string } | null)?.name?.trim() || ''
    // Nur für Vorgänge-Zählung (kein EK/Umsatz ohne Auftrag) — EK bleibt 0, Umsatz 0
    hwRows.push({
      handwerker_id: hwId,
      handwerker_name: (h?.firma || h?.name || 'Handwerker').trim(),
      gewerk: gName,
      vereinbarter_preis: 0,
      auftrag_id: '',
      auftrag_netto: 0,
      lead_id: (a.lead_id as string | null) ?? null,
      angebot_id: String(a.id),
    })
  }

  const rankingHandwerker = buildHandwerkerRanking(hwRows.filter((r) => r.auftrag_id || r.angebot_id || r.lead_id))

  const kundenRows: Parameters<typeof buildKundenRanking>[0] = []
  for (const l of leadsZ) {
    const kid = (l as { kunde_id?: string | null }).kunde_id
    if (!kid) continue
    kundenRows.push({
      kunde_id: kid,
      kunde_name: 'Kunde',
      lead_id: l.id,
      angebot_id: null,
      auftrag_id: null,
      auftrag_netto: 0,
    })
  }
  for (const a of angeboteZ) {
    const kid = a.kunde_id as string | null
    if (!kid) continue
    kundenRows.push({
      kunde_id: kid,
      kunde_name: 'Kunde',
      lead_id: (a.lead_id as string | null) ?? null,
      angebot_id: String(a.id),
      auftrag_id: null,
      auftrag_netto: 0,
    })
  }
  for (const a of auftraegeZ) {
    const kid = a.kunde_id as string | null
    if (!kid) continue
    const k = Array.isArray(a.kunden) ? a.kunden[0] : a.kunden
    const name = k ? kundeDisplayName(k as never) : 'Kunde'
    kundenRows.push({
      kunde_id: kid,
      kunde_name: name,
      lead_id: (a.lead_id as string | null) ?? null,
      angebot_id: (a.angebot_id as string | null) ?? null,
      auftrag_id: String(a.id),
      auftrag_netto: auftragNetto({ angebote: a.angebote as never }),
    })
  }

  // Namen für Kunden nachziehen aus Aufträgen
  const nameByKunde = new Map<string, string>()
  for (const r of kundenRows) {
    if (r.kunde_name !== 'Kunde') nameByKunde.set(r.kunde_id, r.kunde_name)
  }
  const rankingKunden = buildKundenRanking(
    kundenRows.map((r) => ({
      ...r,
      kunde_name: nameByKunde.get(r.kunde_id) ?? r.kunde_name,
    }))
  )

  return (
    <DashboardClient
      vorname={vorname}
      zeitraumFilter={zeitraumFilter}
      kpis={kpis}
      marketing={marketing}
      umsatzMonate={umsatzMonate}
      funnel={funnel}
      gewerk={gewerk}
      rankingHandwerker={rankingHandwerker}
      rankingKunden={rankingKunden}
    />
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { zeitraum?: string; von?: string; bis?: string }
}) {
  const zeitraumFilter = parseDashboardZeitraum(
    searchParams?.zeitraum,
    searchParams?.von,
    searchParams?.bis
  )
  return <DashboardData zeitraumFilter={zeitraumFilter} />
}
