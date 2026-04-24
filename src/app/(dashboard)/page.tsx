import { createClient } from '@/lib/supabase-server'
import { StatCard } from '@/components/dashboard/StatCard'
import { Begruessing } from '@/components/dashboard/Begruessing'
import { DashboardListen } from '@/components/dashboard/DashboardListen'
import { DashboardTermineHeute } from '@/components/dashboard/DashboardTermineHeute'
import { Warnungen, type DashboardWarnungEintrag } from '@/components/dashboard/Warnungen'
import { DASHBOARD_FILTER_LINKS } from '@/lib/dashboard-filters'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotListeEintrag, AngebotPosition, KalenderTermin, LeadWithAngebote } from '@/lib/types'
import type { AuftragListeEintrag } from '@/lib/types'
import type { HandwerkerZeile } from '@/components/handwerker/HandwerkerListeClient'
import { Inbox, FileText, Wrench, HardHat, Receipt } from 'lucide-react'

export const revalidate = 60

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function localDatePlusDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function pickOne<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] as T) ?? null : x
}

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
  const t0 = startOfTodayIso()
  const heuteDatum = localDatePlusDays(0)
  const in3TagenIso = new Date(Date.now() - 3 * 86400000).toISOString()
  const einbehaltBis = localDatePlusDays(30)

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
    neueAnfragenCount,
    offeneAngeboteCount,
    aktiveAuftraegeCount,
    hwImEinsatzCount,
    ueberfaelligeRechnungenCount,
    heutigeTermine,
    letzteAnfragen,
    letzteAngebote,
    letzteAuftraege,
    aktiveHandwercher,
    naechsteTermine,
    hwAbRows,
    kundeAltRows,
    complianceRows,
    einbehaltRows,
  ] = await Promise.all([
    safeCount(() =>
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'neu')
        .gte('created_at', t0)
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
        .from('auftrag_handwerker')
        .select('id', { count: 'exact', head: true })
        .in('status', ['in_arbeit', 'zugewiesen'])
    ),
    safeCount(() =>
      supabase
        .from('rechnungen')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'gesendet')
        .lt('faellig_am', heuteDatum)
    ),
    safeRows(() =>
      supabase
        .from('kalender_termine')
        .select(
          `
        *,
        leads(kontakt_name),
        auftraege(titel, kunden(name))
      `
        )
        .eq('datum', heuteDatum)
        .eq('erledigt', false)
        .order('uhrzeit_von', { ascending: true })
    ),
    safeRows(() =>
      supabase
        .from('leads')
        .select(
          `
        id, status, kanal,
        bereiche, preis_min, preis_max,
        kontakt_name, kontakt_email, kontakt_telefon,
        plz, created_at,
        kunden(id, name, email, telefon)
      `
        )
        .order('created_at', { ascending: false })
        .limit(8)
    ),
    safeRows(() =>
      supabase
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
        .limit(8)
    ),
    safeRows(() =>
      supabase
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
        .limit(8)
    ),
    safeRows(() =>
      supabase
        .from('handwerker')
        .select('id, name, firma, gewerke, compliance_status, created_at')
        .eq('aktiv', true)
        .order('name', { ascending: true })
        .limit(8)
    ),
    safeRows(() =>
      supabase
        .from('kalender_termine')
        .select(
          `
        *,
        leads(kontakt_name),
        auftraege(titel, kunden(name))
      `
        )
        .gte('datum', heuteDatum)
        .lte('datum', einbehaltBis)
        .eq('erledigt', false)
        .order('datum', { ascending: true })
        .order('uhrzeit_von', { ascending: true })
        .limit(12)
    ),
    safeRows(() =>
      supabase
        .from('angebot_handwerker')
        .select(
          `
        id,
        gewerke(name),
        angebote(id, status, kunden(name))
      `
        )
        .eq('status', 'abgelehnt')
    ),
    safeRows(() =>
      supabase
        .from('angebote')
        .select('id, kunden(name), gesendet_kunde_at')
        .eq('status', 'gesendet_kunde')
        .lt('gesendet_kunde_at', in3TagenIso)
    ),
    safeRows(() =>
      supabase
        .from('handwerker')
        .select('id, name')
        .eq('aktiv', true)
        .eq('ist_fachbetrieb', true)
        .eq('compliance_status', 'unvollständig')
        .limit(8)
    ),
    safeRows(() =>
      supabase
        .from('einbehalte')
        .select(
          `
        id,
        freigabe_datum,
        auftrag_id,
        auftraege(id, titel, kunden(name))
      `
        )
        .eq('status', 'einbehalten')
        .gte('freigabe_datum', heuteDatum)
        .lte('freigabe_datum', einbehaltBis)
        .limit(8)
    ),
  ])

  const warnungen: DashboardWarnungEintrag[] = []
  const seen = new Set<string>()

  for (const row of hwAbRows) {
    const r = row as Record<string, unknown>
    const ang = pickOne(r.angebote as { id: string; status: string; kunden: unknown } | null)
    if (!ang || ang.status === 'abgelehnt' || ang.status === 'kunde_akzeptiert') continue
    const k = pickOne(ang.kunden as { name: string } | null)
    const gw = pickOne(r.gewerke as { name: string } | null)
    const key = `hw-${ang.id}-${gw?.name ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    warnungen.push({
      id: key,
      typ: 'handwerker_abgelehnt',
      name: k?.name?.trim() ?? 'Kundin',
      link: `/angebote/${ang.id}`,
    })
  }

  for (const row of kundeAltRows) {
    const r = row as { id: string; kunden: unknown }
    const k = pickOne(r.kunden as { name: string } | null)
    warnungen.push({
      id: `knd-${r.id}`,
      typ: 'keine_antwort_kunde',
      name: k?.name?.trim() ?? 'Kundin',
      link: `/angebote/${r.id}`,
    })
  }

  for (const row of complianceRows) {
    const r = row as { id: string; name: string }
    warnungen.push({
      id: `cmp-${r.id}`,
      typ: 'compliance_fehlt',
      name: r.name?.trim() ?? 'Handwercher',
      link: `/handwerker/${r.id}`,
    })
  }

  for (const row of einbehaltRows) {
    const r = row as Record<string, unknown>
    const auf = pickOne(
      r.auftraege as { id: string; titel: string | null; kunden: { name: string } | null } | null
    )
    if (!auf?.id) continue
    const k = pickOne(auf.kunden as { name: string } | null)
    warnungen.push({
      id: `ein-${r.id}`,
      typ: 'einbehalt_faellig',
      name: k?.name?.trim() ?? auf.titel?.trim() ?? 'Auftrag',
      link: `/auftraege/${auf.id}/finanzen`,
    })
  }

  const anfragenListe = letzteAnfragen as unknown as LeadWithAngebote[]
  const angeboteListe = parseAngebote(letzteAngebote)
  const auftraegeListe = letzteAuftraege as AuftragListeEintrag[]
  const hwListe = aktiveHandwercher as HandwerkerZeile[]
  const termineHeute = heutigeTermine as KalenderTermin[]
  const termine3d = naechsteTermine as KalenderTermin[]

  const vorname = (profil?.name as string | undefined)?.split(/\s+/)[0] ?? 'Team'

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 md:px-6">
      <Begruessing name={vorname} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard
          zahl={neueAnfragenCount}
          label="Neue Anfragen heute"
          icon={Inbox}
          href={DASHBOARD_FILTER_LINKS.neueAnfragen}
          farbe="blau"
          warnung
        />
        <StatCard
          zahl={offeneAngeboteCount}
          label="Offene Angebote"
          icon={FileText}
          href={DASHBOARD_FILTER_LINKS.offeneAngebote}
          farbe="orange"
          warnung
        />
        <StatCard
          zahl={aktiveAuftraegeCount}
          label="Aktive Aufträge"
          icon={Wrench}
          href={DASHBOARD_FILTER_LINKS.aktiveAuftraege}
          farbe="gruen"
        />
        <StatCard
          zahl={hwImEinsatzCount}
          label="Handwercher im Einsatz"
          icon={HardHat}
          href={DASHBOARD_FILTER_LINKS.hwImEinsatz}
          farbe="lila"
        />
        <StatCard
          zahl={ueberfaelligeRechnungenCount}
          label="Überfällige Rechnungen"
          icon={Receipt}
          href={DASHBOARD_FILTER_LINKS.ueberfaellig}
          farbe="rot"
          warnung
        />
      </div>

      {termineHeute.length > 0 ? <DashboardTermineHeute termine={termineHeute} /> : null}

      <DashboardListen
        anfragen={anfragenListe}
        angebote={angeboteListe}
        auftraege={auftraegeListe}
        handwercherZeilen={hwListe}
        termine={termine3d}
      />

      {warnungen.length > 0 ? <Warnungen items={warnungen} /> : null}
    </div>
  )
}
