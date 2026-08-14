/**
 * A6: Abnahme-PDF nach Signatur in Unterlagen von HV + Mieter ablegen + HV benachrichtigen.
 * Kanonische Quelle bleibt auftrag_abnahmeprotokolle (V3).
 */
import { mailOrgAbnahmeDokument } from '@/lib/email/meldung-mail-templates'
import { getMailBranding } from '@/lib/get-mail-branding'
import { sendMail } from '@/lib/mail-service'
import { buildPortalLoginLink } from '@/lib/portal-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function insertUnterlageOnce(input: {
  kundeId: string
  name: string
  dateiUrl: string
  typ: string
}): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('kunden_dokumente')
    .select('id')
    .eq('kunde_id', input.kundeId)
    .eq('datei_url', input.dateiUrl)
    .eq('typ', input.typ)
    .limit(1)
    .maybeSingle()
  if (existing?.id) return

  await supabaseAdmin.from('kunden_dokumente').insert({
    kunde_id: input.kundeId,
    name: input.name,
    typ: input.typ,
    datei_url: input.dateiUrl,
    groesse_bytes: null,
    erstellt_von: null,
  })
}

export async function verteileAbnahmeAnUnterlagen(input: {
  auftragId: string
  pdfUrl: string
  protokollId?: string | null
}): Promise<void> {
  const auftragId = input.auftragId?.trim()
  const pdfUrl = input.pdfUrl?.trim()
  if (!auftragId || !pdfUrl) return

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select(
      `
      id,
      titel,
      kunde_id,
      lead_id,
      abschlussdokumentation_url,
      leads(
        id,
        auftraggeber_kunde_id,
        kunde_id,
        melder_name
      )
    `
    )
    .eq('id', auftragId)
    .maybeSingle()

  if (!auf) return

  const leadRaw = auf.leads as
    | {
        auftraggeber_kunde_id?: string | null
        kunde_id?: string | null
        melder_name?: string | null
      }
    | {
        auftraggeber_kunde_id?: string | null
        kunde_id?: string | null
        melder_name?: string | null
      }[]
    | null
  const lead = Array.isArray(leadRaw) ? leadRaw[0] : leadRaw

  const hvId =
    lead?.auftraggeber_kunde_id?.trim() ||
    (auf.kunde_id ? String(auf.kunde_id) : null)
  const mieterId = lead?.kunde_id?.trim() || null

  const name = `Abnahmeprotokoll — ${String(auf.titel ?? 'Auftrag').trim() || 'Auftrag'}`

  if (hvId) {
    await insertUnterlageOnce({
      kundeId: hvId,
      name,
      dateiUrl: pdfUrl,
      typ: 'abnahmeprotokoll',
    })

    await supabaseAdmin.from('hv_notifications').insert({
      kunde_id: hvId,
      typ: 'abnahme',
      titel: 'Abnahmedokument verfügbar',
      body: `Das Abnahmeprotokoll zu „${String(auf.titel ?? 'Auftrag').trim() || 'Auftrag'}“ liegt in den Unterlagen.`,
      link: `/portal?section=vorgaenge&id=${encodeURIComponent(String(auf.lead_id ?? ''))}`,
    })
  }

  // Mieter nur wenn anderer Kunde als HV
  if (mieterId && mieterId !== hvId) {
    await insertUnterlageOnce({
      kundeId: mieterId,
      name,
      dateiUrl: pdfUrl,
      typ: 'abnahmeprotokoll',
    })
  }

  if (!hvId) return

  const { data: hv } = await supabaseAdmin
    .from('kunden')
    .select('id, name, email, org_anzeigename, portal_modus')
    .eq('id', hvId)
    .maybeSingle()

  const email = (hv as { email?: string | null } | null)?.email?.trim()
  if (!email) return

  const branding = await getMailBranding(supabaseAdmin)
  const orgName =
    (hv as { org_anzeigename?: string; name?: string } | null)?.org_anzeigename?.trim() ||
    (hv as { name?: string } | null)?.name?.trim() ||
    'Auftraggeber'
  const tpl = mailOrgAbnahmeDokument(
    {
      orgName,
      objektTitel: String(auf.titel ?? 'Auftrag'),
      portalLink: buildPortalLoginLink(),
      abschlussberichtUrl:
        (auf as { abschlussdokumentation_url?: string | null }).abschlussdokumentation_url ?? null,
    },
    branding
  )

  void sendMail({
    typ: 'org_abnahme_dokument',
    an: email,
    anName: orgName,
    betreff: tpl.betreff,
    html: tpl.html,
    leadId: lead ? String((lead as { id?: string }).id ?? auf.lead_id ?? '') || undefined : undefined,
    kundeId: hvId,
    auftragId,
  })
}
