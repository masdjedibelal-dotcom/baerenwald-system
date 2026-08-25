import { loadNachtragPublicByToken } from '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'
import { NachtragPublicForm } from '@/components/nachtrag/NachtragPublicForm'
import {
  PublicTokenLegalFooter,
  TokenLinkInvalid,
} from '@/components/public/TokenLinkInvalid'

export const dynamic = 'force-dynamic'

export default async function NachtragPublicPage({ params }: { params: { token: string } }) {
  const data = await loadNachtragPublicByToken(params.token)
  if (!data) {
    return <TokenLinkInvalid />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        <NachtragPublicForm initial={data} />
      </div>
      <PublicTokenLegalFooter />
    </div>
  )
}
