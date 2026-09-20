import { MockIcon } from '@/components/mock-ui/MockIcon'
import { logDbError } from '@/lib/errors/log-db-error'
import { BRAND_ALT, resolveBrandLogoUrl } from '@/lib/brand'
import { TokenLinkInvalid } from '@/components/public/TokenLinkInvalid'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { C } from '@/lib/tokens/colors'

export const dynamic = 'force-dynamic'

export default async function LeadStatusPublicPage({ params }: { params: { id: string } }) {
  const { telefonFuerKundenMail } = await import('@/lib/telefon-kunden-mail')
  const tel = telefonFuerKundenMail(process.env.EMAIL_FIRMEN_TEL ?? process.env.NEXT_PUBLIC_EMAIL_TEL)
  const logoUrl = resolveBrandLogoUrl('white')
  const siteFooter =
    process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://baerenwald-muenchen.de'

  const {data: lead, error} = await supabaseAdmin
    .from('leads')
    .select('id, kontakt_name, status, kunden!kunde_id(name)')
    .eq('id', params.id)
    .maybeSingle()
  if (error) logDbError('app/status/[id]/page:leads', error)

  if (!lead) {
    return <TokenLinkInvalid />
  }

  const rawName =
    String((lead as { kontakt_name?: string | null }).kontakt_name ?? '').trim() ||
    String((lead as { kunden?: { name?: string } | null }).kunden?.name ?? '').trim()
  const firstName = rawName.split(/\s+/)[0] || 'Guten Tag'
  const st = String((lead as { status?: string }).status ?? 'neu')

  return (
    <div className="min-h-screen bg-bw-bg-soft">
      <header className="bg-bw-dark px-6 py-4 text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={BRAND_ALT} className="h-9 w-auto object-contain" />
          <span className="text-sm opacity-90">Ihr Projekt</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-xl font-semibold text-bw-dark">Hallo {firstName}</h1>
        <p className={`mt-4 text-sm leading-relaxed text-[var(--text-2,${C.text2})]`}>
          Vielen Dank für Ihre Anfrage. Aktueller Stand: <strong>{st}</strong>. Wir melden uns bei Ihnen.
        </p>
        <a
          href={`tel:${tel.replace(/\s/g, '')}`}
          className="mt-8 flex min-h-[52px] items-center justify-center gap-2 rounded-sheet bg-bw-primary text-base font-semibold text-white"
        >
          <MockIcon n="phone" ctx="default" className="h-5 w-5" aria-hidden />
          {tel}
        </a>
      </main>
      <footer className="mt-auto border-t border-bw-border bg-bw-bg-soft px-4 py-6 text-center text-xs text-muted">
        Bärenwald Handwerksgruppe München
        <br />
        <a href={`${siteFooter}/datenschutz`} className="text-bw-primary underline">
          Datenschutz
        </a>{' '}
        ·{' '}
        <a href={`${siteFooter}/impressum`} className="text-bw-primary underline">
          Impressum
        </a>
      </footer>
    </div>
  )
}
