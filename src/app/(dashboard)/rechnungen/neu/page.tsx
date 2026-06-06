import { redirect } from 'next/navigation'

/**
 * Legacy-Route: Rechnungen entstehen aus Aufträgen (Wizard).
 * - mit auftrag_id → Rechnungs-Auswahl des Auftrags
 * - sonst → Rechnungsliste
 */
export default function RechnungNeuRedirectPage({
  searchParams,
}: {
  searchParams: { auftrag_id?: string }
}) {
  const auftragId = searchParams.auftrag_id?.trim()

  if (auftragId) {
    redirect(`/auftraege/${auftragId}/rechnungen-auswahl`)
  }

  redirect('/rechnungen')
}
