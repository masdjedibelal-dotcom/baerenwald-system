import { redirect } from 'next/navigation'

/** Legacy: Abnahme läuft über „Auftrag abschließen“ im Auftrag-Detail. */
export default function AuftragAbnahmeErstellenRedirect({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/auftraege/${params.id}`)
}
