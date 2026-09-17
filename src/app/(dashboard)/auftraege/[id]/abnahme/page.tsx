import { redirect } from 'next/navigation'

/** Abnahme → Canvas (Create-Wizard), nicht mehr nur Abschluss-Sheet. */
export default function AuftragAbnahmePage({ params }: { params: { id: string } }) {
  redirect(`/auftraege/${params.id}/abnahme/erstellen`)
}
