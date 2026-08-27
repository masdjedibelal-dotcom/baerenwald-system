import { createClient } from '@/lib/supabase-server'
import { resolveObjektVorgangKosten } from '@/lib/objektakte/resolve-objekt-vorgang-kosten'
import type { ObjektHistoriePayload, ObjektHistorieRow } from '@/lib/objektakte/types'
import { loadVorgaengeListe } from '@/lib/vorgang/load-vorgaenge-liste'
import type { VorgangPhase } from '@/lib/vorgang/types'

type LeadHistorieMeta = {
  melder_einheit: string | null
  bereiche: string[] | null
  objekt_anlage_id: string | null
  anlageLabel: string | null
  gewerkLabel: string | null
}

function normalizeGewerkJoin(
  raw: { name?: string } | { name?: string }[] | null | undefined
): string | null {
  if (!raw) return null
  const row = Array.isArray(raw) ? raw[0] : raw
  const name = row?.name?.trim()
  return name || null
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

function isAnlageJoinSchemaError(message: string): boolean {
  return /objekt_anlage|objekt_anlagen|does not exist|Could not find|schema cache/i.test(
    message
  )
}

async function loadLeadHistorieMeta(
  supabase: ReturnType<typeof createClient>,
  leadIds: string[]
): Promise<Map<string, LeadHistorieMeta>> {
  const metaByLead = new Map<string, LeadHistorieMeta>()
  if (!leadIds.length) return metaByLead

  const fullSelect =
    'id, melder_einheit, bereiche, objekt_anlage_id, objekt_anlagen(id, bezeichnung, status, gewerke(name))'
  const idOnlySelect = 'id, melder_einheit, bereiche, objekt_anlage_id'
  const legacySelect = 'id, melder_einheit, bereiche'

  let rows: Array<Record<string, unknown>> = []

  const full = await supabase.from('leads').select(fullSelect).in('id', leadIds)
  if (!full.error) {
    rows = (full.data ?? []) as Array<Record<string, unknown>>
  } else if (isAnlageJoinSchemaError(full.error.message)) {
    const idOnly = await supabase.from('leads').select(idOnlySelect).in('id', leadIds)
    if (!idOnly.error) {
      rows = (idOnly.data ?? []) as Array<Record<string, unknown>>
    } else if (isAnlageJoinSchemaError(idOnly.error.message)) {
      const legacy = await supabase.from('leads').select(legacySelect).in('id', leadIds)
      if (!legacy.error) {
        rows = (legacy.data ?? []) as Array<Record<string, unknown>>
      } else {
        console.warn('loadObjektHistorie leads:', legacy.error.message)
      }
    } else {
      console.warn('loadObjektHistorie leads:', idOnly.error.message)
    }
  } else {
    console.warn('loadObjektHistorie leads:', full.error.message)
  }

  for (const row of rows) {
    const anlageRaw = row.objekt_anlagen as
      | { bezeichnung?: string; gewerke?: { name?: string } | { name?: string }[] | null }
      | { bezeichnung?: string; gewerke?: { name?: string } | { name?: string }[] | null }[]
      | null
      | undefined
    const anlage = Array.isArray(anlageRaw) ? anlageRaw[0] : anlageRaw
    metaByLead.set(String(row.id), {
      melder_einheit: (row.melder_einheit as string | null) ?? null,
      bereiche: (row.bereiche as string[] | null) ?? null,
      objekt_anlage_id: (row.objekt_anlage_id as string | null) ?? null,
      anlageLabel: anlage?.bezeichnung?.trim() || null,
      gewerkLabel: normalizeGewerkJoin(anlage?.gewerke ?? null),
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

  const { data: angebote } = await supabase
    .from('angebote')
    .select('id, lead_id, status, gesamt_fix, gesamt_min, gesamt_max')
    .in('lead_id', leadIds)

  const { data: auftraege } = await supabase
    .from('auftraege')
    .select('id, lead_id, angebot_id, status')
    .in('lead_id', leadIds)

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
      objekt_anlage_id: null,
      anlageLabel: null,
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
      anlageLabel: meta.anlageLabel,
      anlageId: meta.objekt_anlage_id,
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
