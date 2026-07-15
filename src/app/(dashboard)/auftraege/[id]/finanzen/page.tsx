import { redirect } from 'next/navigation'

export default function AuftragFinanzenPage({ params }: { params: { id: string } }) {
  redirect(`/auftraege/${params.id}?tab=zahlplan`)
}
