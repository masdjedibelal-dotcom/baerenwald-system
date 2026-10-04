import type { AuftragListeEintrag,AuftragStatus,AuftragDetail } from '@/lib/types'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import { formatPreis } from '@/lib/utils'
import { auftragPositionenFuerSumme } from '@/lib/auftraege/auftrag-position-aktiv'
import { nettoZuBrutto } from '@/lib/angebot-einfach'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'

/** Anzeige-Nr. bis ein echtes `auftragsnr`-Feld existiert (z. B. AU-2026-A3F2). */
export function formatAuftragsNr(a: Pick<AuftragListeEintrag, 'id' | 'created_at'>): string {
  const d = new Date(a.created_at)
  const year = Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear()
  const seq = a.id.replace(/-/g, '').slice(-4).toUpperCase()
  return `AU-${year}-${seq}`
}

export function auftragKundenName(a: AuftragListeEintrag): string {
  const k = a.kunden
  if (!k) return 'Ohne Kunde'
  const display = kundeDisplayName(k)
  return display !== '—' ? display : 'Ohne Kunde'
}

export function auftragTitel(a: AuftragListeEintrag): string {
  return a.titel?.trim() || auftragKundenName(a)
}

/** Auftragswert als Brutto (wie Abschlagsplan / Rechnungen / Listen). */
export function auftragWertNum(a: AuftragListeEintrag, mwstSatz = DEFAULT_MWST_SATZ): number {
  const pos = (a as AuftragDetail).auftrag_positionen
  if (Array.isArray(pos) && pos.length) {
    // preis_fix ist bereits die Zeilensumme (Menge × Einzelpreis)
    const netto = auftragPositionenFuerSumme(pos).reduce((s, p) => s + (Number(p.preis_fix) || 0), 0)
    if (netto > 0) return nettoZuBrutto(netto, mwstSatz)
  }
  if (!a.angebote) return 0
  const netto = a.angebote.gesamt_fix ?? a.angebote.gesamt_max ?? a.angebote.gesamt_min ?? 0
  return nettoZuBrutto(netto, mwstSatz)
}

export function auftragWertAnzeige(a: AuftragListeEintrag, mwstSatz = DEFAULT_MWST_SATZ): string {
  const brutto = auftragWertNum(a, mwstSatz)
  if (brutto <= 0) {
    if (!a.angebote && !(a as AuftragDetail).auftrag_positionen?.length) return '—'
  }
  return formatPreis(brutto, null, null)
}

export function auftragFortschritt(a: AuftragListeEintrag): number {
  if (a.fortschritt != null && !Number.isNaN(Number(a.fortschritt))) {
    return Math.min(100, Math.max(0, Math.round(Number(a.fortschritt))))
  }
  const byStatus: Record<AuftragStatus, number> = {
    offen: 15,
    in_arbeit: 55,
    abnahme: 85,
    abgeschlossen: 100,
    storniert: 0,
  }
  return byStatus[a.status] ?? 0
}
