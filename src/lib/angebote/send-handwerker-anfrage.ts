import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildHandwerkerMail } from '@/lib/angebote/angebot-mail-templates'
import { sendHandwerkerAngebotEmail } from '@/lib/angebote/emails'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotDetail } from '@/lib/types'
import { getPublicAppUrl } from '@/lib/utils'

async function logEmail(input: {
  typ: string
  angebot_id: string
  zuweisung_id?: string | null
  to_email: string
  subject: string
}) {
  const { error } = await supabaseAdmin.from('email_logs').insert({
    typ: input.typ,
    angebot_id: input.angebot_id,
    zuweisung_id: input.zuweisung_id ?? null,
    to_email: input.to_email,
    subject: input.subject,
    meta: {},
  })
  if (error) console.warn('email_logs:', error.message)
}

type ZuRow = {
  id: string
  gewerk_id: string
  token: string | null
  handwerker: { name: string; email: string | null } | null
  gewerke: { name: string } | null
}

function normalizeZuRow(zu: Record<string, unknown>): ZuRow {
  const hwRaw = zu.handwerker
  const hwOne = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw
  const gwRaw = zu.gewerke
  const gwOne = Array.isArray(gwRaw) ? gwRaw[0] : gwRaw
  return {
    id: String(zu.id),
    gewerk_id: String(zu.gewerk_id),
    token: (zu.token as string | null) ?? null,
    handwerker: hwOne as { name: string; email: string | null } | null,
    gewerke: gwOne as { name: string } | null,
  }
}

/** Mail/Link + Status „angefragt“ für eine bestehende angebot_handwerker-Zeile */
export async function sendHandwerkerAnfrageFuerZuweisung(
  detail: AngebotDetail,
  zuRaw: Record<string, unknown>,
  sendEmail: boolean
): Promise<
  { ok: true; link: string; gesendet: boolean } | { ok: false; message: string; link?: string }
> {
  const row = normalizeZuRow(zuRaw)
  const token = row.token?.trim()
  if (!token) {
    return { ok: false, message: 'Kein Token für diese Zuweisung (Migration ausführen?).' }
  }

  const link = `${getPublicAppUrl()}/handwerker/anfrage/${token}`
  const posAll = normalizeAngebotPositionen(detail.positionen)
  const posFiltered = posAll.filter((p) => p.gewerk_id === row.gewerk_id)
  const hwName = row.handwerker?.name ?? 'Handwerkerin'
  const hwEmail = row.handwerker?.email?.trim() || ''
  const gewerkName = row.gewerke?.name ?? 'Gewerk'
  const kunde = detail.kunden
  const plz = kunde?.plz?.trim() || detail.leads?.plz?.trim() || '—'
  const ort = kunde?.ort?.trim() || '—'
  const zeitraum = detail.leads?.zeitraum?.trim() || ''
  const firm = await fetchFirmenEinstellungen(supabaseAdmin)

  let gesendet = false
  if (sendEmail) {
    if (!hwEmail) {
      return { ok: false, message: 'Handwerker hat keine E-Mail-Adresse.', link }
    }
    const subject = `Neue Anfrage: ${gewerkName} — Bärenwald`
    const html = buildHandwerkerMail({
      handwerker_name: hwName,
      gewerk_name: gewerkName,
      positionen: posFiltered.length ? posFiltered : posAll,
      plz,
      ort,
      zeitraum,
      link,
      firm,
    })
    const mail = await sendHandwerkerAngebotEmail({ to: hwEmail, subject, html })
    if (!mail.ok) {
      return { ok: false, message: mail.message, link }
    }
    gesendet = true
    await logEmail({
      typ: 'angebot_handwerker',
      angebot_id: detail.id,
      zuweisung_id: row.id,
      to_email: hwEmail,
      subject,
    })
  }

  const now = new Date().toISOString()
  const { error: upHw } = await supabaseAdmin
    .from('angebot_handwerker')
    .update({
      status: 'angefragt',
      gesendet_at: now,
    })
    .eq('id', row.id)

  if (upHw) {
    return { ok: false, message: upHw.message, link }
  }

  return { ok: true, link, gesendet }
}
