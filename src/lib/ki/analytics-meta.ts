import { KI_BEREICH_ORDER } from '@/lib/ki/constants'
import type { FunnelOverviewErgebnis, KiClusterAnalyseRow } from '@/lib/ki/types'

export type KiAnalyticsMeta = {
  zahlenAktualisiertAm: string | null
  zahlenAktualisiertLabel: string
  kiTexteAnzahl: number
  kiTexteGesamt: number
  leadsGesamt: number | null
  leadsMitAngebot: number | null
  auftraegeGesamt: number | null
  auftraegeAbgeschlossen: number | null
  conversionAnfrageAngebot: number | null
  medianTageAnfrageAngebot: number | null
  kiBereicheGesamt: number
}

function formatRelativeDe(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 2) return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h} Std.`
  const d = Math.floor(h / 24)
  return `vor ${d} Tag${d > 1 ? 'en' : ''}`
}

export function buildKiAnalyticsMeta(analysen: KiClusterAnalyseRow[]): KiAnalyticsMeta {
  let latest: string | null = null
  let kiTexte = 0

  for (const row of analysen) {
    if (row.narrative?.trim()) kiTexte += 1
    if (!latest || new Date(row.generiert_am) > new Date(latest)) {
      latest = row.generiert_am
    }
  }

  const funnel = analysen.find((r) => r.bereich === 'funnel')
  const k = funnel?.ergebnis as FunnelOverviewErgebnis | undefined

  return {
    zahlenAktualisiertAm: latest,
    zahlenAktualisiertLabel: latest ? formatRelativeDe(latest) : 'noch nie',
    kiTexteAnzahl: kiTexte,
    kiTexteGesamt: KI_BEREICH_ORDER.length,
    leadsGesamt: k?.kennzahlen?.leads_gesamt ?? null,
    leadsMitAngebot: k?.kennzahlen?.leads_mit_angebot ?? null,
    auftraegeGesamt: k?.kennzahlen?.auftraege_gesamt ?? null,
    auftraegeAbgeschlossen: k?.kennzahlen?.auftraege_abgeschlossen ?? null,
    conversionAnfrageAngebot: k?.kennzahlen?.conversion_anfrage_zu_angebot ?? null,
    medianTageAnfrageAngebot: k?.zyklen?.anfrage_zu_angebot?.median_tage ?? null,
    kiBereicheGesamt: KI_BEREICH_ORDER.length,
  }
}
