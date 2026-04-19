import { redirect } from 'next/navigation'

export default function FormularDetailRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/formulare/${params.id}/bearbeiten`)
}
