import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
// Demo-Modus: gelbes Banner bei E-Mail mit „demo“/„test“ — siehe DemoModeBanner in (dashboard)/layout.tsx
import { sendBehinderungInternMail } from '@/lib/formulare/behinderung-intern-mail'
import {
  DashboardHomeClient,
  type DashboardInitial,
  type DashboardWarnung,
} from '@/components/dashboard/DashboardHomeClient'
import { labelKundeAblehnung } from '@/lib/angebote/ablehnung-labels'
import { countDatenschutzFaellige } from '@/lib/datenschutz/queries'
import type { Lead } from '@/lib/types'

export const revalidate = 60

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function pickOne<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] as T) ?? null : x
}

function weekRangeIso() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(mon.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(sun.getDate() + 6)
  return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const t0 = startOfTodayIso()
  const { from: wFrom, to: wTo } = weekRangeIso()
  const ms3d = new Date(Date.now() - 3 * 86400000).toISOString()
  const ms2d = new Date(Date.now() - 2 * 86400000).toISOString()

  const [
    { count: neueHeute },
    { count: offeneAngebote },
    { count: aktiveAuftraege },
    { count: termineWoche },
    { data: leadsData },
    { data: hwAbRaw },
    { data: kundeAltRaw },
    { data: hwAngRaw },
    { count: nGesendetKunde },
    { count: nAuftragMitAng },
    { data: ablehnRaw },
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', t0),
    supabase
      .from('angebote')
      .select('id', { count: 'exact', head: true })
      .not('status', 'eq', 'abgelehnt')
      .not('status', 'eq', 'kunde_akzeptiert'),
    supabase
      .from('auftraege')
      .select('id', { count: 'exact', head: true })
      .not('status', 'eq', 'abgeschlossen')
      .not('status', 'eq', 'storniert'),
    supabase
      .from('kalender_termine')
      .select('id', { count: 'exact', head: true })
      .gte('datum', wFrom)
      .lte('datum', wTo)
      .eq('erledigt', false),
    supabase
      .from('leads')
      .select('id, kontakt_name, status, situation, plz, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('angebot_handwerker')
      .select(
        `
        id,
        angebot_id,
        gewerke(name),
        angebote(id, status, kunden(name))
      `
      )
      .eq('status', 'abgelehnt'),
    supabase
      .from('angebote')
      .select('id, gesendet_kunde_at, kunden(name)')
      .eq('status', 'gesendet_kunde')
      .lt('gesendet_kunde_at', ms3d),
    supabase
      .from('angebot_handwerker')
      .select(
        `
        id,
        gesendet_at,
        handwerker(name),
        angebot_id,
        angebote(id, status, kunden(name))
      `
      )
      .eq('status', 'angefragt')
      .lt('gesendet_at', ms2d),
    supabase
      .from('angebote')
      .select('id', { count: 'exact', head: true })
      .not('gesendet_kunde_at', 'is', null),
    supabase
      .from('auftraege')
      .select('id', { count: 'exact', head: true })
      .not('angebot_id', 'is', null),
    supabase
      .from('angebote')
      .select('ablehnung_grund')
      .eq('status', 'abgelehnt')
      .not('ablehnung_grund', 'is', null),
  ])

  const warnungen: DashboardWarnung[] = []
  const seenHwAb = new Set<string>()

  for (const row of hwAbRaw ?? []) {
    const r = row as Record<string, unknown>
    const ang = pickOne(r.angebote) as { id: string; status: string; kunden: unknown } | null
    if (!ang || ang.status === 'abgelehnt' || ang.status === 'kunde_akzeptiert') continue
    const k = pickOne(ang.kunden) as { name: string } | null
    const gw = pickOne(r.gewerke) as { name: string } | null
    const key = `${ang.id}-${gw?.name ?? ''}`
    if (seenHwAb.has(key)) continue
    seenHwAb.add(key)
    warnungen.push({
      angebot_id: ang.id,
      kunde: k?.name?.trim() || 'Kundin',
      typ: 'handwerker_abgelehnt',
      gewerk_name: gw?.name ?? null,
    })
  }

  for (const row of kundeAltRaw ?? []) {
    const r = row as { id: string; kunden: unknown }
    const k = pickOne(r.kunden) as { name: string } | null
    warnungen.push({
      angebot_id: r.id,
      kunde: k?.name?.trim() || 'Kundin',
      typ: 'keine_antwort_kunde',
    })
  }

  for (const row of hwAngRaw ?? []) {
    const r = row as Record<string, unknown>
    const ang = pickOne(r.angebote) as { id: string; status: string; kunden: unknown } | null
    if (!ang || ang.status === 'abgelehnt') continue
    const k = pickOne(ang.kunden) as { name: string } | null
    const hw = pickOne(r.handwerker) as { name: string } | null
    warnungen.push({
      angebot_id: ang.id,
      kunde: k?.name?.trim() || 'Kundin',
      typ: 'keine_antwort_handwerker',
      handwerker_name: hw?.name ?? null,
      zuweisung_id: r.id as string,
    })
  }

  const d7beh = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: behindRows } = await supabaseAdmin
    .from('formular_eintraege')
    .select(
      `
      id,
      submitted_at,
      daten,
      auftrag_id,
      behinderung_intern_mail_at,
      handwerker(name),
      formular_templates(name, subtyp),
      auftraege(id, kunden(name, email))
    `
    )
    .gte('submitted_at', d7beh)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  for (const row of behindRows ?? []) {
    const r = row as Record<string, unknown>
    const ft = r.formular_templates as { subtyp?: string | null } | null
    if (ft?.subtyp !== 'behinderung') continue
    const auf = pickOne(r.auftraege) as {
      id: string
      kunden: { name: string; email: string | null } | null
    } | null
    if (!auf?.id) continue
    const k = auf.kunden
    const daten = (r.daten ?? {}) as Record<string, unknown>
    const grund = String(daten.grund ?? '')
    const verzug = Math.round(Number(daten.geschaetzter_verzug ?? 0))
    const hw = pickOne(r.handwerker) as { name: string } | null

    if (!r.behinderung_intern_mail_at) {
      const mail = await sendBehinderungInternMail({
        kundeName: k?.name?.trim() || 'Kundin',
        auftragId: auf.id,
        handwerkerName: hw?.name ?? '—',
        grund,
        verzugTage: String(verzug),
        beschreibung: String(daten.beschreibung ?? ''),
      })
      if (mail.ok && !('skipped' in mail && mail.skipped)) {
        await supabaseAdmin
          .from('formular_eintraege')
          .update({ behinderung_intern_mail_at: new Date().toISOString() })
          .eq('id', r.id as string)
      }
    }

    warnungen.push({
      typ: 'behinderung',
      auftrag_id: auf.id,
      eintrag_id: r.id as string,
      kunde: k?.name?.trim() || 'Kundin',
      handwerker_name: hw?.name ?? null,
      behinderung_grund: grund,
      behinderung_verzug_tage: verzug,
      kunde_email: k?.email ?? null,
    })
  }

  const { data: baustoppRows } = await supabase
    .from('baustopps')
    .select(
      `
      id,
      typ,
      grund,
      auftrag_id,
      auftraege(id, status, kunden(name))
    `
    )
    .is('ende_datum', null)

  for (const row of baustoppRows ?? []) {
    const r = row as Record<string, unknown>
    const auf = pickOne(r.auftraege as { id: string; status: string; kunden: unknown } | null)
    if (!auf || auf.status === 'abgeschlossen' || auf.status === 'storniert') continue
    const k = pickOne(auf.kunden as { name: string } | null)
    warnungen.push({
      typ: 'baustopp_aktiv',
      auftrag_id: auf.id,
      kunde: k?.name?.trim() || 'Kundin',
      baustopp_typ: String(r.typ ?? ''),
      baustopp_grund: String(r.grund ?? ''),
    })
  }

  const ng = nGesendetKunde ?? 0
  const na = nAuftragMitAng ?? 0
  const conversionProzent = ng > 0 ? Math.round((na / ng) * 100) : null

  const counts = new Map<string, number>()
  for (const row of ablehnRaw ?? []) {
    const g = (row as { ablehnung_grund: string | null }).ablehnung_grund
    if (!g) continue
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  const ablehnungTop = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([grund, anzahl]) => ({ grund: labelKundeAblehnung(grund), anzahl }))

  const datenschutzFaellig = await countDatenschutzFaellige()

  const initial: DashboardInitial = {
    neueHeute: neueHeute ?? 0,
    offeneAngebote: offeneAngebote ?? 0,
    aktiveAuftraege: aktiveAuftraege ?? 0,
    termineWoche: termineWoche ?? 0,
    letzteAnfragen: (leadsData ?? []) as Pick<
      Lead,
      'id' | 'kontakt_name' | 'status' | 'situation' | 'plz' | 'created_at'
    >[],
    warnungen,
    statistik: {
      conversionProzent,
      ablehnungTop,
    },
    datenschutzFaellig,
  }

  return <DashboardHomeClient initial={initial} />
}
