import 'server-only'

import { latestAnalysenPerBereich } from '@/lib/ki/queries'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'
import { loadNeuesteEmpfehlungen, loadUmgesetzteEmpfehlungen7d } from '@/lib/ki-hub/queries'
import { loadLatestMarketingMetrics } from '@/lib/ki-hub/marketing-metrics'
import { fetchGscSummary } from '@/lib/ki-hub/sources/google'
import { fetchNetlifyDeployStatus } from '@/lib/ki-hub/sources/netlify'
import { fetchPostHogSummary } from '@/lib/ki-hub/sources/posthog'
import { fetchResendSummary } from '@/lib/ki-hub/sources/resend'
import type {
  KiHubAngebotSnapshot,
  KiHubLeadSnapshot,
  KiHubLoadPayload,
  SystemEventRow,
} from '@/lib/ki-hub/types'
import { supabaseAdmin } from '@/lib/supabase-admin'

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function hoursSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
}

export async function loadKiHubData(): Promise<KiHubLoadPayload> {
  const seit30 = daysAgoIso(30)
  const seit24h = daysAgoIso(1)

  const [
    clusterRaw,
    leadsOffen,
    leads30,
    angeboteOffen,
    angebote30,
    auftraegeAktiv,
    handwerkerAktiv,
    empfehlungen,
    systemEvents,
    umgesetzt7d,
    posthog,
    resend,
    google,
    netlify,
    metricsRows,
  ] = await Promise.all([
    supabaseAdmin
      .from('ki_cluster_analysen')
      .select('*')
      .order('generiert_am', { ascending: false }),
    supabaseAdmin
      .from('leads')
      .select('id, kontakt_name, status, plz, bereiche, created_at')
      .in('status', ['neu', 'kontaktiert', 'termin'])
      .order('created_at', { ascending: true })
      .limit(50),
    supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', seit30),
    supabaseAdmin
      .from('angebote')
      .select('id, angebotsnr, status_einfach, leistungsumfang, gesendet_am, created_at')
      .in('status_einfach', ['entwurf', 'gesendet'])
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('angebote')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', seit30),
    supabaseAdmin
      .from('auftraege')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'abgeschlossen'),
    supabaseAdmin
      .from('handwerker')
      .select('id', { count: 'exact', head: true })
      .eq('aktiv', true),
    loadNeuesteEmpfehlungen(),
    supabaseAdmin
      .from('system_events')
      .select('*')
      .gte('created_at', seit24h)
      .order('created_at', { ascending: false })
      .limit(30),
    loadUmgesetzteEmpfehlungen7d(),
    fetchPostHogSummary(),
    fetchResendSummary(),
    fetchGscSummary(),
    fetchNetlifyDeployStatus(),
    loadLatestMarketingMetrics(),
  ])

  const cluster = latestAnalysenPerBereich((clusterRaw.data ?? []) as KiClusterAnalyseRow[])

  const leads_offen: KiHubLeadSnapshot[] = (leadsOffen.data ?? []).map((l) => ({
    id: l.id as string,
    kontakt_name: l.kontakt_name as string | null,
    status: l.status as string,
    plz: l.plz as string | null,
    bereiche: l.bereiche,
    created_at: l.created_at as string,
    stunden_offen: hoursSince(l.created_at as string),
  }))

  const angebote_offen: KiHubAngebotSnapshot[] = (angeboteOffen.data ?? []).map((a) => ({
    id: a.id as string,
    angebotsnr: a.angebotsnr as string | null,
    status_einfach: a.status_einfach as string | null,
    leistungsumfang: a.leistungsumfang as string | null,
    gesendet_am: a.gesendet_am as string | null,
    created_at: a.created_at as string,
  }))

  return {
    supabase: {
      cluster,
      leads_offen,
      leads_30d_count: leads30.count ?? 0,
      angebote_offen,
      angebote_30d_count: angebote30.count ?? 0,
      auftraege_aktiv_count: auftraegeAktiv.count ?? 0,
      handwerker_aktiv_count: handwerkerAktiv.count ?? 0,
      empfehlungen_heute: empfehlungen,
      system_events_24h: (systemEvents.data ?? []) as SystemEventRow[],
    },
    marketing: {
      posthog,
      google,
      resend,
      metrics_history: metricsRows.map((m) => ({
        quelle: m.quelle,
        metrik: m.metrik,
        wert: m.wert,
        created_at: m.created_at,
      })),
    },
    technik: { netlify },
    umgesetzt_7d: umgesetzt7d,
    timestamp: new Date().toISOString(),
  }
}

/** Komprimiert Load-Payload für Claude (Token-Limit). */
export function compressForClaude(data: KiHubLoadPayload): Record<string, unknown> {
  const funnel = data.supabase.cluster.find((c) => c.bereich === 'funnel')
  return {
    timestamp: data.timestamp,
    leads_offen: data.supabase.leads_offen.slice(0, 15),
    leads_30d: data.supabase.leads_30d_count,
    angebote_offen: data.supabase.angebote_offen.slice(0, 10),
    angebote_30d: data.supabase.angebote_30d_count,
    auftraege_aktiv: data.supabase.auftraege_aktiv_count,
    handwerker_aktiv: data.supabase.handwerker_aktiv_count,
    funnel_kennzahlen: funnel?.ergebnis ?? null,
    cluster_zusammenfassung: data.supabase.cluster.map((c) => ({
      bereich: c.bereich,
      titel: c.titel,
      sample_size: c.sample_size,
      narrative_kurz: c.narrative?.slice(0, 300) ?? null,
      hinweis: (c.ergebnis as { hinweis?: string } | undefined)?.hinweis ?? null,
    })),
    marketing: {
      posthog: data.marketing.posthog.status,
      posthog_data: data.marketing.posthog.data ?? null,
      resend: data.marketing.resend.data ?? null,
      google: data.marketing.google.data ?? data.marketing.google.status,
      gsc_clicks: (data.marketing.google.data?.clicks as number | undefined) ?? null,
    },
    technik: {
      netlify: data.technik.netlify.data ?? null,
      events_24h: data.supabase.system_events_24h.slice(0, 5),
    },
    umgesetzt_7d: data.umgesetzt_7d,
    quellen_hinweise: [
      data.marketing.posthog.status !== 'ok' ? 'PostHog nicht verfügbar' : null,
      data.marketing.google.status !== 'ok' ? 'GSC nicht verfügbar' : null,
    ].filter(Boolean),
  }
}
