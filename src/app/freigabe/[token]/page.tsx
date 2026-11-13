import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FreigabeAntwortClient } from '@/components/public/FreigabeAntwortClient'
import { TokenLinkInvalid } from '@/components/public/TokenLinkInvalid'
import { BRAND_ALT, resolveBrandLogoUrl } from '@/lib/brand'
import { formatEuro } from '@/lib/format/geld-datum'
import { funktionAn, MARKE } from '@/lib/marke'
import { freigabePerToken } from '@/teo/hv/freigabe-per-mail'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `Freigabe — ${MARKE.name}`,
  robots: { index: false, follow: false },
}

/** Verwaltung entscheidet über ein Angebot über ihrer Grenze — aus der Mail heraus, ohne Login. */
export default async function FreigabePage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { aktion?: string }
}) {
  if (!funktionAn('hvWorkflow')) notFound()
  const f = await freigabePerToken(params.token)
  if (!f) return <TokenLinkInvalid />
  const logoUrl = resolveBrandLogoUrl('white')
  const zeilen: [string, string][] = [
    ['Objekt', f.objektTitel],
    ...(f.angebotsnr ? ([['Angebot', f.angebotsnr]] as [string, string][]) : []),
    ...(f.betragEur != null && f.betragEur > 0 ? ([['Betrag', `${formatEuro(f.betragEur)} netto`]] as [string, string][]) : []),
  ]
  const vorwahl = searchParams.aktion === 'abgelehnt' ? 'abgelehnt' : searchParams.aktion === 'freigegeben' ? 'freigegeben' : null

  return (
    <div className="min-h-screen bg-bw-bg-soft">
      <header className="bg-bw-dark px-6 py-4 text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={BRAND_ALT} className="h-9 w-auto object-contain" />
          <span className="text-sm opacity-90">Freigabe für {f.orgName}</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-xl font-semibold text-bw-dark">{f.titel}</h1>
        <dl className="einsatz-antwort__daten">
          {zeilen.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {f.pdfUrl ? (
          <p className="einsatz-antwort__anweisung">
            <a href={f.pdfUrl} target="_blank" rel="noopener noreferrer">
              Angebot als PDF ansehen
            </a>
          </p>
        ) : null}
        <FreigabeAntwortClient token={params.token} status={f.status} vorwahl={vorwahl} />
      </main>
    </div>
  )
}
