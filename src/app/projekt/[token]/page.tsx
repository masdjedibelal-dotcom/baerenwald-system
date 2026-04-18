import { ProjektStatusClient } from '@/components/projekt/ProjektStatusClient'
import { loadPublicProjektByToken } from '@/lib/projekt/load-public-projekt'

export const dynamic = 'force-dynamic'

export default async function ProjektOeffentlichPage({ params }: { params: { token: string } }) {
  const data = await loadPublicProjektByToken(params.token)
  const tel = process.env.EMAIL_FIRMEN_TEL ?? process.env.NEXT_PUBLIC_EMAIL_TEL ?? '+49 89 00000000'

  return <ProjektStatusClient initial={data} tel={tel} />
}
