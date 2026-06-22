import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  exchangeGscOAuthCode,
  GSC_OAUTH_STATE_COOKIE,
  saveGscOAuthRefreshToken,
} from '@/lib/ki-hub/sources/gsc-auth'

export const dynamic = 'force-dynamic'

function callbackHtml(title: string, body: string, ok: boolean): string {
  const color = ok ? '#166534' : '#991b1b'
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; color: #111; }
    h1 { font-size: 1.25rem; color: ${color}; }
    p { line-height: 1.5; font-size: 0.95rem; }
    a { color: #2563eb; }
    code { background: #f3f4f6; padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const error = url.searchParams.get('error')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = cookies().get(GSC_OAUTH_STATE_COOKIE)?.value

  cookies().set(GSC_OAUTH_STATE_COOKIE, '', { maxAge: 0, path: '/' })

  if (error) {
    const safeError = error.replace(/[<>&"']/g, (c) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c] ?? c
    )
    return new NextResponse(
      callbackHtml(
        'Google-Verbindung abgebrochen',
        `<p>Google meldet: <strong>${safeError}</strong></p><p><a href="/ki-hub">Zurück zum KI Hub</a></p>`,
        false
      ),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    return new NextResponse(
      callbackHtml(
        'Ungültige OAuth-Antwort',
        '<p>Bitte die Verbindung erneut starten (eingeloggt im CRM bleiben).</p><p><a href="/api/ki-hub/gsc/oauth/start">Erneut verbinden</a></p>',
        false
      ),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  try {
    const tokens = await exchangeGscOAuthCode(code)
    if (!tokens.refresh_token) {
      return new NextResponse(
        callbackHtml(
          'Kein Refresh-Token erhalten',
          '<p>Google hat keinen Refresh-Token geliefert. In Google Cloud den OAuth-Client prüfen und die Verbindung erneut mit <code>prompt=consent</code> starten.</p><p><a href="/api/ki-hub/gsc/oauth/start">Erneut verbinden</a></p>',
          false
        ),
        { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    await saveGscOAuthRefreshToken(tokens.refresh_token)

    return new NextResponse(
      callbackHtml(
        'Search Console verbunden',
        '<p>Das Google-Konto ist jetzt mit dem KI Hub verknüpft. GSC-Daten erscheinen nach dem nächsten Laden im Marketing-Bereich.</p><p><a href="/ki-hub">Zum KI Hub</a></p>',
        true
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler'
    return new NextResponse(
      callbackHtml(
        'Verbindung fehlgeschlagen',
        `<p>${msg}</p><p><a href="/api/ki-hub/gsc/oauth/start">Erneut versuchen</a></p>`,
        false
      ),
      { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}
