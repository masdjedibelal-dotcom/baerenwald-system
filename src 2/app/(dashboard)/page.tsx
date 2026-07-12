import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { StatCard } from '@/components/dashboard/StatCard'
import { Begruessing } from '@/components/dashboard/Begruessing'
import { DashboardTodayBar } from '@/components/dashboard/DashboardTodayBar'
import { DashboardDetailsSection } from '@/components/dashboard/DashboardDetailsSection'
import { buildDashboardAktivitaet } from '@/lib/dashboard-aktivitaet'
import { deltaVsPrevious } from '@/lib/dashboard-delta'
import { dashboardLeadPeriodBoundaries } from '@/lib/dashboard-periods'
import { loadOrgDashboardKpis } from '@/lib/dashboard-org-kpis'
import { DASHBOARD_FILTER_LINKS } from '@/lib/dashboard-filters'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotListeEintrag, AngebotPosition, KalenderTermin, LeadWithAngebote } from '@/lib/types'
import type { AuftragListeEintrag } from '@/lib/types'
import { filterOutLegacyDemoLeads } from '@/lib/legacy-demo-data'
import { Inbox } from 'lucide-react'

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

async function safeCount(
  run: () => PromiseLike<{ count: number | null; error: SupabaseErr }>
): Promise<number> {
  try {
    const { count, error } = await run()
    if (error) throw error
    return count ?? 0
  } catch (e) {
    console.error(e)
    return 0
  }
}

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

export default async function DashboardPage() {
  const supabase = createClient()
  const leadPeriods = dashboardLeadPeriodBoundaries()

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

  const [
    neueAnfragenWocheCount,
    neueAnfragenVorwocheCount,
    offeneAngeboteCount,
    aktiveAuftraegeCount,
    abgeschlossenMonatCount,
    abgeschlossenVormonatCount,
    offeneTodos,
    letzteAnfragen,
    letzteAngebote,
    letzteAuftraege,
    orgKpis,
  ] = await Promise.all([
    safeCount(() =>
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', leadPeriods.weekStartIso)
    ),
    safeCount(() =>
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', leadPeriods.prevWeekStartIso)
        .lt('created_at', leadPeriods.weekStartIso)
    ),
    safeCount(() =>
      supabase
        .from('angebote')
        .select('id', { count: 'exact', head: true })
        .in('status', ['gesendet_kunde', 'gesendet_handwerker', 'handwerker_akzeptiert'])
    ),
    safeCount(() =>
      supabase
        .from('auftraege')
        .select('id', { count: 'exact', head: true })
        .in('status', ['offen', 'in_arbeit', 'abnahme'])
    ),
    safeCount(() =>
      supabase
        .from('auftraege')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'abgeschlossen')
        .gte('updated_at', leadPeriods.monthStartIso)
    ),
    safeCount(() =>
      supabase
        .from('auftraege')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'abgeschlossen')
        .gte('updated_at', leadPeriods.prevMonthStartIso)
        .lt('updated_at', leadPeriods.monthStartIso)
    ),
    safeRows(() =>
      withCrmReadFallback(async (db) =>
        db
          .from('kalender_termine')
          .select(
            `
        *,
        leads(kontakt_name),
        auftraege(titel, kunden(name))
      `
          )
          .eq('erledigt', false)
          .in('typ', ['besichtigung', 'beginn', 'abnahme'])
          .order('datum', { ascending: true })
          .order('uhrzeit_von', { ascending: true })
          .limit(128)
      )
    ),
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
        kunden(id, name, email),
        leads(id, situation, bereiche),
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
    loadOrgDashboardKpis(supabase, leadPeriods.weekStartIso),
  ])

  const anfragenListe = filterOutLegacyDemoLeads(letzteAnfragen as unknown as LeadWithAngebote[])
  const angeboteListe = parseAngebote(letzteAngebote)
  const auftraegeListe = letzteAuftraege as AuftragListeEintrag[]
  const offeneTodosListe = (offeneTodos as KalenderTermin[]).filter(
    (t) => t?.datum != null && String(t.datum).length > 0
  )
  const aktivitaet = buildDashboardAktivitaet(anfragenListe, angeboteListe, auftraegeListe)

  const heuteIso = new Date().toISOString().slice(0, 10)
  const offeneAnfragenCount = anfragenListe.filter((l) => l.status === 'neu').length
  const anfragenUeber48h = anfragenListe.filter((l) => {
    if (l.status !== 'neu') return false
    const h = (Date.now() - new Date(l.created_at).getTime()) / 3_600_000
    return h >= 48
  }).length
  const termineHeute = offeneTodosListe.filter((t) => String(t.datum).slice(0, 10) === heuteIso).length

  const vorname = (profil?.name as string | undefined)?.split(/\s+/)[0] ?? 'Team'

  const deltaNeueAnfragenWoche = deltaVsPrevious(
    neueAnfragenWocheCount,
    neueAnfragenVorwocheCount,
    'vs. Vorwoche'
  )
  const deltaAbgeschlossenMonat = deltaVsPrevious(
    abgeschlossenMonatCount,
    abgeschlossenVormonatCount,
    'vs. Vormonat'
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 md:px-6">
      <Begruessing name={vorname} />

      <DashboardTodayBar
        offeneAnfragen={offeneAnfragenCount}
        anfragenUeber48h={anfragenUeber48h}
        termineHeute={termineHeute}
        offeneTodos={offeneTodosListe.length}
      />

      <section className="space-y-2" aria-label="Kennzahlen">
        <h2 className="text-sm font-semibold text-bw-text">Kennzahlen</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          zahl={neueAnfragenWocheCount}
          label="Neue Anfragen diese Woche"
          icon={Inbox}
          href={DASHBOARD_FILTER_LINKS.neueAnfragen}
          farbe="blau"
          delta={deltaNeueAnfragenWoche}
          layout="compact"
        />
        <StatCard
          zahl={offeneAngeboteCount}
          label="Offene Angebote"
          href={DASHBOARD_FILTER_LINKS.offeneAngebote}
          farbe="orange"
          layout="minimal"
        />
        <StatCard
          zahl={aktiveAuftraegeCount}
          label="Aktive Aufträge"
          href={DASHBOARD_FILTER_LINKS.aktiveAuftraege}
          farbe="gruen"
          layout="minimal"
        />
        <StatCard
          zahl={abgeschlossenMonatCount}
          label="Abgeschlossene Aufträge diesen Monat"
          href={DASHBOARD_FILTER_LINKS.abgeschlosseneAuftraege}
          farbe="lila"
          delta={deltaAbgeschlossenMonat}
          layout="compact"
        />
        </div>
      </section>

      <section className="space-y-2" aria-label="Auftraggeber-Portal">
        <h2 className="text-sm font-semibold text-bw-text">Auftraggeber-Portal</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard
            zahl={orgKpis.meldungenWoche}
            label="Meldungen diese Woche"
            href="/anfragen"
            farbe="blau"
            layout="minimal"
          />
          <StatCard
            zahl={orgKpis.wartetFreigabe}
            label="Wartet auf Org-Freigabe"
            href="/anfragen"
            farbe="orange"
            layout="minimal"
          />
          <StatCard
            zahl={orgKpis.orgPortalLeads}
            label="Org-Portal-Leads (Woche)"
            href="/anfragen"
            farbe="gruen"
            layout="minimal"
          />
        </div>
      </section>

      <DashboardDetailsSection
        anfragen={anfragenListe}
        angebote={angeboteListe}
        auftraege={auftraegeListe}
        aktivitaet={aktivitaet}
      />
    </div>
  )
}
