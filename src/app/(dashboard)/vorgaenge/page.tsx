import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { loadVorgaengeListe } from '@/lib/vorgang/load-vorgaenge-liste'
import { loadHwEingangsrechnungen } from '@/lib/rechnungen/load-hw-eingangsrechnungen'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'

export const metadata: Metadata = {
  title: 'Vorgänge',
}

export const dynamic = 'force-dynamic'

export default async function VorgaengePage() {
  const supabase = createClient()
  const [{ rows, error }, hw] = await Promise.all([
    loadVorgaengeListe(),
    loadHwEingangsrechnungen(supabase),
  ])

  if (error) {
    const isSession = /sitzung|anmelden|session|auth/i.test(error)
    return (
      <div className="space-y-3 p-6 text-sm">
        <p className="text-red-700">
          Vorgänge konnten nicht geladen werden: {error}
        </p>
        {isSession ? (
          <a href="/login?error=session" className="text-bw-link underline">
            Zur Anmeldung
          </a>
        ) : null}
      </div>
    )
  }

  return (
    <Suspense fallback={<CrmInlineLoading label="Vorgänge werden geladen …" />}>
      <VorgaengeListeClient rows={rows} hwEingangsrechnungen={hw.rows} />
    </Suspense>
  )
}
