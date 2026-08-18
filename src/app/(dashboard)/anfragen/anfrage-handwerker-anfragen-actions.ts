'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendHandwerkerAnfrageFuerZuweisung } from '@/lib/angebote/send-handwerker-anfrage'
import { loadAngebotDetailAdmin } from '@/app/(dashboard)/angebote/actions'
import { leadVertragsKundeId } from '@/lib/lead-display-helpers'
import {
  partnerLvVorgabeToAngebotPositionen,
  type PartnerLvVorgabe,
} from '@/lib/angebote/partner-lv'
import { latestKundenAngebotIdFuerLead } from '@/lib/angebote/partner-einholung'
import type { AngebotHandwerkerRow } from '@/lib/types'

const AH_SELECT = `
  id, angebot_id, handwerker_id, gewerk_id, status, aufgabe_notiz, ohne_lv,
  hw_status, hw_eingereicht_at, hw_preis_netto, hw_preis_brutto,
  hw_angebot_pdf_url, hw_angebot_anhang_urls, hw_konditionen, gesendet_at,
  handwerker(id, name, firma, email, telefon, gewerke),
  gewerke(id, name, slug),
  angebote!inner(id, lead_id, leistungsumfang, projektbeschreibung, ist_partner_einholung, status, gesendet_kunde_at)
`

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] as T) ?? null : x
}

async function requireUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet', supabase }
  return { ok: true as const, supabase, user }
}

async function resolveGewerkId(
  handwerkerId: string,
  preferred?: string | null
): Promise<string | null> {
  if (preferred?.trim()) return preferred.trim()

  const { data: hw } = await supabaseAdmin
    .from('handwerker')
    .select('gewerke')
    .eq('id', handwerkerId)
    .maybeSingle()
  const slugs = Array.isArray(hw?.gewerke)
    ? (hw!.gewerke as string[]).map((s) => String(s).trim()).filter(Boolean)
    : []

  if (slugs.length) {
    const { data: bySlug } = await supabaseAdmin
      .from('gewerke')
      .select('id')
      .in('slug', slugs)
      .eq('aktiv', true)
      .limit(1)
      .maybeSingle()
    if (bySlug?.id) return String(bySlug.id)
  }

  const { data: fallback } = await supabaseAdmin
    .from('gewerke')
    .select('id')
    .eq('aktiv', true)
    .order('name')
    .limit(1)
    .maybeSingle()
  return fallback?.id ? String(fallback.id) : null
}

async function ensureInternAngebot(opts: {
  leadId: string
  kundeId: string | null
  titel: string
  beschreibung: string
  positionen: Record<string, unknown>[]
}): Promise<{ ok: true; angebotId: string } | { ok: false; message: string }> {
  const { data: existing } = await supabaseAdmin
    .from('angebote')
    .select('id')
    .eq('lead_id', opts.leadId)
    .eq('ist_partner_einholung', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    await supabaseAdmin
      .from('angebote')
      .update({
        leistungsumfang: opts.titel,
        projektbeschreibung: opts.beschreibung || null,
        ...(opts.positionen.length > 0 ? { positionen: opts.positionen } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return { ok: true, angebotId: String(existing.id) }
  }

  const { data: row, error } = await supabaseAdmin
    .from('angebote')
    .insert({
      lead_id: opts.leadId,
      kunde_id: opts.kundeId,
      status: 'entwurf',
      status_einfach: 'entwurf',
      ist_partner_einholung: true,
      positionen: opts.positionen,
      leistungsumfang: opts.titel,
      projektbeschreibung: opts.beschreibung || null,
      angebotsnr: null,
      pdf_url: null,
    })
    .select('id')
    .single()

  if (error || !row?.id) {
    return { ok: false, message: error?.message ?? 'Internes Angebot konnte nicht angelegt werden.' }
  }
  return { ok: true, angebotId: String(row.id) }
}

export async function anfrageHandwerkerAnfragen(input: {
  leadId: string
  handwerkerIds: string[]
  titel: string
  beschreibung: string
  notiz: string
  positionen?: PartnerLvVorgabe[]
}): Promise<{ ok: true; gesendet: number } | { ok: false; message: string }> {
  const auth = await requireUser()
  if (!auth.ok) return auth

  const leadId = input.leadId.trim()
  const titel = input.titel.trim()
  const beschreibung = input.beschreibung.trim()
  const notiz = input.notiz.trim()
  const hwIds = Array.from(new Set(input.handwerkerIds.map((id) => id.trim()).filter(Boolean)))

  if (!leadId) return { ok: false, message: 'Anfrage fehlt.' }
  if (!titel) return { ok: false, message: 'Titel fehlt.' }
  if (!hwIds.length) return { ok: false, message: 'Bitte mindestens einen Handwerker auswählen.' }

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select('id, kunde_id, auftraggeber_kunde_id, org_freigabe_status, hv_meldung_status')
    .eq('id', leadId)
    .maybeSingle()

  if (leadErr || !lead) return { ok: false, message: 'Anfrage nicht gefunden.' }

  const { data: gewerkRows } = await supabaseAdmin
    .from('gewerke')
    .select('id, name, slug')
    .eq('aktiv', true)
  const internPositionen = partnerLvVorgabeToAngebotPositionen(
    input.positionen ?? [],
    (gewerkRows ?? []) as Array<{ id: string; name: string; slug?: string }>
  )

  const intern = await ensureInternAngebot({
    leadId,
    kundeId: leadVertragsKundeId(lead),
    titel,
    beschreibung,
    positionen: internPositionen,
  })
  if (!intern.ok) return intern

  const attachAngebotId =
    (await latestKundenAngebotIdFuerLead(leadId)) ?? intern.angebotId

  const zuweisungIds: string[] = []

  for (const hwId of hwIds) {
    const gewerkId = await resolveGewerkId(hwId)
    if (!gewerkId) {
      return { ok: false, message: 'Kein Gewerk gefunden — bitte unter Einstellungen anlegen.' }
    }

    const { data: existingRows } = await supabaseAdmin
      .from('angebot_handwerker')
      .select('id, status, angebot_id, angebote!inner(lead_id)')
      .eq('handwerker_id', hwId)
      .eq('ohne_lv', true)
      .eq('angebote.lead_id', leadId)

    const existing = (existingRows ?? []).find((r) => {
      const st = String(r.status ?? '').toLowerCase()
      return st !== 'ersetzt' && st !== 'abgelehnt'
    })

    if (existing?.id) {
      await supabaseAdmin
        .from('angebot_handwerker')
        .update({
          aufgabe_notiz: notiz || null,
          ohne_lv: true,
          gewerk_id: gewerkId,
          angebot_id: attachAngebotId,
        })
        .eq('id', existing.id)
      zuweisungIds.push(String(existing.id))
      continue
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('angebot_handwerker')
      .insert({
        angebot_id: attachAngebotId,
        handwerker_id: hwId,
        gewerk_id: gewerkId,
        status: 'ausstehend',
        aufgabe_notiz: notiz || null,
        ohne_lv: true,
      })
      .select('id')
      .single()

    if (insErr || !inserted?.id) {
      return { ok: false, message: insErr?.message ?? 'Zuweisung konnte nicht angelegt werden.' }
    }
    zuweisungIds.push(String(inserted.id))
  }

  const detail = await loadAngebotDetailAdmin(attachAngebotId)
  if (!detail) return { ok: false, message: 'Angebot nicht gefunden.' }

  const byId = new Map((detail.angebot_handwerker ?? []).map((z) => [z.id, z]))
  let gesendet = 0

  for (const id of zuweisungIds) {
    const row = byId.get(id)
    if (!row) return { ok: false, message: 'Zuweisung nicht gefunden.' }
    const send = await sendHandwerkerAnfrageFuerZuweisung(
      detail,
      row as unknown as Record<string, unknown>,
      true
    )
    if (!send.ok) return { ok: false, message: send.message }
    gesendet++
  }

  revalidatePath(`/anfragen/${leadId}`)
  if (attachAngebotId !== intern.angebotId) {
    revalidatePath(`/angebote/${attachAngebotId}`)
  }
  return { ok: true, gesendet }
}

export type AnfragePartnerEinholungRow = AngebotHandwerkerRow & {
  leistungsumfang?: string | null
  projektbeschreibung?: string | null
  angebot_gesendet_kunde_at?: string | null
  /** Noch am internen Gehäuse — nach Kundenangebot-Speichern false (Karte wandert). */
  ist_intern_gehaeuse?: boolean
}

export async function listAnfragePartnerEinholungen(
  leadId: string
): Promise<{ ok: true; rows: AnfragePartnerEinholungRow[] } | { ok: false; message: string }> {
  const auth = await requireUser()
  if (!auth.ok) return { ok: false, message: auth.message, rows: [] } as never
  const id = leadId.trim()
  if (!id) return { ok: true, rows: [] }

  const { data, error } = await supabaseAdmin
    .from('angebot_handwerker')
    .select(AH_SELECT)
    .eq('ohne_lv', true)
    .eq('angebote.lead_id', id)
    .order('gesendet_at', { ascending: false })

  if (error) {
    if (/ohne_lv|ist_partner_einholung|column/i.test(error.message)) {
      return { ok: true, rows: [] }
    }
    return { ok: false, message: error.message }
  }

  const rows: AnfragePartnerEinholungRow[] = []
  for (const raw of data ?? []) {
    const rec = raw as Record<string, unknown>
    const ang = one(rec.angebote) as {
      leistungsumfang?: string | null
      projektbeschreibung?: string | null
      gesendet_kunde_at?: string | null
      ist_partner_einholung?: boolean | null
    } | null
    const { angebote: _drop, ...rest } = rec
    rows.push({
      ...(rest as unknown as AngebotHandwerkerRow),
      handwerker: one(rec.handwerker) as AngebotHandwerkerRow['handwerker'],
      gewerke: one(rec.gewerke) as AngebotHandwerkerRow['gewerke'],
      leistungsumfang: ang?.leistungsumfang ?? null,
      projektbeschreibung: ang?.projektbeschreibung ?? null,
      angebot_gesendet_kunde_at: ang?.gesendet_kunde_at ?? null,
      ist_intern_gehaeuse: ang?.ist_partner_einholung === true,
    })
  }

  return { ok: true, rows }
}
