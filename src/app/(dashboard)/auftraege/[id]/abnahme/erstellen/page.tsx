import { redirect } from 'next/navigation'

/** Abnahmeprotokoll wird inline im Auftrag-Tab gepflegt — kein Wizard mehr. */
export default function AuftragAbnahmeErstellenPage({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/auftraege/${params.id}?tab=abnahme`)
}
