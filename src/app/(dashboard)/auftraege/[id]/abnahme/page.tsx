import { redirect } from 'next/navigation'

/** Vor-Ort-Abnahme läuft über AuftragAbschliessenSheet im Auftrag. */
export default function AuftragAbnahmePage({ params }: { params: { id: string } }) {
  redirect(`/auftraege/${params.id}?tab=abnahme&abschliessen=1`)
}
