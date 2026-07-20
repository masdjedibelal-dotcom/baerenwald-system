import type {
  AngebotAbgleichErgebnis,
  FunnelOverviewErgebnis,
  KiClusterAnalyseRow,
  KommunikationErgebnis,
  NachfrageErgebnis,
} from '@/lib/ki/types'
import type { KiPhase } from '@/lib/ki/constants'

export function phaseSummary(phase: KiPhase, byBereich: Map<string, KiClusterAnalyseRow>): string | undefined {
  if (phase.id === 'nachfrage') {
    const funnel = byBereich.get('funnel')?.ergebnis as FunnelOverviewErgebnis | undefined
    const nach = byBereich.get('nachfrage')?.ergebnis as NachfrageErgebnis | undefined
    const k = funnel?.kennzahlen
    const topPlz = nach?.plz_regionen?.[0]?.name
    const topBereich = nach?.bereiche?.[0]?.name
    if (!k) return undefined
    const parts = [`${k.leads_gesamt} Anfragen`]
    if (k.conversion_anfrage_zu_angebot != null) {
      parts.push(`${k.conversion_anfrage_zu_angebot}% werden zu Angeboten`)
    }
    if (topPlz) parts.push(`Top-Region ${topPlz}`)
    if (topBereich) parts.push(`häufig ${topBereich}`)
    const zykl = funnel?.zyklen?.anfrage_zu_angebot
    if (zykl?.median_tage != null) parts.push(`Ø ${zykl.median_tage} T bis Angebot`)
    const kom = byBereich.get('kommunikation')?.ergebnis as KommunikationErgebnis | undefined
    const topMail = kom?.email_nach_typ?.[0]?.name
    if (topMail) parts.push(`Top-Mail: ${topMail}`)
    return parts.join(' · ')
  }

  if (phase.id === 'angebot') {
    const ab = byBereich.get('angebot_abgleich')?.ergebnis as AngebotAbgleichErgebnis | undefined
    const added = ab?.abweichungen?.gewerke_hinzugefuegt?.[0]?.name
    if (added) return `Im Angebot oft ergänzt: ${added}`
    if (ab?.funnel?.conversion_prozent != null) {
      return `${ab.funnel.conversion_prozent}% der Anfragen mit Angebot`
    }
    return undefined
  }

  if (phase.id === 'ausfuehrung') {
    return 'Eigenleistung vs. Partner — Routing und Margen je Gewerk.'
  }

  if (phase.id === 'baustelle') {
    return 'Bautagebuch, Positions-Notizen und Abnahme-Mängel für Checklisten.'
  }

  if (phase.id === 'qualitaet') {
    const bew = byBereich.get('bewertungen')
    if (!bew || bew.sample_size === 0) {
      return 'Nach Projektabschluss Handwerker im Auftrag bewerten.'
    }
    return undefined
  }

  return undefined
}
