'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'

/** Banner am Auftrag (§10): Notfall — Abrechnung nur nach Aufwand. Mock: grünes OK-Band. */
export function AuftragNotfallBanner({
  istNotfall,
  verguetung: _verguetung,
}: {
  istNotfall?: boolean | null
  /** Spalte bleibt; Anzeige immer Aufwand (Phase 9: kein Festpreis-Zweig). */
  verguetung?: string | null
}) {
  if (!istNotfall) return null

  return (
    <div className="auftrag-notfall-banner" role="status">
      <MockIcon ctx="emphasis" n="checks" size={16} />
      <span>
        <strong>Notfall:</strong> Ausführung läuft · HV informiert · Abrechnung nach Aufwand
      </span>
    </div>
  )
}
