import { NextResponse } from 'next/server'

import { isDevAuthSkipEnabled } from '@/lib/dev-auth'
import {
  disponiereHavarieNotmassnahme,
  schlageKostentraegerVor,
} from '@/lib/org/hv-lead-actions'
import { replaceAuftragHandwerkerUndSenden } from '@/app/(dashboard)/auftraege/handwerker-actions'
import { erzeugeVersicherungsaktePdf } from '@/lib/org/hv-auftrag-actions'
import { genehmigeOrgNachtrag } from '@/lib/org/nachtrag-org-freigabe-actions'

export const runtime = 'nodejs'

type Body = {
  action?: string
  leadId?: string
  auftragId?: string
  alteZuweisungId?: string
  nachtragId?: string
  kostentraeger?: string
  handwerkerId?: string
}

/** E2E/Dev: CRM-HV-Aktionen ohne UI — nur mit isDevAuthSkipEnabled() (nie in Production). */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!isDevAuthSkipEnabled()) {
    return NextResponse.json({ error: 'Nicht verfügbar.' }, { status: 403 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const action = String(body.action ?? '').trim()

  switch (action) {
    case 'notmassnahme': {
      if (!body.leadId) return NextResponse.json({ error: 'leadId fehlt.' }, { status: 400 })
      const r = await disponiereHavarieNotmassnahme(body.leadId, body.handwerkerId)
      return NextResponse.json(r, { status: r.ok ? 200 : 400 })
    }
    case 'kostentraeger_vorschlag': {
      if (!body.leadId || !body.kostentraeger) {
        return NextResponse.json({ error: 'leadId/kostentraeger fehlt.' }, { status: 400 })
      }
      const r = await schlageKostentraegerVor(body.leadId, body.kostentraeger)
      return NextResponse.json(r, { status: r.ok ? 200 : 400 })
    }
    case 'nachtrag_genehmigen': {
      if (!body.nachtragId || !body.auftragId) {
        return NextResponse.json({ error: 'nachtragId/auftragId fehlt.' }, { status: 400 })
      }
      const r = await genehmigeOrgNachtrag(body.nachtragId, body.auftragId)
      return NextResponse.json(r, { status: r.ok ? 200 : 400 })
    }
    case 'versicherungsakte': {
      if (!body.auftragId) return NextResponse.json({ error: 'auftragId fehlt.' }, { status: 400 })
      const r = await erzeugeVersicherungsaktePdf(body.auftragId)
      return NextResponse.json(r, { status: r.ok ? 200 : 400 })
    }
    case 'redisponieren': {
      if (!body.auftragId || !body.alteZuweisungId || !body.handwerkerId) {
        return NextResponse.json(
          { error: 'auftragId, alteZuweisungId und handwerkerId fehlen.' },
          { status: 400 }
        )
      }
      const r = await replaceAuftragHandwerkerUndSenden({
        auftragId: body.auftragId,
        alteZuweisungId: body.alteZuweisungId,
        neuerHandwerkerId: body.handwerkerId,
      })
      return NextResponse.json(r, { status: r.ok ? 200 : 400 })
    }
    default:
      return NextResponse.json({ error: `Unbekannte Aktion: ${action}` }, { status: 400 })
  }
}
