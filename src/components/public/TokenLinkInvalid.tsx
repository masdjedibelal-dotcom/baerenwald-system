/**
 * Einheitliche neutrale Fehlerseite für öffentliche Token-Routen
 * (Status, HW-Anfrage, Projekt, Nachtrag, Formular).
 * Immer HTTP 200 + gleicher Text — keine Enumeration / kein Marketing-404.
 */

export const TOKEN_LINK_INVALID_TITLE = 'Link nicht verfügbar'
export const TOKEN_LINK_INVALID_BODY =
  'Dieser Link ist ungültig oder nicht mehr aktiv.'

function websiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'https://baerenwald-muenchen.de'
  )
}

export function PublicTokenLegalFooter({
  datenschutzHref,
  impressumHref,
}: {
  datenschutzHref?: string
  impressumHref?: string
} = {}) {
  const base = websiteOrigin()
  const ds = datenschutzHref || `${base}/datenschutz`
  const im = impressumHref || `${base}/impressum`
  return (
    <footer className="border-t border-[#E2E8E2] bg-[#F7F6F3] px-4 py-6 text-center text-xs text-[#6B7280]">
      <a href={ds} className="underline hover:text-[#16201B]">
        Datenschutz
      </a>
      {' · '}
      <a href={im} className="underline hover:text-[#16201B]">
        Impressum
      </a>
    </footer>
  )
}

export function TokenLinkInvalid() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F3] text-[#16201B]">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8EEE9] text-xl font-bold text-[#4a5c54]"
          aria-hidden
        >
          !
        </div>
        <h1 className="text-xl font-semibold">{TOKEN_LINK_INVALID_TITLE}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#4a5c54]">
          {TOKEN_LINK_INVALID_BODY}
        </p>
      </main>
      <PublicTokenLegalFooter />
    </div>
  )
}
