import { redirect } from 'next/navigation'

/** Phase 8: Abschluss-Modal entfernt — ein Weg über Abnahme-Canvas. */
export default function AuftragAbschlussPage({ params }: { params: { id: string } }) {
  redirect(`/auftraege/${params.id}/abnahme/erstellen`)
}
