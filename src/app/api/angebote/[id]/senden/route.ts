import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendAngebotToKunde } from '@/app/(dashboard)/angebote/actions'
import { sendHandwerkerAnfrageFuerZuweisung } from '@/lib/angebote/send-handwerker-anfrage'
import {
  darfAngebotAnKundeSenden,
  handwerkerSendenBlockierHinweis,
} from '@/lib/angebote/angebot-handwerker-flow'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotDetail, AngebotPosition, AngebotStatus } from '@/lib/types'

function parsePositionen(raw: unknown): AngebotPosition[] {
  return normalizeAngebotPositionen(raw)
}

async function loadDetail(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<AngebotDetail | null> {
  const { data, error } = await supabase
    .from('angebote')
    .select(
      `
      *,
      kunden(*),
      leads(*),
      angebot_handwerker(
        *,
        handwerker(id, name, email, telefon, gewerke, aktiv),
        gewerke(id, name, slug)
      )
    `
    )
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  const row = data as AngebotDetail
  return {
    ...row,
    positionen: parsePositionen(row.positionen),
  }
}

type BodyKunde = { typ: 'kunde'; subject?: string }
type BodyHandwerker = {
  typ: 'handwerker'
  zuweisung_id: string
  send_email: boolean
  betreff?: string
  to?: string[]
  cc?: string[]
  preview_only?: boolean
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let body: BodyKunde | BodyHandwerker
  try {
    body = (await req.json()) as BodyKunde | BodyHandwerker
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const angebotId = params.id
  const detail = await loadDetail(supabase, angebotId)
  if (!detail) {
    return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
  }

  if (body.typ === 'kunde') {
    if (!darfAngebotAnKundeSenden(detail.angebot_handwerker, detail.status)) {
      return NextResponse.json(
        { error: handwerkerSendenBlockierHinweis(
          detail.angebot_handwerker,
          (detail.leads as { org_freigabe_status?: string } | null | undefined)
            ?.org_freigabe_status as import('@/lib/types').OrgFreigabeStatus | undefined
        ) },
        { status: 400 }
      )
    }
    const allowed: AngebotStatus[] = ['entwurf', 'handwerker_akzeptiert']
    if (!allowed.includes(detail.status)) {
      return NextResponse.json(
        { error: 'Versand an Kundin nur bei Entwurf oder nach Handwerker-Freigabe möglich.' },
        { status: 400 }
      )
    }
    if (!detail.kunden?.email?.trim()) {
      return NextResponse.json({ error: 'Kunden-E-Mail fehlt' }, { status: 400 })
    }

    const r = await sendAngebotToKunde(angebotId)
    if (!r.ok) {
      return NextResponse.json({ error: r.message }, { status: 502 })
    }

    revalidatePath(`/angebote/${angebotId}`)
    revalidatePath('/angebote')
    return NextResponse.json({ ok: true })
  }

  if (body.typ === 'handwerker') {
    const zuweisungId = body.zuweisung_id?.trim()
    if (!zuweisungId) {
      return NextResponse.json({ error: 'zuweisung_id fehlt' }, { status: 400 })
    }

    const { data: zu, error: zErr } = await supabase
      .from('angebot_handwerker')
      .select(
        `
        id,
        angebot_id,
        gewerk_id,
        token,
        status,
        aufgabe_notiz,
        handwerker(id, name, email, telefon),
        gewerke(name)
      `
      )
      .eq('id', zuweisungId)
      .eq('angebot_id', angebotId)
      .maybeSingle()

    if (zErr || !zu) {
      return NextResponse.json({ error: 'Zuweisung nicht gefunden' }, { status: 404 })
    }

    const sent = await sendHandwerkerAnfrageFuerZuweisung(
      detail,
      zu as Record<string, unknown>,
      body.send_email,
      {
        betreff: body.betreff,
        to: body.to,
        cc: body.cc,
        previewOnly: body.preview_only,
      }
    )
    if (!sent.ok) {
      const status =
        sent.message.includes('E-Mail') || sent.message.includes('RESEND')
          ? 502
          : sent.message.includes('Handwerker hat keine')
            ? 400
            : 500
      return NextResponse.json(
        { error: sent.message, link: 'link' in sent ? sent.link : undefined },
        { status }
      )
    }

    if (body.preview_only) {
      return NextResponse.json({
        link: sent.link,
        gesendet: false,
        html: sent.html,
        betreff: sent.betreff,
        defaultTo: sent.defaultTo,
        defaultCc: sent.defaultCc,
      })
    }

    revalidatePath(`/angebote/${angebotId}`)
    revalidatePath('/angebote')
    return NextResponse.json({ link: sent.link, gesendet: sent.gesendet })
  }

  return NextResponse.json({ error: 'Unbekannter typ' }, { status: 400 })
}
