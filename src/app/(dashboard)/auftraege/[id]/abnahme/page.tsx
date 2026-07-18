import { redirect } from 'next/navigation'

/** Vor-Ort-Abnahme läuft inline im Auftrag-Tab. */
export default function AuftragAbnahmePage({ params }: { params: { id: string } }) {
  redirect(`/auftraege/${params.id}?tab=abnahme`)
}
