import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { resolveObjektVorgangKosten } from '@/lib/objektakte/resolve-objekt-vorgang-kosten'
import type { ObjektHistoriePayload, ObjektHistorieRow } from '@/lib/objektakte/types'
import { loadVorgaengeListe } from '@/lib/vorgang/load-vorgaenge-liste'
import type { VorgangPhase } from '@/lib/vorgang/types'

type LeadHistorieMeta = {
  melder_einheit: string | null
  bereiche: string[] | null
  gewerkLabel: string | null
}

function gewerkFromLead(meta: LeadHistorieMeta): string | null {
  if (meta.gewerkLabel) return meta.gewerkLabel
  const b = meta.bereiche?.find((x) => x?.trim())
  return b?.trim() || null
}

function einheitLabelFromMeta(meta: LeadHistorieMeta): string | null {
  const e = meta.melder_einheit?.trim()
  return e || null
}

async function loadLeadHistorieMeta(
  supabase: ReturnType<typeof createClient>,
  leadIds: string[]
): Promise<Map<string, LeadHistorieMeta>> {
  const metaByLead = new Map<string, LeadHistorieMeta>()
  if (!leadIds.length) return metaByLead

  const { data, error } = await supabase
    .from('leads')
    .select('id, melder_einheit, bereiche')
    .in('id', leadIds)
  if (error) logDbError('lib/objektakte/load-objekt-historie:leads', error)

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    metaByLead.set(String(row.id), {
      melder_einheit: (row.melder_einheit as string | null) ?? null,
      bereiche: (row.bereiche as string[] | null) ?? null,
      gewerkLabel: null,
    })
  }

  return metaByLead
}

/** Vorgänge am Objekt — chronologisch, null-tolerant (ohne Anlage/Einheit/Gewerk → „—"). */
export async function loadObjektHistorie(
  kundeId: string,
  objektId: string
): Promise<ObjektHistoriePayload> {
  const kid = kundeId.trim()
  const oid = objektId.trim()
  if (!kid || !oid) return { rows: [], leadIds: [] }

  const { rows: vorgaenge, error } = await loadVorgaengeListe({ kundeId: kid, objektId: oid })
  if (error) {
    console.warn('loadObjektHistorie vorgaenge:', error)
    return { rows: [], leadIds: [] }
  }

  const leadIds = Array.from(new Set(vorgaenge.map((r) => r.leadId).filter(Boolean)))
  if (!leadIds.length) return { rows: [], leadIds: [] }

  const supabase = createClient()
  const metaByLead = await loadLeadHistorieMeta(supabase, leadIds)

  const { data: angebote, error: error2 } = await supabase
    .from('angebote')
    .select('id, lead_id, status, gesamt_fix, gesamt_min, gesamt_max')
    .in('lead_id', leadIds)
  if (error2) logDbError('lib/objektakte/load-objekt-historie:angebote', error2)

  const { data: auftraege, error: error3 } = await supabase
    .from('auftraege')
    .select('id, lead_id, angebot_id, status')
    .in('lead_id', leadIds)
  if (error3) logDbError('lib/objektakte/load-objekt-historie:auftraege', error3)

  const auftragIds = (auftraege ?? []).map((a) => String(a.id)).filter(Boolean)
  const angebotIds = (angebote ?? []).map((a) => String(a.id)).filter(Boolean)

  let rechnungen: Array<{
    auftrag_id?: string | null
    angebot_id?: string | null
    status: string
    brutto?: number | null
    rechnung_art?: string | null
    created_at: string
    updated_at?: string | null
  }> = []

  if (auftragIds.length || angebotIds.length) {
    let q = supabase
      .from('rechnungen')
      .select('auftrag_id, angebot_id, status, brutto, rechnung_art, created_at, updated_at')
    if (auftragIds.length && angebotIds.length) {
      q = q.or(`auftrag_id.in.(${auftragIds.join(',')}),angebot_id.in.(${angebotIds.join(',')})`)
    } else if (auftragIds.length) {
      q = q.in('auftrag_id', auftragIds)
    } else {
      q = q.in('angebot_id', angebotIds)
    }
    const { data, error: recErr } = await q
    if (recErr) console.warn('loadObjektHistorie rechnungen:', recErr.message)
    rechnungen = (data ?? []) as typeof rechnungen
  }

  const angeboteByLead = new Map<string, NonNullable<typeof angebote>>()
  for (const a of angebote ?? []) {
    const lid = String(a.lead_id ?? '')
    if (!lid) continue
    const list = angeboteByLead.get(lid) ?? []
    list.push(a)
    angeboteByLead.set(lid, list)
  }
  const auftraegeByLead = new Map<string, NonNullable<typeof auftraege>>()
  for (const a of auftraege ?? []) {
    const lid = String(a.lead_id ?? '')
    if (!lid) continue
    const list = auftraegeByLead.get(lid) ?? []
    list.push(a)
    auftraegeByLead.set(lid, list)
  }

  const rechnungenByLead = new Map<string, typeof rechnungen>()
  for (const lid of leadIds) {
    const leadAuf = auftraegeByLead.get(lid) ?? []
    const leadAng = angeboteByLead.get(lid) ?? []
    const aufIds = new Set(leadAuf.map((a) => String(a.id)))
    const angIds = new Set(leadAng.map((a) => String(a.id)))
    const recs = rechnungen.filter(
      (r) =>
        (r.auftrag_id && aufIds.has(String(r.auftrag_id))) ||
        (r.angebot_id && angIds.has(String(r.angebot_id)))
    )
    rechnungenByLead.set(lid, recs)
  }

  const rows: ObjektHistorieRow[] = vorgaenge.map((v) => {
    const meta = metaByLead.get(v.leadId) ?? {
      melder_einheit: null,
      bereiche: null,
      gewerkLabel: null,
    }
    const kosten = resolveObjektVorgangKosten({
      rechnungen: rechnungenByLead.get(v.leadId) ?? [],
      auftraege: (auftraegeByLead.get(v.leadId) ?? []) as Array<{
        status: string
        angebot_id?: string | null
      }>,
      angebote: (angeboteByLead.get(v.leadId) ?? []) as Array<{
        id?: string
        status?: string
        gesamt_fix?: number | null
        gesamt_min?: number | null
        gesamt_max?: number | null
      }>,
    })

    const phase: VorgangPhase | 'bestand' = v.ist_wiederkehrend ? 'bestand' : v.phase

    return {
      leadId: v.leadId,
      datum: v.updatedAt || new Date().toISOString(),
      titel: v.titel,
      einheitLabel: einheitLabelFromMeta(meta),
      gewerkLabel: gewerkFromLead(meta),
      phase,
      unterstatus: v.unterstatus,
      unterstatusLabel: v.unterstatusLabel,
      kostenLabel: kosten.label,
      kostenEuro: kosten.euro,
      detailHref: v.detailHref,
      ist_wiederkehrend: v.ist_wiederkehrend,
    }
  })

  rows.sort((a, b) => b.datum.localeCompare(a.datum))

  return { rows, leadIds }
}
