import { redirect } from 'next/navigation'

/** Legacy: Abnahme läuft über AuftragAbschliessenSheet im Auftrag-Detail. */
export default function AuftragAbnahmeErstellenRedirect({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/auftraege/${params.id}?tab=abnahme&abschliessen=1`)
}
