import { NextResponse } from 'next/server'

import { createAuftragFromAngebot } from '@/app/(dashboard)/angebote/actions'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Eine Funktion „Auftrag erteilen“ für CRM und Portal (Umbau P06).
 * Das Portal ruft hier auf, statt einen eigenen, unvollständigen Auftrag anzulegen:
 * Positionen, Partner-Zuweisung, Zahlungsplan, Verträge, Mails, Meilensteine wie im CRM.
 * Schutz: dasselbe Server-Geheimnis wie der PDF-Dienst (PDF_SERVICE_SECRET).
 */
function authorize(req: Request): boolean {
  const secret = process.env.PDF_SERVICE_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get('authorization')?.trim() ?? ''
  return auth === `Bearer ${secret}`
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, message: 'Nicht erlaubt.' }, { status: 401 })
  }
  let angebotId = ''
  try {
    const body = (await req.json()) as { angebotId?: unknown }
    angebotId = String(body.angebotId ?? '').trim()
  } catch {
    /* leerer Body → unten abgelehnt */
  }
  if (!angebotId) {
    return NextResponse.json({ ok: false, message: 'Angebot fehlt.' }, { status: 400 })
  }

  try {
    const res = await createAuftragFromAngebot(angebotId)
    return NextResponse.json(res, { status: res.ok ? 200 : 422 })
  } catch (e) {
    console.error('[api/auftraege/aus-angebot]', e)
    return NextResponse.json(
      { ok: false, message: 'Auftrag konnte nicht angelegt werden.' },
      { status: 500 }
    )
  }
}
