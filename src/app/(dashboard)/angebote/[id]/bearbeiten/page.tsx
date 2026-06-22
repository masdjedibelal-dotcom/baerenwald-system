import { redirect } from 'next/navigation'

export default function AngebotBearbeitenRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/angebote/neu?angebot_id=${params.id}`)
}
