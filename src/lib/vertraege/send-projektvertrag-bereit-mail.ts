import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailHandwerkerErgaenzungBereit, mailHandwerkerProjektvertragBereit } from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { buildPartnerLoginForAngebotUrl, buildPartnerLoginLink } from '@/lib/portal-utils'

/**
 * Benachrichtigt den Handwerker: Projektvertrag + Checkliste im Portal bestätigen.
 */
export async function sendProjektvertragBereitMail(input: {
  auftragId: string
  handwerkerId: string
  vertragId: string
}): Promise<{ ok: true; gesendet: boolean; hinweis?: string } | { ok: false; message: string }> {
  const auftragId = input.auftragId.trim()
  const handwerkerId = input.handwerkerId.trim()
  const vertragId = input.vertragId.trim()
  if (!auftragId || !handwerkerId || !vertragId) {
    return { ok: false, message: 'auftragId, handwerkerId oder vertragId fehlt' }
  }

  const [{ data: hw }, { data: auftrag }, { data: vertrag }] = await Promise.all([
    supabaseAdmin
      .from('handwerker')
      .select('id, name, email, aktiv')
      .eq('id', handwerkerId)
      .maybeSingle(),
    supabaseAdmin.from('auftraege').select('id, titel, angebot_id').eq('id', auftragId).maybeSingle(),
    supabaseAdmin
      .from('handwerker_vertraege')
      .select('id, vertrags_nr, gewerk_name, pdf_url')
      .eq('id', vertragId)
      .maybeSingle(),
  ])

  if (!hw) return { ok: false, message: 'Handwerker nicht gefunden' }
  if (hw.aktiv === false) return { ok: true, gesendet: false, hinweis: 'Handwerker inaktiv' }
  if (!auftrag) return { ok: false, message: 'Auftrag nicht gefunden' }
  if (!vertrag?.pdf_url?.trim()) {
    return { ok: true, gesendet: false, hinweis: 'Kein Vertrags-PDF — Mail übersprungen' }
  }

  const email = (hw.email as string | null)?.trim() || ''
  if (!email) {
    return { ok: true, gesendet: false, hinweis: 'Keine E-Mail beim Handwerker hinterlegt' }
  }

  let anfrageId: string | null = null
  const angebotId = (auftrag as { angebot_id?: string | null }).angebot_id
  if (angebotId) {
    const { data: zu } = await supabaseAdmin
      .from('angebot_handwerker')
      .select('id')
      .eq('angebot_id', angebotId)
      .eq('handwerker_id', handwerkerId)
      .maybeSingle()
    anfrageId = (zu?.id as string | undefined) ?? null
  }

  const portalLink = anfrageId
    ? buildPartnerLoginForAngebotUrl(anfrageId)
    : buildPartnerLoginLink()

  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailHandwerkerProjektvertragBereit(
    {
      name: (hw.name as string)?.trim() || 'Partner',
      auftragTitel: (auftrag.titel as string | null) ?? 'Auftrag',
      gewerkName: (vertrag.gewerk_name as string | null) ?? '',
      vertragsNr: (vertrag.vertrags_nr as string | null) ?? '',
      portalLink,
    },
    branding
  )

  const mailRes = await sendMail({
    typ: 'handwerker_projektvertrag_bereit',
    an: email,
    anName: (hw.name as string | null) ?? undefined,
    betreff: tpl.betreff,
    html: tpl.html,
    auftragId,
    angebotId: angebotId ?? undefined,
  })

  if (!mailRes.success) {
    return { ok: false, message: mailRes.error ?? 'E-Mail-Versand fehlgeschlagen' }
  }

  return { ok: true, gesendet: true }
}

/** Benachrichtigt den Handwerker: Ergänzungsvereinbarung im Portal bestätigen. */
export async function sendErgaenzungBereitMail(input: {
  auftragId: string
  handwerkerId: string
  vertragId: string
}): Promise<{ ok: true; gesendet: boolean; hinweis?: string } | { ok: false; message: string }> {
  const auftragId = input.auftragId.trim()
  const handwerkerId = input.handwerkerId.trim()
  const vertragId = input.vertragId.trim()
  if (!auftragId || !handwerkerId || !vertragId) {
    return { ok: false, message: 'auftragId, handwerkerId oder vertragId fehlt' }
  }

  const [{ data: hw }, { data: auftrag }, { data: vertrag }] = await Promise.all([
    supabaseAdmin
      .from('handwerker')
      .select('id, name, email, aktiv')
      .eq('id', handwerkerId)
      .maybeSingle(),
    supabaseAdmin.from('auftraege').select('id, titel, angebot_id').eq('id', auftragId).maybeSingle(),
    supabaseAdmin
      .from('handwerker_vertraege')
      .select('id, gewerk_name, pdf_url, bezug_vertrag_vom')
      .eq('id', vertragId)
      .maybeSingle(),
  ])

  if (!hw) return { ok: false, message: 'Handwerker nicht gefunden' }
  if (hw.aktiv === false) return { ok: true, gesendet: false, hinweis: 'Handwerker inaktiv' }
  if (!auftrag) return { ok: false, message: 'Auftrag nicht gefunden' }
  if (!vertrag?.pdf_url?.trim()) {
    return { ok: true, gesendet: false, hinweis: 'Kein Vertrags-PDF — Mail übersprungen' }
  }

  const email = (hw.email as string | null)?.trim() || ''
  if (!email) {
    return { ok: true, gesendet: false, hinweis: 'Keine E-Mail beim Handwerker hinterlegt' }
  }

  let anfrageId: string | null = null
  const angebotId = (auftrag as { angebot_id?: string | null }).angebot_id
  if (angebotId) {
    const { data: zu } = await supabaseAdmin
      .from('angebot_handwerker')
      .select('id')
      .eq('angebot_id', angebotId)
      .eq('handwerker_id', handwerkerId)
      .maybeSingle()
    anfrageId = (zu?.id as string | undefined) ?? null
  }

  const portalLink = anfrageId
    ? buildPartnerLoginForAngebotUrl(anfrageId)
    : buildPartnerLoginLink()

  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailHandwerkerErgaenzungBereit(
    {
      name: (hw.name as string)?.trim() || 'Partner',
      auftragTitel: (auftrag.titel as string | null) ?? 'Auftrag',
      gewerkName: (vertrag.gewerk_name as string | null) ?? '',
      bezugVertragVom: (vertrag.bezug_vertrag_vom as string | null) ?? null,
      portalLink,
    },
    branding
  )

  const mailRes = await sendMail({
    typ: 'handwerker_ergaenzung_bereit',
    an: email,
    anName: (hw.name as string | null) ?? undefined,
    betreff: tpl.betreff,
    html: tpl.html,
    auftragId,
    angebotId: angebotId ?? undefined,
  })

  if (!mailRes.success) {
    return { ok: false, message: mailRes.error ?? 'E-Mail-Versand fehlgeschlagen' }
  }

  return { ok: true, gesendet: true }
}
