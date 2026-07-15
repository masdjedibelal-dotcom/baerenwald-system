import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { filterOutLegacyDemoLeads } from '@/lib/legacy-demo-data'
import { leadKundeEmbed } from '@/lib/supabase/lead-kunde-embed'
import type { LeadKanal } from '@/lib/types'
import { auftragBrauchtHandwerkerAktion } from '@/lib/vorgang/handwerker-aktion-offen'
import { resolveVorgang } from '@/lib/vorgang/resolve-vorgang'
import type { ResolvedVorgang, VorgangListeRow, VorgangPhase } from '@/lib/vorgang/types'

export type { VorgangListeRow } from '@/lib/vorgang/types'

export { computeVorgaengeKpis, countVorgaengeByPhase } from '@/lib/vorgang/vorgaenge-kpis'
export type { VorgaengeKpis } from '@/lib/vorgang/vorgaenge-kpis'

const VORGAENGE_LEAD_SELECT = `
  id,
  status,
  kanal,
  situation,
  bereiche,
  plz,
  kontakt_name,
  org_freigabe_status,
  hv_meldung_status,
  funnel_daten,
  created_at,
  updated_at,
  kontakt_email,
  kontakt_telefon,
  notizen,
  ${leadKundeEmbed('id, name, vorname, nachname, typ')}
`

export async function loadVorgaengeListe(): Promise<{
  rows: VorgangListeRow[]
  error: string | null
}> {
  const [leadsRes, angeboteRes, auftraegeRes, rechnungenRes, positionenRes] = await Promise.all([
    withCrmReadFallback(async (db) =>
      db
        .from('leads')
        .select(VORGAENGE_LEAD_SELECT)
        .order('updated_at', { ascending: false })
        .limit(200)
    ),
    withCrmReadFallback(async (db) =>
      db
        .from('angebote')
        .select('id, lead_id, status, status_einfach, gesendet_am, gesendet_kunde_at, created_at, updated_at')
        .not('lead_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500)
    ),
    withCrmReadFallback(async (db) =>
      db
        .from('auftraege')
        .select('id, lead_id, status, titel, created_at, updated_at')
        .not('lead_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500)
    ),
    withCrmReadFallback(async (db) =>
      db
        .from('rechnungen')
        .select(
          'id, status, faellig_am, brutto, created_at, updated_at, auftrag_id, angebote(lead_id), auftraege(lead_id)'
        )
        .order('created_at', { ascending: false })
        .limit(500)
    ),
    withCrmReadFallback(async (db) =>
      db
        .from('auftrag_positionen')
        .select('auftrag_id, handwerker_id, handwerker_status')
        .order('created_at', { ascending: false })
        .limit(2000)
    ),
  ])

  const err =
    leadsRes.error?.message ??
    angeboteRes.error?.message ??
    auftraegeRes.error?.message ??
    rechnungenRes.error?.message ??
    positionenRes.error?.message ??
    null

  if (err || !leadsRes.data) {
    return { rows: [], error: err }
  }

  type LeadRow = {
    id: string
    status: string
    kanal: LeadKanal
    situation: string | null
    bereiche: string[] | null
    plz: string | null
    kontakt_name: string | null
    kontakt_email: string | null
    kontakt_telefon: string | null
    notizen: string | null
    org_freigabe_status: string | null
    hv_meldung_status: string | null
    funnel_daten: unknown
    created_at: string
    updated_at: string
    kunden?: { name?: string | null; vorname?: string | null; nachname?: string | null } | null
  }

  const leads = filterOutLegacyDemoLeads(leadsRes.data as unknown as LeadRow[])
  const angebote = (angeboteRes.data ?? []) as Array<{
    id: string
    lead_id: string
    status: string
    status_einfach: string | null
    gesendet_am: string | null
    gesendet_kunde_at: string | null
    created_at: string
    updated_at: string | null
  }>
  const auftraege = (auftraegeRes.data ?? []) as Array<{
    id: string
    lead_id: string
    status: string
    titel: string | null
    created_at: string
    updated_at: string | null
  }>
  const rechnungen = (rechnungenRes.data ?? []) as Array<{
    id: string
    status: string
    faellig_am: string | null
    brutto: number | null
    created_at: string
    updated_at: string | null
    auftrag_id: string | null
    angebote?: { lead_id: string | null } | { lead_id: string | null }[] | null
    auftraege?: { lead_id: string | null } | { lead_id: string | null }[] | null
  }>

  const rechnungenNorm = rechnungen
    .map((r) => {
      const leadId =
        pickEmbedLeadId(r.auftraege) ?? pickEmbedLeadId(r.angebote) ?? null
      if (!leadId) return null
      return {
        id: r.id,
        lead_id: leadId,
        status: r.status,
        faellig: r.faellig_am,
        brutto: r.brutto,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }
    })
    .filter(Boolean) as Array<{
    id: string
    lead_id: string
    status: string
    faellig: string | null
    brutto: number | null
    created_at: string
    updated_at: string | null
  }>

  const angeboteByLead = groupBy(angebote, (a) => a.lead_id)
  const auftraegeByLead = groupBy(auftraege, (a) => a.lead_id)
  const rechnungenByLead = groupBy(rechnungenNorm, (r) => r.lead_id)

  const positionenByAuftrag = groupBy(
    (positionenRes.data ?? []) as Array<{
      auftrag_id: string
      handwerker_id: string | null
      handwerker_status: string | null
    }>,
    (p) => p.auftrag_id
  )
  const hwAktionByAuftrag = new Map<string, boolean>()
  for (const [auftragId, pos] of Array.from(positionenByAuftrag.entries())) {
    hwAktionByAuftrag.set(auftragId, auftragBrauchtHandwerkerAktion(pos))
  }

  const rows: VorgangListeRow[] = leads.map((lead) => {
    const kunde = lead.kunden
    const kundeName =
      kunde?.name?.trim() ||
      [kunde?.vorname, kunde?.nachname].filter(Boolean).join(' ').trim() ||
      lead.kontakt_name?.trim() ||
      null

    const resolved = resolveVorgang({
      lead: {
        id: lead.id,
        status: lead.status,
        situation: lead.situation,
        funnel_daten: lead.funnel_daten,
        kanal: lead.kanal,
        org_freigabe_status: lead.org_freigabe_status,
        hv_meldung_status: lead.hv_meldung_status,
        kontakt_name: lead.kontakt_name,
        plz: lead.plz,
        bereiche: lead.bereiche,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
      },
      angebote: (angeboteByLead.get(lead.id) ?? []).map((a) => ({
        id: a.id,
        status: a.status,
        status_einfach: a.status_einfach,
        gesendet_am: a.gesendet_am,
        gesendet_kunde_at: a.gesendet_kunde_at,
        created_at: a.created_at,
        updated_at: a.updated_at,
      })),
      auftraege: (auftraegeByLead.get(lead.id) ?? []).map((a) => ({
        id: a.id,
        status: a.status,
        titel: a.titel,
        created_at: a.created_at,
        updated_at: a.updated_at,
        handwerkerAktionOffen: hwAktionByAuftrag.get(a.id) ?? false,
      })),
      rechnungen: (rechnungenByLead.get(lead.id) ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        faellig: r.faellig,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    })

    const rechnung = (rechnungenByLead.get(lead.id) ?? [])[0]
    const wertLabel =
      rechnung?.brutto != null
        ? `${Math.round(Number(rechnung.brutto)).toLocaleString('de-DE')} €`
        : null

    return {
      ...resolved,
      leadId: lead.id,
      kundeName,
      wertLabel,
      detailHref: detailHrefForPhase(resolved.phase, resolved.entityId, lead.id),
    }
  })

  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return { rows, error: null }
}

function pickEmbedLeadId(
  embed: { lead_id: string | null } | { lead_id: string | null }[] | null | undefined
): string | null {
  if (!embed) return null
  if (Array.isArray(embed)) return embed[0]?.lead_id?.trim() || null
  return embed.lead_id?.trim() || null
}

function groupBy<T>(items: T[], keyFn: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const item of items) {
    const k = keyFn(item)
    if (!k) continue
    const arr = m.get(k) ?? []
    arr.push(item)
    m.set(k, arr)
  }
  return m
}

export function detailHrefForPhase(phase: VorgangPhase, entityId: string, leadId: string): string {
  switch (phase) {
    case 'anfrage':
      return `/anfragen/${leadId}`
    case 'angebot':
      return `/angebote/${entityId}`
    case 'auftrag':
      return `/auftraege/${entityId}`
    case 'rechnung':
      return `/rechnungen/${entityId}`
    default:
      return `/anfragen/${leadId}`
  }
}
