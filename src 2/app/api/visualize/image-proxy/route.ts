import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** Lädt externe Bilder serverseitig — für Canvas-Zielbild ohne CORS-Probleme. */
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url')?.trim()
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'Ungültige URL.' }, { status: 400 })
  }

  try {
    const host = new URL(url).hostname
    const allowed =
      host.includes('supabase.co') ||
      host.includes('replicate.delivery') ||
      host.includes('replicate.com') ||
      host.includes('baerenwaldmuenchen.de')
    if (!allowed) {
      return NextResponse.json({ error: 'Host nicht erlaubt.' }, { status: 403 })
    }

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ error: 'Bild nicht erreichbar.' }, { status: 502 })
    }

    const buf = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Proxy fehlgeschlagen.' }, { status: 502 })
  }
}
