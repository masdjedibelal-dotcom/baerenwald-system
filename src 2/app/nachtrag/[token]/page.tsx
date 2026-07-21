import { loadNachtragPublicByToken } from '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'
import { NachtragPublicForm } from '@/components/nachtrag/NachtragPublicForm'

export const dynamic = 'force-dynamic'

export default async function NachtragPublicPage({ params }: { params: { token: string } }) {
  const data = await loadNachtragPublicByToken(params.token)
  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold text-ink">Dieser Link ist nicht mehr gültig.</p>
      </div>
    )
  }

  return <NachtragPublicForm initial={data} />
}
