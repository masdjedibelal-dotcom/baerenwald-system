import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import {
  mailAngebotEntscheidung,
  mailOrgFreigabeErgebnis,
  mailOrgNeueMeldung,
} from '@/lib/email/meldung-mail-templates'
import { sendInternNotifyEmail } from '@/lib/angebote/emails'
import { sendMail } from '@/lib/mail-service'
import { buildPortalLoginLink } from '@/lib/portal-utils'
import { sendCrmPushToStaff } from '@/lib/push/send'

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

/**
 * Internes Team: BW soll handeln (nach HV-Freigabe „Angebot erstellen“,
 * oder sofort bei Akut-Direktauftrag, oder nach Hausmeister-Vorbefund).
 */
export async function notifyInterneNeueMeldung(
  leadId: string,
  opts?: {
    quelle?: 'hm_befund'
    ergebnis?: 'fachfirma_angebot' | 'fachfirma_akut'
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = leadId?.trim()
  if (!id) return { ok: false, message: 'Lead-ID fehlt.' }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select(
      `
      id, kanal, anlass, erfassung_von, hv_meldung_status, freigabe_bypass_grund,
      melder_name, melder_einheit, melder_telefon, melder_email, notizen, funnel_daten,
      zeitraum, auftraggeber_kunde_id, kunde_objekt_id,
      auftraggeber:kunden!leads_auftraggeber_kunde_id_fkey(id, name, org_anzeigename, email),
      kunden_objekte(titel)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !lead) return { ok: false, message: error?.message ?? 'Lead nicht gefunden.' }

  const row = lead as Record<string, unknown>
  const kanal = String(row.kanal ?? '').trim().toLowerCase()
  const anlass = String(row.anlass ?? '').trim().toLowerCase()
  const erfassung = String(row.erfassung_von ?? '').trim().toLowerCase()
  const relevant =
    kanal === 'hv_melder_link' ||
    kanal === 'hv_einladung' ||
    kanal === 'hv_direkt' ||
    anlass === 'meldung' ||
    erfassung === 'organisation' ||
    erfassung === 'melder'
  if (!relevant) return { ok: true }

  const objRaw = row.kunden_objekte
  const objekt = (Array.isArray(objRaw) ? objRaw[0] : objRaw) as { titel?: string } | null | undefined
  const objektTitel = objekt?.titel?.trim() || 'Objekt'
  const melderName = String(row.melder_name ?? 'Melder').trim()
  const kategorie = funnelField(row.funnel_daten, 'melde_kategorie') ?? 'sonstiges'
  const bereichId = funnelField(row.funnel_daten, 'melde_bereich') ?? undefined
  const bypass = String(row.freigabe_bypass_grund ?? '').trim().toLowerCase()
  const funnelDirekt =
    row.funnel_daten &&
    typeof row.funnel_daten === 'object' &&
    !Array.isArray(row.funnel_daten) &&
    (row.funnel_daten as { direktauftrag?: unknown }).direktauftrag === true
  const vonHm = opts?.quelle === 'hm_befund'
  const istAkut =
    opts?.ergebnis === 'fachfirma_akut' ||
    bypass === 'akut' ||
    funnelDirekt === true
  const hvStatus = String(row.hv_meldung_status ?? '').trim().toLowerCase()

  const branding = await getMailBranding(supabaseAdmin)
  // Hintergrund-Details weiter aus Org-Template (Melder/Objekt); Betreff/Push BW-seitig.
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
      quelle: erfassung === 'organisation' ? 'hausverwaltung' : 'mieter',
      portalLink: buildPortalLoginLink(),
      referenz: id.slice(0, 8).toUpperCase(),
    },
    branding
  )

  const pushTitle = vonHm
    ? istAkut
      ? 'HM-Vorbefund — Akut'
      : 'HM-Vorbefund — Angebot erstellen'
    : istAkut
      ? 'Akut — Direkt beauftragen'
      : 'Angebot erstellen'
  const pushBody = vonHm
    ? istAkut
      ? `${melderName} · ${objektTitel} — Hausmeister meldet Soforteinsatz.`
      : `${melderName} · ${objektTitel} — Hausmeister-Vorbefund liegt vor.`
    : istAkut
      ? `${melderName} · ${objektTitel} — Sofortmaßnahme, Direktauftrag möglich.`
      : hvStatus === 'angebot_eingefordert' || hvStatus === 'kleinreparatur'
        ? `${melderName} · ${objektTitel} — HV hat freigegeben.`
        : `${melderName} · ${objektTitel}`
  const subject = `${pushTitle} — ${objektTitel}`

  await sendInternNotifyEmail({
    subject,
    html: tpl.html,
  })

  // Best-effort Push (kein Mail): Fire-and-forget bewusst — Glocke/Mail sind die Quelle der Wahrheit.
  void sendCrmPushToStaff({
    typ: vonHm ? 'hm_befund_freigabe' : 'neue_anfrage',
    title: pushTitle,
    body: pushBody,
    url: `/anfragen/${id}`,
    tag: vonHm ? `hm-befund-${id}` : `org-meldung-${id}`,
  }).catch((e) => console.warn('[notifyInterneNeueMeldung] push', e))

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

  const freigabeTitle =
    input.aktion === 'freigegeben' ? 'HV-Freigabe erteilt' : 'HV-Freigabe abgelehnt'
  const freigabeBody =
    input.notiz?.trim() ||
    (input.aktion === 'freigegeben'
      ? `${orgName} hat „${objektTitel}“ freigegeben.`
      : `${orgName} hat die Freigabe für „${objektTitel}“ abgelehnt.`)

  // Best-effort Push (kein Mail): Fire-and-forget bewusst — Timeline/Mail tragen.
  void sendCrmPushToStaff({
    typ: 'angebot_entscheidung',
    title: freigabeTitle,
    body: freigabeBody,
    url: `/anfragen/${leadId}`,
    tag: `org-freigabe-${leadId}`,
  }).catch((e) => console.warn('[notifyOrgFreigabeErgebnis] push', e))

  const intern = await sendInternNotifyEmail({ subject: tpl.betreff, html: tpl.html })
  if (!intern.ok) {
    console.warn('[notifyOrgFreigabeErgebnis] interne Mail:', intern.message)
  }

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
    if (!mail.success) {
      console.warn('[notifyOrgFreigabeErgebnis] Org-Mail:', mail.error)
    }
  }

  // Nach HV-Angebots-Freigabe: Auftrag automatisch aus dem zugestellten Angebot
  if (input.aktion === 'freigegeben') {
    try {
      const { data: existingAuf } = await supabaseAdmin
        .from('auftraege')
        .select('id')
        .eq('lead_id', leadId)
        .neq('status', 'storniert')
        .limit(1)
        .maybeSingle()

      if (!existingAuf?.id) {
        const { data: ang } = await supabaseAdmin
          .from('angebote')
          .select('id, status, status_einfach, gesendet_am, gesendet_kunde_at, pdf_url')
          .eq('lead_id', leadId)
          .order('gesendet_am', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const statusEinfach = String(ang?.status_einfach ?? '')
          .trim()
          .toLowerCase()
        const statusRaw = String(ang?.status ?? '')
          .trim()
          .toLowerCase()
        const schonAngenommen =
          statusEinfach === 'angenommen' ||
          statusRaw === 'kunde_akzeptiert' ||
          statusRaw.includes('akzept')
        const gesendet =
          Boolean(String(ang?.gesendet_am ?? '').trim()) ||
          Boolean(String(ang?.gesendet_kunde_at ?? '').trim()) ||
          statusEinfach === 'gesendet' ||
          statusEinfach === 'gesendet_kunde' ||
          statusRaw.includes('gesendet') ||
          Boolean(String(ang?.pdf_url ?? '').trim()) ||
          schonAngenommen

        if (ang?.id && gesendet) {
          const { acceptAngebotAndCreateAuftrag } = await import(
            '@/app/(dashboard)/angebote/angebot-flow-actions'
          )
          const created = await acceptAngebotAndCreateAuftrag(String(ang.id), {
            asSystem: true,
            send_kunden_email: false,
          })
          if (!created.ok) {
            console.warn(
              '[notifyOrgFreigabeErgebnis] Auto-Auftrag:',
              created.message,
              { leadId, angebotId: ang.id }
            )
          }
        }
      }
    } catch (e) {
      console.warn('[notifyOrgFreigabeErgebnis] Auto-Auftrag Exception:', e)
    }
  }

  return { ok: true }
}

/** Portal: Angebot angenommen / abgelehnt → internes Team. */
export async function notifyAngebotEntscheidung(input: {
  leadId: string
  aktion: 'angenommen' | 'abgelehnt'
  notiz?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const leadId = input.leadId?.trim()
  if (!leadId) return { ok: false, message: 'Lead-ID fehlt.' }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select(
      `
      id, kontakt_name, auftraggeber_kunde_id, kunde_id, kunde_objekt_id,
      auftraggeber:kunden!leads_auftraggeber_kunde_id_fkey(id, name, org_anzeigename),
      kunde:kunden!leads_kunde_id_fkey(id, name),
      kunden_objekte(titel)
    `
    )
    .eq('id', leadId)
    .maybeSingle()

  if (error || !lead) return { ok: false, message: error?.message ?? 'Lead nicht gefunden.' }

  const row = lead as Record<string, unknown>
  const objRaw = row.kunden_objekte
  const objekt = (Array.isArray(objRaw) ? objRaw[0] : objRaw) as { titel?: string } | null | undefined
  const objektTitel = objekt?.titel?.trim() || 'Objekt'

  const agRaw = row.auftraggeber
  const ag = (Array.isArray(agRaw) ? agRaw[0] : agRaw) as
    | { name?: string; org_anzeigename?: string }
    | null
    | undefined
  const kundeRaw = row.kunde
  const kunde = (Array.isArray(kundeRaw) ? kundeRaw[0] : kundeRaw) as
    | { name?: string }
    | null
    | undefined

  const entscheidenderName =
    ag?.org_anzeigename?.trim() ||
    ag?.name?.trim() ||
    kunde?.name?.trim() ||
    String(row.kontakt_name ?? '').trim() ||
    'Kunde'

  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailAngebotEntscheidung(
    {
      entscheidenderName,
      objektTitel,
      aktion: input.aktion,
      notiz: input.notiz,
    },
    branding
  )

  const title =
    input.aktion === 'angenommen' ? 'Angebot angenommen' : 'Angebot abgelehnt'
  const body =
    input.notiz?.trim() ||
    (input.aktion === 'angenommen'
      ? `${entscheidenderName} hat das Angebot für „${objektTitel}“ angenommen.`
      : `${entscheidenderName} hat das Angebot für „${objektTitel}“ abgelehnt.`)

  // Best-effort Push (kein Mail): Fire-and-forget bewusst.
  void sendCrmPushToStaff({
    typ: 'angebot_entscheidung',
    title,
    body,
    url: `/anfragen/${leadId}`,
    tag: `angebot-entscheidung-${leadId}`,
  }).catch((e) => console.warn('[notifyAngebotEntscheidung] push', e))

  const intern = await sendInternNotifyEmail({ subject: tpl.betreff, html: tpl.html })
  if (!intern.ok) {
    console.warn('[notifyAngebotEntscheidung] interne Mail:', intern.message)
  }
  return { ok: true }
}
