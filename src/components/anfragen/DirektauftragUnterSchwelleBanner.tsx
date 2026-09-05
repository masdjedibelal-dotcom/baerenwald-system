function formatEur(n: number): string {
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`
}

/** Gelber Hinweis: Angebot unter Freigabe-Schwelle → Direktauftrag ohne HV. */
export function DirektauftragUnterSchwelleBanner({
  betragEur,
  schwelleEur,
}: {
  betragEur: number
  schwelleEur: number
}) {
  return (
    <div className="crm-direkt-schwelle-banner" role="status">
      <div className="crm-direkt-schwelle-banner__title">
        Direktauftrag möglich — unter Freigabe-Schwelle
      </div>
      <p className="crm-direkt-schwelle-banner__body">
        Angebotspreis {formatEur(betragEur)} ≤ Schwelle {formatEur(schwelleEur)}. Auftrag ohne
        HV-Freigabe / ohne Kundenmail anlegen.
      </p>
    </div>
  )
}
