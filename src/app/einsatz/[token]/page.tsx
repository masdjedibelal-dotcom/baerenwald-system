import type { Metadata } from 'next'

import { EinsatzAntwortClient } from '@/components/public/EinsatzAntwortClient'
import { TokenLinkInvalid } from '@/components/public/TokenLinkInvalid'
import { BRAND_ALT, resolveBrandLogoUrl } from '@/lib/brand'
import { einsatzPerToken } from '@/lib/einsatz/antwort'
import { formatDatum, formatEuro } from '@/lib/format/geld-datum'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Einsatz — Bärenwald',
  robots: { index: false, follow: false },
}

/** Partner beantwortet einen Einsatz aus der Mail heraus — ohne Login, ein Klick zum Bestätigen. */
export default async function EinsatzAntwortPage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { antwort?: string }
}) {
  const e = await einsatzPerToken(supabaseAdmin, params.token)
  if (!e) return <TokenLinkInvalid />
  const logoUrl = resolveBrandLogoUrl('white')
  const termin =
    e.termin_von && e.termin_bis && e.termin_von !== e.termin_bis
      ? `${formatDatum(e.termin_von)} bis ${formatDatum(e.termin_bis)}`
      : e.termin_von
        ? formatDatum(e.termin_von)
        : 'nach Absprache'
  const zeilen: [string, string][] = [
    ['Termin', termin],
    ...(e.ort ? ([['Ort', e.ort]] as [string, string][]) : []),
    ...(e.kontakt_vor_ort ? ([['Kontakt vor Ort', e.kontakt_vor_ort]] as [string, string][]) : []),
    ...(e.ek_betrag != null && e.ek_betrag > 0
      ? ([['Vergütung', `${formatEuro(e.ek_betrag)} ${e.ek_art}`]] as [string, string][])
      : []),
  ]
  const vorwahl = searchParams.antwort === 'ablehnen' ? 'ablehnen' : searchParams.antwort === 'annehmen' ? 'annehmen' : null

  return (
    <div className="min-h-screen bg-bw-bg-soft">
      <header className="bg-bw-dark px-6 py-4 text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={BRAND_ALT} className="h-9 w-auto object-contain" />
          <span className="text-sm opacity-90">Einsatz für {e.partner_name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-xl font-semibold text-bw-dark">{e.titel}</h1>
        <dl className="einsatz-antwort__daten">
          {zeilen.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {e.anweisung ? <p className="einsatz-antwort__anweisung">{e.anweisung}</p> : null}
        <EinsatzAntwortClient token={params.token} status={e.status} vorwahl={vorwahl} />
      </main>
    </div>
  )
}
