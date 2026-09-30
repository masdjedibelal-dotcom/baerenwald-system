import { redirect } from 'next/navigation'

/** Mängel-Nacharbeit entfällt (30.09.2026): Mängel stehen im Abnahmeprotokoll — fertig. */
export default function AuftragAbnahmeMaengelPage({ params }: { params: { id: string } }) {
  redirect(`/auftraege/${params.id}`)
}
