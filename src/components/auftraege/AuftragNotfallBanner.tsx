'use client'

/** Banner am Auftrag (§4): Notfall / Abrechnung nach Aufwand|Festpreis. */
export function AuftragNotfallBanner({
  istNotfall,
  verguetung,
}: {
  istNotfall?: boolean | null
  verguetung?: string | null
}) {
  if (!istNotfall) return null
  const ab =
    verguetung === 'festpreis'
      ? 'Abrechnung Festpreis'
      : 'Abrechnung nach Aufwand'

  return (
    <div
      className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-950"
      role="status"
    >
      <strong className="font-semibold">Notfall:</strong> Ausführung läuft · HV informiert ·{' '}
      {ab}
      <span className="ml-2 text-emerald-800/80">(ohne Betragsdeckel)</span>
    </div>
  )
}
