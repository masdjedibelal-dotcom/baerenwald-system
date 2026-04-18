import type { Metadata } from 'next'
import { HandwerkerAnfrageClient } from '@/components/handwerker/HandwerkerAnfrageClient'

export const metadata: Metadata = {
  title: 'Anfrage',
  description: 'Anfrage von Bärenwald München',
}

export default function HandwerkerAnfragePage({ params }: { params: { token: string } }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <HandwerkerAnfrageClient token={params.token} />
    </div>
  )
}
