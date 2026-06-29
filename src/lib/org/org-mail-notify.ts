import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import {
  mailOrgFreigabeErgebnis,
  mailOrgNeueMeldung,
} from '@/lib/email/meldung-mail-templates'
import { sendInternNotifyEmail } from '@/lib/angebote/emails'
import { sendMail } from '@/lib/mail-service'
import { buildPortalLoginLink } from '@/lib/portal-utils'

function funnelField(funnelDaten: unknown, key: string): string | null {
  if (!funnelDaten || typeof funnelDaten !== 'object') return null
  const v = (funnelDaten as Record<string, unknown>)[key]
  return typeof v === 'string' ? v : null
}

function funnelFotoCount(funnelDaten: unknown): number {
  if (!funnelDaten || typeof funnelDaten !== 'object') return 0
  const fotos = (funnelDaten as { fotos?: unknown }).fotos
  return Array.isArray(fotos) ? fotos.length : 0
}

/** Internes Team bei neuer Mieter-Meldung (hv_melder_link). */
export async function notifyInterneNeueMeldung(
  leadId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = leadId?.trim()
  if (!id) return { ok: false, message: 'Lead-ID fehlt.' }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select(
      `
      id, kanal, melder_name, melder_einheit, melder_telefon, melder_email, notizen, funnel_daten,
      zeitraum, auftraggeber_kunde_id, kunde_objekt_id,
      auftraggeber:kunden!leads_auftraggeber_kunde_id_fkey(id, name, org_anzeigename, email),
      kunden_objekte(titel)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !lead) return { ok: false, message: error?.message ?? 'Lead nicht gefunden.' }
  if ((lead as { kanal?: string }).kanal !== 'hv_melder_link') return { ok: true }

  const row = lead as Record<string, unknown>
  const objRaw = row.kunden_objekte
  const objekt = (Array.isArray(objRaw) ? objRaw[0] : objRaw) as { titel?: string } | null | undefined
  const objektTitel = objekt?.titel?.trim() || 'Objekt'
  const melderName = String(row.melder_name ?? 'Melder').trim()
  const kategorie = funnelField(row.funnel_daten, 'melde_kategorie') ?? 'sonstiges'
  const bereichId = funnelField(row.funnel_daten, 'melde_bereich') ?? undefined

  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailOrgNeueMeldung(
    {
      objektTitel,
      melderName,
      melderEinheit: String(row.melder_einheit ?? '').trim() || undefined,
      melderTelefon: String(row.melder_telefon ?? '').trim() || undefined,
      melderEmail: String(row.melder_email ?? '').trim() || undefined,
      kategorie,
      bereichId,
      beschreibung: String(row.notizen ?? '').trim() || undefined,
      fotoCount: funnelFotoCount(row.funnel_daten),
      dringlichkeit: String(row.zeitraum ?? '').trim() || undefined,
      quelle: 'mieter',
      portalLink: buildPortalLoginLink(),
      referenz: id.slice(0, 8).toUpperCase(),
    },
    branding
  )

  await sendInternNotifyEmail({
    subject: tpl.betreff,
    html: tpl.html,
  })

  return { ok: true }
}

/** M4 — nach Org-Freigabe/-Ablehnung (Portal oder CRM). */
export async function notifyOrgFreigabeErgebnis(input: {
  leadId: string
  aktion: 'freigegeben' | 'abgelehnt'
  notiz?: string | null
  betragEur?: number | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const leadId = input.leadId?.trim()
  if (!leadId) return { ok: false, message: 'Lead-ID fehlt.' }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('id, auftraggeber_kunde_id, kunde_objekt_id, kunde_id')
    .eq('id', leadId)
    .maybeSingle()

  if (error || !lead) return { ok: false, message: error?.message ?? 'Lead nicht gefunden.' }

  let orgId = (lead as { auftraggeber_kunde_id?: string | null }).auftraggeber_kunde_id?.trim() || null
  if (!orgId) {
    const kid = (lead as { kunde_id?: string | null }).kunde_id?.trim()
    if (kid) {
      const { data: k } = await supabaseAdmin
        .from('kunden')
        .select('id, portal_modus')
        .eq('id', kid)
        .maybeSingle()
      if ((k as { portal_modus?: string } | null)?.portal_modus === 'organisation') orgId = kid
    }
  }
  if (!orgId) return { ok: true }

  const [{ data: org }, { data: objekt }] = await Promise.all([
    supabaseAdmin
      .from('kunden')
      .select('id, name, email, org_anzeigename')
      .eq('id', orgId)
      .maybeSingle(),
    (lead as { kunde_objekt_id?: string | null }).kunde_objekt_id
      ? supabaseAdmin
          .from('kunden_objekte')
          .select('titel')
          .eq('id', (lead as { kunde_objekt_id: string }).kunde_objekt_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const orgName =
    (org as { org_anzeigename?: string } | null)?.org_anzeigename?.trim() ||
    (org as { name?: string } | null)?.name?.trim() ||
    'Auftraggeber'
  const objektTitel =
    (objekt as { titel?: string } | null)?.titel?.trim() || 'Objekt'

  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailOrgFreigabeErgebnis(
    {
      orgName,
      objektTitel,
      aktion: input.aktion,
      notiz: input.notiz,
    },
    branding
  )

  const intern = await sendInternNotifyEmail({ subject: tpl.betreff, html: tpl.html })
  if (!intern.ok) return intern

  const orgEmail = (org as { email?: string } | null)?.email?.trim()
  if (orgEmail) {
    const mail = await sendMail({
      typ: 'org_freigabe_ergebnis',
      an: orgEmail,
      anName: orgName,
      betreff: tpl.betreff,
      html: tpl.html,
      leadId,
      kundeId: orgId,
    })
    if (!mail.success) return { ok: false, message: mail.error ?? 'Org-Mail fehlgeschlagen.' }
  }

  return { ok: true }
}
