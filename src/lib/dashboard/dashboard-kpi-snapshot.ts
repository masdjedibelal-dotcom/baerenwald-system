import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  dashboardZeitraumLabel,
  type DashboardZeitraumFilter,
  type FunnelStufe,
  type GewerkUmsatzZeile,
  type RankingZeile,
  type UmsatzMonat,
} from '@/lib/dashboard/dashboard-analytics'
import type { DashboardMarketingSnapshot } from '@/lib/dashboard/dashboard-marketing'

type SnapshotKpi = { label: string; value: number }

/** Text-Snapshot der sichtbaren Dashboard-Zahlen für den KI-Assistenten. */
export function buildDashboardKpiSnapshot(input: {
  zeitraumFilter: DashboardZeitraumFilter
  kpis: SnapshotKpi[]
  marketing: DashboardMarketingSnapshot
  umsatzMonate: UmsatzMonat[]
  funnel: {
    stufen: FunnelStufe[]
    conversionGesamt: number
    dropoffs: { after: string; lost: number; rate: number }[]
  }
  gewerk: { zeilen: GewerkUmsatzZeile[]; gesamt: number }
  rankingHandwerker: RankingZeile[]
  rankingKunden: RankingZeile[]
}): string {
  const zeitraum = dashboardZeitraumLabel(input.zeitraumFilter)
  const lines: string[] = [
    `DASHBOARD-KPI-SNAPSHOT (Zeitraum: ${zeitraum})`,
    '',
    '## KPI-Kacheln',
  ]

  for (const k of input.kpis ?? []) {
    lines.push(`- ${k.label}: ${k.value}`)
  }

  const months = input.umsatzMonate ?? []
  const umsatzTotal = months.reduce(
    (s, m) => s + (Number(m?.offen) || 0) + (Number(m?.abgeschlossen) || 0),
    0
  )
  lines.push('', '## Umsatzverlauf (letzte 6 Monate, Auftragssummen netto)')
  lines.push(`- Summe gesamt: ${formatEurBetrag(umsatzTotal)}`)
  for (const m of months) {
    const offen = Number(m?.offen) || 0
    const done = Number(m?.abgeschlossen) || 0
    lines.push(`- ${m.label}: ${formatEurBetrag(offen + done)} (offen ${formatEurBetrag(offen)}, abgeschlossen ${formatEurBetrag(done)})`)
  }

  lines.push('', '## Vertriebs-Funnel')
  lines.push(`- Gesamt-Conversion: ${input.funnel.conversionGesamt}%`)
  for (const s of input.funnel.stufen ?? []) {
    lines.push(`- ${s.label}: ${s.count} (${s.rate}%)`)
  }
  for (const d of input.funnel.dropoffs ?? []) {
    if (d.lost > 0) {
      lines.push(`- Drop nach ${d.after}: −${d.lost} (${d.rate}%)`)
    }
  }

  lines.push('', '## Umsatz nach Gewerk')
  lines.push(`- Gesamt: ${formatEurBetrag(input.gewerk.gesamt)}`)
  for (const z of (input.gewerk.zeilen ?? []).slice(0, 12)) {
    lines.push(`- ${z.name}: ${formatEurBetrag(z.netto)} (${z.anteil}%)`)
  }

  lines.push('', '## Top-Handwerker (max. 8)')
  ;(input.rankingHandwerker ?? []).slice(0, 8).forEach((r, i) => {
    lines.push(
      `${i + 1}. ${r.name} · Vorgänge ${r.vorgaenge} · Umsatz ${formatEurBetrag(r.umsatz)}${r.sub ? ` · ${r.sub}` : ''}`
    )
  })

  lines.push('', '## Top-Kunden (max. 8)')
  ;(input.rankingKunden ?? []).slice(0, 8).forEach((r, i) => {
    lines.push(
      `${i + 1}. ${r.name} · Vorgänge ${r.vorgaenge} · Umsatz ${formatEurBetrag(r.umsatz)}${r.sub ? ` · ${r.sub}` : ''}`
    )
  })

  const m = input.marketing
  lines.push('', '## Marketing (sichtbarer Zeitraum)')
  if (m.pageviewsOk) lines.push(`- Pageviews: ${m.pageviews ?? '—'}`)
  else if (m.pageviewsError) lines.push(`- Pageviews: Fehler (${m.pageviewsError})`)
  if (m.gscOk) {
    lines.push(`- GSC Klicks: ${m.gscClicks ?? '—'}`)
    lines.push(`- GSC Impressions: ${m.gscImpressions ?? '—'}`)
  } else if (m.gscError) {
    lines.push(`- GSC: Fehler (${m.gscError})`)
  }
  if (m.funnelOk && m.funnelStages?.length) {
    lines.push('- Rechner-Funnel:')
    for (const s of m.funnelStages) {
      const pct = s.pctOfStart != null ? ` · ${s.pctOfStart}% vom Start` : ''
      const drop =
        s.dropoffLost != null && s.dropoffLost > 0
          ? ` · Drop −${s.dropoffLost}${s.dropoffPct != null ? ` (${s.dropoffPct}%)` : ''}`
          : ''
      lines.push(`  · ${s.label}: ${s.count}${pct}${drop}`)
    }
  } else if (m.funnelError) {
    lines.push(`- Rechner-Funnel: Fehler (${m.funnelError})`)
  }
  if (m.topQueries?.length) {
    lines.push('- Top-Suchanfragen:')
    for (const q of m.topQueries.slice(0, 5)) {
      lines.push(`  · „${q.query}“ · ${q.clicks} Klicks · ${q.impressions} Imp.`)
    }
  }

  return lines.join('\n')
}

export const DASHBOARD_KPI_ANALYSE_PROMPT = `Analysiere die aktuellen Dashboard-KPIs (siehe Kontext-Snapshot).

Rolle: Business-Analyst für den Geschäftsführer von Bärenwald (Handwerk / Baureparaturen CRM).

Strukturiere die Antwort so:
1) **Lage in 3–5 Sätzen** — was die Zahlen insgesamt sagen
2) **Auffälligkeiten** — was positiv/negativ heraussticht (Funnel-Drops, überfällige/offene Größen, Umsatz, Ranking, Marketing falls relevant)
3) **Wichtigste Kennzahlen** — max. 5 Bullet-Points mit konkreten Zahlen aus dem Snapshot
4) **Handlungsempfehlungen** — 3–5 klare nächste Schritte / Entscheidungen (priorisiert)

Regeln: Nur auf dem Snapshot basieren, nichts erfinden. Kein Marketing-Blabla. Kurz, klar, entscheidungsorientiert. Deutsch, Du-Form.`
