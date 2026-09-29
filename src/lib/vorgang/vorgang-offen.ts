import type { VorgangListeRow, VorgangPhase } from '@/lib/vorgang/types'
import { rechnungStatusDisplay } from '@/lib/status/status-display'
import { variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'

/**
 * Einzige Quelle für „offen / erledigt“ eines Vorgangs.
 * Vorgänge-Liste, KPI-Karten und Dashboard zählen hierüber (keine eigenen Status-Listen).
 */
export function vorgangStatusKind(row: VorgangListeRow): string {
  const u = row.unterstatus.toLowerCase()
  // Storno-Gutschrift: eigener Badge-Look unter Erledigt
  if (row.belegTyp === 'gutschrift') return 'storniert'
  // Abgeschlossener Auftrag ohne RE — in Rechnung/Offen, nicht als „fertig“
  if (row.phase === 'rechnung' && u === 'ausstehend') return 'neu'
  if (row.phase === 'rechnung') {
    const d = rechnungStatusDisplay(row.unterstatus, {
      ueberfaellig: row.ueberfaellig,
      eingehend: row.rechnungRichtung === 'eingehend',
    })
    return variantToMockBadgeKind(d.variant)
  }
  if (
    u === 'storniert' ||
    u === 'abgebrochen' ||
    u === 'abgelehnt' ||
    u === 'abgelaufen' ||
    u === 'ersetzt'
  ) {
    return 'storniert'
  }
  if (u === 'bezahlt' || u === 'abgeschlossen' || u === 'angenommen' || u === 'hm_erledigt') {
    return 'fertig'
  }
  if (u === 'neu' || u === 'entwurf' || u === 'offen') return 'neu'
  if (u === 'gesendet' || u === 'abnahme' || u === 'kontaktiert' || u === 'termin') return 'warten'
  return 'aktiv'
}

/** Abgeschlossen / verloren / storniert → Erledigt; sonst Offen. */
export function isVorgangErledigt(row: VorgangListeRow): boolean {
  const kind = vorgangStatusKind(row)
  return kind === 'storniert' || kind === 'fertig'
}

/** Offene Vorgänge je Phase — genau das, was die Liste unter „Offen“ im jeweiligen Tab zeigt. */
export function zaehleOffeneVorgaenge(rows: VorgangListeRow[]): Record<VorgangPhase, number> {
  const out: Record<VorgangPhase, number> = { anfrage: 0, angebot: 0, auftrag: 0, rechnung: 0 }
  for (const r of rows) {
    if ((r.rechnungRichtung ?? 'ausgehend') === 'eingehend') continue
    if (isVorgangErledigt(r)) continue
    out[r.phase] += 1
  }
  return out
}
