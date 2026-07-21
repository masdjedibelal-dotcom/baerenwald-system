import { notFound } from 'next/navigation'
import { FormularOeffentlichClient } from '@/components/formulare/FormularOeffentlichClient'
import { loadOeffentlichesFormular } from '@/app/formular/[token]/load-formular'

export default async function OeffentlichesFormularPage({
  params,
}: {
  params: { token: string }
}) {
  const data = await loadOeffentlichesFormular(params.token)
  if (!data) notFound()

  return <FormularOeffentlichClient initial={data} />
}
