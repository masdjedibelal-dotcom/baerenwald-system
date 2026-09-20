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
    <footer className="border-t border-bw-border bg-bw-bg-soft px-4 py-6 text-center text-xs text-muted">
      <nav className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
        <a
          href={ds}
          className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 underline hover:text-bw-dark"
        >
          Datenschutz
        </a>
        <span aria-hidden className="text-muted/60">
          ·
        </span>
        <a
          href={im}
          className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 underline hover:text-bw-dark"
        >
          Impressum
        </a>
      </nav>
    </footer>
  )
}

export function TokenLinkInvalid() {
  return (
    <div className="flex min-h-screen flex-col bg-bw-bg-soft text-bw-dark">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-bw-green-bg text-xl font-bold text-bw-text-mid"
          aria-hidden
        >
          !
        </div>
        <h1 className="text-xl font-semibold">{TOKEN_LINK_INVALID_TITLE}</h1>
        <p className="mt-3 text-sm leading-relaxed text-bw-text-mid">
          {TOKEN_LINK_INVALID_BODY}
        </p>
      </main>
      <PublicTokenLegalFooter />
    </div>
  )
}
