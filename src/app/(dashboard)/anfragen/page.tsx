import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Anfragen',
}

/** Positivliste: Phasen-Listen laufen über Vorgänge (Phase-Filter).
 *  `?neu=1` öffnet den Fullscreen-Wizard (wie Angebot/Rechnung). */
export default function AnfragenPage({
  searchParams,
}: {
  searchParams: { neu?: string; kunde_id?: string; ziel?: string }
}) {
  if (searchParams.neu === '1') {
    const q = new URLSearchParams()
    if (searchParams.kunde_id?.trim()) q.set('kunde_id', searchParams.kunde_id.trim())
    if (searchParams.ziel?.trim()) q.set('ziel', searchParams.ziel.trim())
    const qs = q.toString()
    redirect(qs ? `/anfragen/neu?${qs}` : '/anfragen/neu')
  }
  redirect('/vorgaenge?tab=anfrage')
}
