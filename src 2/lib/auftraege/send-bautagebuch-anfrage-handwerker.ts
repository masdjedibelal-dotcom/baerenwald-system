import 'server-only'

import { getMailBranding } from '@/lib/get-mail-branding'
import { mailHandwerkerBautagebuchAnfrage } from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { buildPartnerAuftragPortalUrl } from '@/lib/portal-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function sendHandwerkerBautagebuchAnfrage(input: {
  auftragId: string
  handwerkerId: string
  notiz?: string | null
  angefordertVonUserId?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const auftragId = input.auftragId.trim()
  const handwerkerId = input.handwerkerId.trim()
  if (!auftragId || !handwerkerId) {
    return { ok: false, message: 'Auftrag oder Handwerker fehlt.' }
  }

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

  const { error: insErr } = await supabaseAdmin.from('partner_bautagebuch_anfragen').insert({
    auftrag_id: auftragId,
    handwerker_id: handwerkerId,
    notiz,
    angefordert_von: input.angefordertVonUserId ?? null,
  })

  if (insErr) {
    if (/partner_bautagebuch_anfragen_offen_uq/i.test(insErr.message)) {
      return { ok: false, message: 'Für diesen Partner liegt bereits eine offene Tagebuch-Anforderung vor.' }
    }
    return { ok: false, message: insErr.message }
  }

  const branding = await getMailBranding(supabaseAdmin)
  const portalLink = buildPartnerAuftragPortalUrl(auftragId)
  const tpl = mailHandwerkerBautagebuchAnfrage(
    {
      name: (hw.name as string)?.trim() || 'Partner',
      auftragTitel: (auftrag.titel as string)?.trim() || 'Auftrag',
      portalLink,
      notiz,
    },
    branding
  )

  const mailRes = await sendMail({
    typ: 'handwerker_bautagebuch_anfrage',
    an: [hwEmail],
    cc: [],
    bcc: [],
    betreff: tpl.betreff,
    html: tpl.html,
    auftragId,
  })

  if (!mailRes.success) {
    return { ok: false, message: mailRes.error ?? 'E-Mail-Versand fehlgeschlagen.' }
  }

  return { ok: true }
}
