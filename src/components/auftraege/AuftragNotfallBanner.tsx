'use client'

/** Banner am Auftrag (§10): Notfall — Abrechnung nur nach Aufwand. */
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
    <div
      className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[length:var(--fs-text)] text-emerald-950"
      role="status"
    >
      <strong className="font-semibold">Notfall:</strong> Ausführung läuft · HV informiert ·
      Abrechnung nach Aufwand
    </div>
  )
}
