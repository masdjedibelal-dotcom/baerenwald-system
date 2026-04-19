import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export default async function LeadStatusPublicPage({ params }: { params: { id: string } }) {
  const tel = process.env.EMAIL_FIRMEN_TEL ?? process.env.NEXT_PUBLIC_EMAIL_TEL ?? '+49 89 00000000'
  const logoUrl = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL ?? ''

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, kontakt_name, status, kunden(name)')
    .eq('id', params.id)
    .maybeSingle()

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#F7F6F3]">
        <header className="bg-[#1A3D2B] px-6 py-4 text-white">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-8 w-auto object-contain brightness-0 invert" />
            ) : (
              <span className="text-lg font-semibold">Bärenwald</span>
            )}
            <span className="text-sm opacity-90">Ihr Projekt</span>
          </div>
        </header>
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-lg font-semibold text-[#1A3D2B]">Link nicht gefunden</h1>
          <p className="mt-3 text-sm text-[#6B7280]">Dieser Status-Link ist ungültig oder abgelaufen.</p>
          <a href={`tel:${tel.replace(/\s/g, '')}`} className="mt-8 inline-block rounded-xl bg-[#2E7D52] px-6 py-3 text-base font-semibold text-white">
            {tel}
          </a>
        </main>
      </div>
    )
  }

  const name =
    String((lead as { kontakt_name?: string | null }).kontakt_name ?? '').trim() ||
    String((lead as { kunden?: { name?: string } | null }).kunden?.name ?? 'Guten Tag')
  const st = String((lead as { status?: string }).status ?? 'neu')

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <header className="bg-[#1A3D2B] px-6 py-4 text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-8 w-auto object-contain brightness-0 invert" />
          ) : (
            <span className="text-lg font-semibold">Bärenwald</span>
          )}
          <span className="text-sm opacity-90">Ihr Projekt</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-xl font-semibold text-[#1A3D2B]">Hallo {name}</h1>
        <p className="mt-4 text-sm leading-relaxed text-[#374151]">
          Vielen Dank für Ihre Anfrage. Aktueller Stand: <strong>{st}</strong>. Wir melden uns bei Ihnen.
        </p>
        <a
          href={`tel:${tel.replace(/\s/g, '')}`}
          className="mt-8 flex min-h-[52px] items-center justify-center rounded-xl bg-[#2E7D52] text-base font-semibold text-white"
        >
          📞 {tel}
        </a>
      </main>
      <footer className="mt-auto border-t border-[#E2E8E2] bg-[#F7F6F3] px-4 py-6 text-center text-xs text-[#6B7280]">
        Bärenwald Handwerksgruppe München
      </footer>
    </div>
  )
}
