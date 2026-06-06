import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { StatCard } from '@/components/dashboard/StatCard'
import { Begruessing } from '@/components/dashboard/Begruessing'
import { DashboardAuftraegeImLauf } from '@/components/dashboard/DashboardAuftraegeImLauf'
import { DashboardLetzteAnfragenCard } from '@/components/dashboard/DashboardLetzteAnfragenCard'
import { DashboardOffeneTodosCard } from '@/components/dashboard/DashboardOffeneTodosCard'
import { DashboardAktivitaetCard } from '@/components/dashboard/DashboardAktivitaetCard'
import { buildDashboardAktivitaet } from '@/lib/dashboard-aktivitaet'
import { deltaVsPrevious } from '@/lib/dashboard-delta'
import { dashboardLeadPeriodBoundaries } from '@/lib/dashboard-periods'
import { DASHBOARD_FILTER_LINKS } from '@/lib/dashboard-filters'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotListeEintrag, AngebotPosition, KalenderTermin, LeadWithAngebote } from '@/lib/types'
import type { AuftragListeEintrag } from '@/lib/types'
import { filterOutLegacyDemoLeads } from '@/lib/legacy-demo-data'
import { CheckCircle2, Inbox, FileText, Wrench } from 'lucide-react'

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
    neueAnfragenMonatCount,
    neueAnfragenVormonatCount,
    offeneAngeboteCount,
    aktiveAuftraegeCount,
    auftraegeInArbeitCount,
    abgeschlossenMonatCount,
    abgeschlossenVormonatCount,
    abgeschlossenWocheCount,
    abgeschlossenVorwocheCount,
    offeneTodos,
    letzteAnfragen,
    letzteAngebote,
    letzteAuftraege,
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
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', leadPeriods.monthStartIso)
    ),
    safeCount(() =>
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', leadPeriods.prevMonthStartIso)
        .lt('created_at', leadPeriods.monthStartIso)
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
        .eq('status', 'in_arbeit')
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
    safeCount(() =>
      supabase
        .from('auftraege')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'abgeschlossen')
        .gte('updated_at', leadPeriods.weekStartIso)
    ),
    safeCount(() =>
      supabase
        .from('auftraege')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'abgeschlossen')
        .gte('updated_at', leadPeriods.prevWeekStartIso)
        .lt('updated_at', leadPeriods.weekStartIso)
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
        kunden(id, name, email, telefon)
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
  ])

  const anfragenListe = filterOutLegacyDemoLeads(letzteAnfragen as unknown as LeadWithAngebote[])
  const angeboteListe = parseAngebote(letzteAngebote)
  const auftraegeListe = letzteAuftraege as AuftragListeEintrag[]
  const offeneTodosListe = (offeneTodos as KalenderTermin[]).filter(
    (t) => t?.datum != null && String(t.datum).length > 0
  )
  const aktivitaet = buildDashboardAktivitaet(anfragenListe, angeboteListe, auftraegeListe)

  const vorname = (profil?.name as string | undefined)?.split(/\s+/)[0] ?? 'Team'

  const deltaNeueAnfragenWoche = deltaVsPrevious(
    neueAnfragenWocheCount,
    neueAnfragenVorwocheCount,
    'vs. Vorwoche'
  )
  const deltaNeueAnfragenMonat = deltaVsPrevious(
    neueAnfragenMonatCount,
    neueAnfragenVormonatCount,
    'vs. Vormonat'
  )
  const subDeltaNeueAnfragenMonat =
    neueAnfragenMonatCount > 0 || neueAnfragenVormonatCount > 0
      ? {
          prefix: `${neueAnfragenMonatCount} im Monat · `,
          ...(deltaNeueAnfragenMonat ?? { label: 'kein Vergleich', trend: 'neutral' as const }),
        }
      : undefined
  const deltaAbgeschlossenMonat = deltaVsPrevious(
    abgeschlossenMonatCount,
    abgeschlossenVormonatCount,
    'vs. Vormonat'
  )
  const deltaAbgeschlossenWoche = deltaVsPrevious(
    abgeschlossenWocheCount,
    abgeschlossenVorwocheCount,
    'vs. Vorwoche'
  )
  const subDeltaAbgeschlossenWoche =
    abgeschlossenWocheCount > 0 || abgeschlossenVorwocheCount > 0
      ? {
          prefix: `${abgeschlossenWocheCount} diese Woche · `,
          ...(deltaAbgeschlossenWoche ?? { label: 'kein Vergleich', trend: 'neutral' as const }),
        }
      : undefined

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 md:px-6">
      <Begruessing name={vorname} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          zahl={neueAnfragenWocheCount}
          label="Neue Anfragen diese Woche"
          icon={Inbox}
          href={DASHBOARD_FILTER_LINKS.neueAnfragen}
          farbe="blau"
          delta={deltaNeueAnfragenWoche}
          subDelta={subDeltaNeueAnfragenMonat}
        />
        <StatCard
          zahl={offeneAngeboteCount}
          label="Offene Angebote"
          icon={FileText}
          href={DASHBOARD_FILTER_LINKS.offeneAngebote}
          farbe="orange"
        />
        <StatCard
          zahl={aktiveAuftraegeCount}
          label="Aktive Aufträge"
          icon={Wrench}
          href={DASHBOARD_FILTER_LINKS.aktiveAuftraege}
          farbe="gruen"
          delta={
            auftraegeInArbeitCount > 0
              ? {
                  label: `${auftraegeInArbeitCount} in Ausführung`,
                  trend: 'neutral',
                }
              : undefined
          }
        />
        <StatCard
          zahl={abgeschlossenMonatCount}
          label="Abgeschlossene Aufträge diesen Monat"
          icon={CheckCircle2}
          href={DASHBOARD_FILTER_LINKS.abgeschlosseneAuftraege}
          farbe="lila"
          delta={deltaAbgeschlossenMonat}
          subDelta={subDeltaAbgeschlossenWoche}
        />
      </div>

      <div className="dashboard-grid-2">
        <DashboardLetzteAnfragenCard anfragen={anfragenListe} />
        <DashboardOffeneTodosCard termine={offeneTodosListe} />
      </div>

      <div className="dashboard-grid-2">
        <DashboardAuftraegeImLauf auftraege={auftraegeListe} />
        <DashboardAktivitaetCard items={aktivitaet} />
      </div>
    </div>
  )
}
