import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailHandwerkerAnfrage } from '@/lib/mail-templates'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotDetail } from '@/lib/types'
import { buildPartnerLoginLink } from '@/lib/portal-utils'
import { orgFreigabeBlockiertPartner } from '@/lib/org/org-portal-helpers'
import { notifyPartnerHandwerkerAnfrage } from '@/lib/partner/notify-partner-anfrage'

type ZuRow = {
  id: string
  gewerk_id: string
  aufgabe_notiz?: string | null
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
    aufgabe_notiz: (zu as { aufgabe_notiz?: string | null }).aufgabe_notiz ?? null,
    handwerker: hwOne as { name: string; email: string | null } | null,
    gewerke: gwOne as { name: string } | null,
  }
}

/**
 * Status „angefragt“ + optional Partner-Mail (Website-API, nicht CRM-Resend).
 * Link für WhatsApp: Partner-Portal-Start (`/partner`).
 */
export async function sendHandwerkerAnfrageFuerZuweisung(
  detail: AngebotDetail,
  zuRaw: Record<string, unknown>,
  sendEmail: boolean,
  options?: {
    to?: string[]
    cc?: string[]
    betreff?: string
    previewOnly?: boolean
  }
): Promise<
  | {
      ok: true
      link: string
      gesendet: boolean
      html?: string
      betreff?: string
      defaultTo?: string[]
      defaultCc?: string[]
    }
  | { ok: false; message: string; link?: string }
> {
  const row = normalizeZuRow(zuRaw)
  const link = buildPartnerLoginLink()

  const lead = detail.leads
  const orgStatus = (lead as { org_freigabe_status?: string } | null | undefined)?.org_freigabe_status
  const hvStatus = (lead as { hv_meldung_status?: string } | null | undefined)?.hv_meldung_status
  if (orgFreigabeBlockiertPartner(orgStatus as never, hvStatus)) {
    const msg =
      orgStatus === 'abgelehnt'
        ? 'Organisation hat die Freigabe abgelehnt — Partner-Anfrage ist blockiert.'
        : 'Wartet auf Org-Freigabe — Partner-Anfrage kann erst nach Freigabe gesendet werden.'
    return { ok: false, message: msg, link }
  }

  const posAll = normalizeAngebotPositionen(detail.positionen)
  const posFiltered = posAll.filter((p) => p.gewerk_id === row.gewerk_id)
  const hwName = row.handwerker?.name ?? 'Handwerkerin'
  const hwEmail = row.handwerker?.email?.trim() || ''
  const gewerkName = row.gewerke?.name ?? 'Gewerk'
  const kunde = detail.kunden
  const plz = kunde?.plz?.trim() || detail.leads?.plz?.trim() || '—'
  const zeitraum = detail.leads?.zeitraum?.trim() || ''

  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailHandwerkerAnfrage(
    {
      name: hwName,
      gewerk: gewerkName,
      plz,
      zeitraum: zeitraum || undefined,
      positionen: (posFiltered.length ? posFiltered : posAll).map((p) => ({
        leistung: p.leistung,
        beschreibung: p.beschreibung || p.leistung,
        menge: p.menge || 1,
        einheit: p.einheit,
      })),
      link,
      notiz: row.aufgabe_notiz?.trim() || undefined,
    },
    branding
  )
  const defaultTo = hwEmail ? [hwEmail] : []
  const defaultCc: string[] = []

  if (options?.previewOnly) {
    return {
      ok: true,
      link,
      gesendet: false,
      html: tpl.html,
      betreff: options.betreff?.trim() || tpl.betreff,
      defaultTo,
      defaultCc,
    }
  }

  let gesendet = false
  if (sendEmail) {
    const toList = options?.to?.map((v) => v.trim()).filter(Boolean) ?? defaultTo
    if (!toList.length) {
      return { ok: false, message: 'Handwerker hat keine E-Mail-Adresse.', link }
    }
    void options?.cc
    void options?.betreff

    const notify = await notifyPartnerHandwerkerAnfrage(row.id)
    if (!notify.ok) {
      return { ok: false, message: notify.error, link }
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
