import { formatEuro } from '@/lib/format/geld-datum'
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
        Angebotspreis {formatEuro(betragEur)} ≤ Schwelle {formatEuro(schwelleEur)}. Auftrag ohne
        HV-Freigabe / ohne Kundenmail anlegen.
      </p>
    </div>
  )
}
