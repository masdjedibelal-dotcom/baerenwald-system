import { redirect } from 'next/navigation'

/** Legacy: Abschlussbericht nur noch im Rechnungswizard. */
export default function AuftragAbschlussberichtRedirect({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/auftraege/${params.id}`)
}
