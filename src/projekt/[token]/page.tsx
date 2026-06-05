import { Suspense } from 'react'
import { ProjektStatusClient } from '@/components/projekt/ProjektStatusClient'
import { loadPublicProjektByToken } from '@/lib/projekt/load-public-projekt'

export const dynamic = 'force-dynamic'

export default async function ProjektOeffentlichPage({ params }: { params: { token: string } }) {
  const data = await loadPublicProjektByToken(params.token)
  const { telefonFuerKundenMail } = await import('@/lib/telefon-kunden-mail')
  const tel = telefonFuerKundenMail(process.env.EMAIL_FIRMEN_TEL ?? process.env.NEXT_PUBLIC_EMAIL_TEL)

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F6F3]" />}>
      <ProjektStatusClient initial={data} tel={tel} />
    </Suspense>
  )
}
