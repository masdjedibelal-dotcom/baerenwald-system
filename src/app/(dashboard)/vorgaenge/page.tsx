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

type PageProps = {
  searchParams?: Promise<{ seite?: string }>
}

export default async function VorgaengePage({ searchParams }: PageProps) {
  try {
    const sp = (await searchParams) ?? {}
    const page = Math.max(1, Number.parseInt(String(sp.seite ?? '1'), 10) || 1)
    const supabase = createClient()
<<<<<<< Updated upstream
    const [{ rows, error, pagination }, hw] = await Promise.all([
      loadVorgaengeListe({ page, pageSize: 50, fetchAllPages: false }),
=======
    const [{ rows, error, listeTruncated }, hw] = await Promise.all([
      loadVorgaengeListe(),
>>>>>>> Stashed changes
      loadHwEingangsrechnungen(supabase),
    ])

    if (error) {
      const isSession = /sitzung|anmelden|session|auth/i.test(error)
      return (
        <div className="space-y-3 p-6 text-sm">
          <p className="text-danger">
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
        <VorgaengeListeClient
          rows={rows}
          hwEingangsrechnungen={hw.rows}
<<<<<<< Updated upstream
          serverPagination={pagination ?? null}
=======
          listeTruncated={listeTruncated ?? null}
>>>>>>> Stashed changes
        />
      </Suspense>
    )
  } catch (e) {
    console.error('VorgaengePage', e)
    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler'
    return (
      <div className="space-y-3 p-6 text-sm">
        <p className="text-danger">Vorgänge konnten nicht geladen werden: {msg}</p>
        <a href="/" className="text-bw-link underline">
          Zurück zum Dashboard
        </a>
      </div>
    )
  }
}
