import { redirect } from 'next/navigation'

/** Legacy-Route: Angebots-Auswahl läuft wieder als Modal auf der Anfrage-Detailseite. */
export default function AnfrageAngeboteRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/anfragen/${params.id}?angebote=1`)
}
