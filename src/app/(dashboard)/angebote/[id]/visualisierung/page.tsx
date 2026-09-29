import { redirect } from 'next/navigation'

/** Visualisierungen sind entfallen (Entscheidung 30.09.2026) — alte Links führen zum Angebot. */
export default function AngebotVisualisierungPage({ params }: { params: { id: string } }) {
  redirect(`/angebote/${params.id}`)
}
