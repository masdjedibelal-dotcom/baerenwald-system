import { FormularOeffentlichClient } from '@/components/formulare/FormularOeffentlichClient'
import {
  PublicTokenLegalFooter,
  TokenLinkInvalid,
} from '@/components/public/TokenLinkInvalid'
import { loadOeffentlichesFormular } from '@/app/formular/[token]/load-formular'

export default async function OeffentlichesFormularPage({
  params,
}: {
  params: { token: string }
}) {
  const data = await loadOeffentlichesFormular(params.token)
  if (!data) return <TokenLinkInvalid />

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        <FormularOeffentlichClient initial={data} />
      </div>
      <PublicTokenLegalFooter />
    </div>
  )
}
