import type { AuftragStatus,LeadStatus } from '@/lib/types'

export const PROJEKT_PHASEN = ['Anfrage', 'Angebot', 'Auftrag', 'Abnahme', 'Fertig'] as const

export type ProjektPhasenEntities = {
  /** true wenn mindestens ein Angebot zur Anfrage existiert */
  hasAngebot?: boolean
  /** true wenn ein Auftrag existiert (Token-/Detail-Seite) */
  hasAuftrag?: boolean
  /**
   * Gestellte Kundenrechnung (gesendet/bezahlt, keine Gutschrift).
   * → Live-Status: Punkt 5 „Fertig“ als erledigt (✓), nicht nur aktiv.
   */
  hasRechnung?: boolean
  aufStatus: AuftragStatus
  /** nur Fallback / Drift-Diagnose — nicht als Phasenquelle */
  leadStatus?: LeadStatus | null
}

/**
 * Phasenindex aus EXISTIERENDEN Entitäten (Auftrag/Angebot), nicht aus Lead-status allein.
 * Drift (Lead sagt „auftrag“, aber kein Auftrag) wird geloggt.
 *
 * Rückgabe `PROJEKT_PHASEN.length` (5) = alle Schritte inkl. Fertig erledigt (✓).
 * Index 0–4 = aktueller Schritt (aktiv); Vorgänger sind erledigt.
 */
export function aktuellePhaseIndexFromEntities(e: ProjektPhasenEntities): number {
  const { aufStatus, hasAngebot, hasAuftrag, hasRechnung, leadStatus } = e
  // Fertig erledigt: Abschluss ODER gestellte Rechnung (Kunden-Live-Status Punkt 5)
  if (aufStatus === 'abgeschlossen' || hasRechnung) return PROJEKT_PHASEN.length
  if (aufStatus === 'abnahme') return 3
  if (aufStatus === 'storniert') return 0
  if (aufStatus === 'offen' || aufStatus === 'in_arbeit' || hasAuftrag) return 2
  if (hasAngebot) return 1

  // Drift: Lead behauptet Auftrag/Angebot ohne Entity
  if (leadStatus === 'auftrag' || leadStatus === 'abgeschlossen') {
    console.warn('[projekt-phasen] Drift: leadStatus=%s ohne Auftrag — Phase Anfrage', leadStatus)
  } else if (leadStatus === 'angebot' && !hasAngebot) {
    console.warn('[projekt-phasen] Drift: leadStatus=angebot ohne Angebot-Entity')
  }

  if (leadStatus === 'neu' || leadStatus === 'kontaktiert' || leadStatus === 'termin') return 0
  return 0
}
