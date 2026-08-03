import 'server-only'

import { getMailBranding } from '@/lib/get-mail-branding'
import { mailHandwerkerBautagebuchAnfrage } from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import {
  notifyPartnerUnified,
  partnerVorgangLink,
} from '@/lib/partner/notify-partner-unified'
import { buildPartnerVorgangPortalUrl } from '@/lib/portal-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function sendHandwerkerBautagebuchAnfrage(input: {
  auftragId: string
  handwerkerId: string
  notiz?: string | null
  positionIds?: string[] | null
  angefordertVonUserId?: string | null
}): Promise<
  { ok: true; anfrageId: string; emailLogId?: string | null } | { ok: false; message: string }
> {
  const auftragId = input.auftragId.trim()
  const handwerkerId = input.handwerkerId.trim()
  if (!auftragId || !handwerkerId) {
    return { ok: false, message: 'Auftrag oder Handwerker fehlt.' }
  }

  const positionIds = Array.from(
    new Set((input.positionIds ?? []).map((id) => id.trim()).filter(Boolean))
  )

  const [{ data: hw, error: hwErr }, { data: auftrag, error: aErr }] = await Promise.all([
    supabaseAdmin
      .from('handwerker')
      .select('id, name, email, aktiv')
      .eq('id', handwerkerId)
      .maybeSingle(),
    supabaseAdmin.from('auftraege').select('id, titel').eq('id', auftragId).maybeSingle(),
  ])

  if (hwErr || !hw) return { ok: false, message: hwErr?.message ?? 'Handwerker nicht gefunden.' }
  if (hw.aktiv === false) return { ok: false, message: 'Handwerker ist nicht aktiv.' }
  if (aErr || !auftrag) return { ok: false, message: aErr?.message ?? 'Auftrag nicht gefunden.' }

  const hwEmail = (hw.email as string | null)?.trim() || ''
  if (!hwEmail) {
    return { ok: false, message: 'Handwerker hat keine E-Mail-Adresse.' }
  }

  const notiz = input.notiz?.trim() || null

  const insertPayload: Record<string, unknown> = {
    auftrag_id: auftragId,
    handwerker_id: handwerkerId,
    notiz,
    angefordert_von: input.angefordertVonUserId ?? null,
  }
  if (positionIds.length) insertPayload.position_ids = positionIds

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('partner_bautagebuch_anfragen')
    .insert(insertPayload)
    .select('id')
    .single()

  if (insErr) {
    if (/partner_bautagebuch_anfragen_offen_uq/i.test(insErr.message)) {
      return {
        ok: false,
        message: 'Für diesen Partner liegt bereits eine offene Tagebuch-Anforderung vor.',
      }
    }
    if (/position_ids/i.test(insErr.message)) {
      const retry = await supabaseAdmin
        .from('partner_bautagebuch_anfragen')
        .insert({
          auftrag_id: auftragId,
          handwerker_id: handwerkerId,
          notiz,
          angefordert_von: input.angefordertVonUserId ?? null,
        })
        .select('id')
        .single()
      if (retry.error) {
        return { ok: false, message: retry.error.message }
      }
      return finishSend({
        anfrageId: String(retry.data.id),
        auftragId,
        handwerkerId,
        hwName: (hw.name as string)?.trim() || 'Partner',
        hwEmail,
        auftragTitel: (auftrag.titel as string)?.trim() || 'Auftrag',
        notiz,
        positionIds,
      })
    }
    return { ok: false, message: insErr.message }
  }

  return finishSend({
    anfrageId: String(inserted.id),
    auftragId,
    handwerkerId,
    hwName: (hw.name as string)?.trim() || 'Partner',
    hwEmail,
    auftragTitel: (auftrag.titel as string)?.trim() || 'Auftrag',
    notiz,
    positionIds,
  })
}

async function finishSend(opts: {
  anfrageId: string
  auftragId: string
  handwerkerId: string
  hwName: string
  hwEmail: string
  auftragTitel: string
  notiz: string | null
  positionIds: string[]
}): Promise<{ ok: true; anfrageId: string; emailLogId?: string | null } | { ok: false; message: string }> {
  const relativeLink = `${partnerVorgangLink(opts.auftragId)}&focus=bautagebuch&anfrage=${encodeURIComponent(opts.anfrageId)}`
  const portalLink = `${buildPartnerVorgangPortalUrl(opts.auftragId)}&focus=bautagebuch&anfrage=${encodeURIComponent(opts.anfrageId)}`

  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailHandwerkerBautagebuchAnfrage(
    {
      name: opts.hwName,
      auftragTitel: opts.auftragTitel,
      portalLink,
      notiz: opts.notiz,
    },
    branding
  )

  const mailRes = await sendMail({
    typ: 'handwerker_bautagebuch_anfrage',
    an: [opts.hwEmail],
    cc: [],
    bcc: [],
    betreff: tpl.betreff,
    html: tpl.html,
    auftragId: opts.auftragId,
  })

  if (!mailRes.success) {
    return { ok: false, message: mailRes.error ?? 'E-Mail-Versand fehlgeschlagen.' }
  }

  // Portal-Glocke: nur Bautagebuch-Aufforderung — kein neu/geaendert (keine Auftragsänderung).
  // Spezial-Mail kommt oben aus dem CRM → Portal ohne zweite „bitte bestätigen“-Mail.
  await notifyPartnerUnified({
    handwerkerId: opts.handwerkerId,
    typ: 'bautagebuch',
    projektName: opts.auftragTitel,
    link: relativeLink,
    auftragId: opts.auftragId,
    leistungName: 'Bitte Update geben — Bautagebuch',
    sendMail: false,
  })

  return { ok: true, anfrageId: opts.anfrageId, emailLogId: mailRes.emailLogId ?? null }
}
