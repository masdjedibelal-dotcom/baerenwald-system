import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/mail-branding'
import { mailHandwerkerAnfrage } from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotDetail } from '@/lib/types'
import { getPublicAppUrl } from '@/lib/utils'

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
  const zeitraum = detail.leads?.zeitraum?.trim() || ''

  let gesendet = false
  if (sendEmail) {
    if (!hwEmail) {
      return { ok: false, message: 'Handwerker hat keine E-Mail-Adresse.', link }
    }
    const branding = await getMailBranding(supabaseAdmin)
    const tpl = mailHandwerkerAnfrage(
      {
        name: hwName,
        gewerk: gewerkName,
        plz,
        zeitraum: zeitraum || undefined,
        positionen: (posFiltered.length ? posFiltered : posAll).map((p) => ({
          beschreibung: p.beschreibung || p.leistung,
        })),
        link,
      },
      branding
    )
    const mail = await sendMail({
      typ: 'handwerker_anfrage',
      an: hwEmail,
      anName: hwName,
      betreff: tpl.betreff,
      html: tpl.html,
      kundeId: detail.kunde_id,
      leadId: detail.lead_id,
      angebotId: detail.id,
    })
    if (!mail.success) {
      return { ok: false, message: mail.error ?? 'Versand fehlgeschlagen', link }
    }
    gesendet = true
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
