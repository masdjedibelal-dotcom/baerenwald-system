import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { filterOutLegacyDemoLeads } from '@/lib/legacy-demo-data'
import { filterKundenAngebote } from '@/lib/angebote/partner-einholung'
import { leadKontaktAnzeigeName, leadVertragsKundeId, resolveLeadPreisAnzeige } from '@/lib/lead-display-helpers'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import { createClient } from '@/lib/supabase-server'
import { leadAuftraggeberEmbed, leadKundeEmbed } from '@/lib/supabase/lead-kunde-embed'
import type { LeadKanal } from '@/lib/types'
import { betragAnzeigeBrutto } from '@/lib/angebot-einfach'
import { auftragBrauchtHandwerkerAktion } from '@/lib/vorgang/handwerker-aktion-offen'
import {
  isPhaseWinningRechnung,
  mapAngebotStatusEinfach,
  resolveSatellitenRechnungVorgang,
  resolveStandaloneDirektrechnung,
  resolveVorgang,
} from '@/lib/vorgang/resolve-vorgang'
import { parseVorgangWertLabelEuro } from '@/lib/vorgang/vorgaenge-liste-summe'
import type { ResolvedVorgang, VorgangListeRow, VorgangPhase } from '@/lib/vorgang/types'
import { unterstatusLabel } from '@/lib/vorgang/vorgang-labels'
import { resolveListeWiederkehr } from '@/lib/vorgang/wiederkehrend'
import {
  hatAktivenAbschlagsplan,
  istRechnungGestelltOderBezahlt,
  parseZahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'

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
  kunde_id,
  auftraggeber_kunde_id,
  org_freigabe_status,
  hv_meldung_status,
  freigabe_bypass_grund,
  erfassung_von,
  anlass,
  funnel_daten,
  preis_min,
  preis_max,
  budget_ca,
  created_at,
  updated_at,
  kontakt_email,
  kontakt_telefon,
  notizen,
  ist_wiederkehrend,
  wiederkehr_turnus,
  ${leadKundeEmbed('id, name, vorname, nachname, typ')},
  ${leadAuftraggeberEmbed('id, name, vorname, nachname, typ, org_anzeigename')}
`

export type LoadVorgaengeListeOpts = {
  /** Nur Vorgänge dieses Kunden (statt globale Liste). */
  kundeId?: string
  /** Nur Vorgänge mit diesem Handwerker (über Auftragspositionen / Zuweisungen). */
  handwerkerId?: string
  /** Nur Vorgänge an diesem Verwaltungsobjekt (leads.kunde_objekt_id). */
  objektId?: string
}

async function resolveLeadIdsForHandwerker(
  handwerkerId: string
): Promise<string[]> {
  const ids = new Set<string>()
  const [posRes, zuwRes] = await Promise.all([
    withCrmReadFallback(async (db) =>
      db
        .from('auftrag_positionen')
        .select('auftrag_id')
        .eq('handwerker_id', handwerkerId)
        .limit(300)
    ),
    withCrmReadFallback(async (db) =>
      db
        .from('angebot_handwerker')
        .select('angebot_id')
        .eq('handwerker_id', handwerkerId)
        .limit(200)
    ),
  ])
  const auftragIds = Array.from(
    new Set(
      (posRes.data ?? [])
        .map((r) => String((r as { auftrag_id?: string }).auftrag_id ?? ''))
        .filter(Boolean)
    )
  )
  const angebotIds = Array.from(
    new Set(
      (zuwRes.data ?? [])
        .map((r) => String((r as { angebot_id?: string }).angebot_id ?? ''))
        .filter(Boolean)
    )
  )
  const [aufLeads, angLeads] = await Promise.all([
    auftragIds.length
      ? withCrmReadFallback(async (db) =>
          db.from('auftraege').select('lead_id').in('id', auftragIds)
        )
      : Promise.resolve({ data: [] as { lead_id?: string }[] }),
    angebotIds.length
      ? withCrmReadFallback(async (db) =>
          db.from('angebote').select('lead_id').in('id', angebotIds)
        )
      : Promise.resolve({ data: [] as { lead_id?: string }[] }),
  ])
  for (const row of [...(aufLeads.data ?? []), ...(angLeads.data ?? [])]) {
    const lid = String((row as { lead_id?: string }).lead_id ?? '')
    if (lid) ids.add(lid)
  }
  return Array.from(ids)
}

export async function loadVorgaengeListe(opts?: LoadVorgaengeListeOpts): Promise<{
  rows: VorgangListeRow[]
  error: string | null
}> {
  try {
    return await loadVorgaengeListeInner(opts)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Vorgänge konnten nicht geladen werden.'
    console.error('loadVorgaengeListe', e)
    return { rows: [], error: msg }
  }
}

async function loadVorgaengeListeInner(opts?: LoadVorgaengeListeOpts): Promise<{
  rows: VorgangListeRow[]
  error: string | null
}> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { rows: [], error: 'Sitzung abgelaufen — bitte erneut anmelden.' }
  }

  const kundeId = opts?.kundeId?.trim() || null
  const handwerkerId = opts?.handwerkerId?.trim() || null
  const objektId = opts?.objektId?.trim() || null
  const scoped = Boolean(kundeId || handwerkerId || objektId)
  const leadLimit = scoped ? 80 : 200

  const RECHNUNG_SELECT =
    'id, status, faellig_am, brutto, created_at, updated_at, auftrag_id, angebot_id, kunde_id, rechnung_art, abschlag_index, rechnungsnummer, ist_wiederkehrend, wiederkehr_turnus, ersetzt_durch, korrektur_von, korrektur_art, richtung, handwerker_id, angebot_handwerker_id, angebote(lead_id), auftraege(lead_id), kunden!kunde_id(id, name, vorname, nachname, typ), handwerker:handwerker_id(id, name, firma)'

  let handwerkerLeadIds: string[] | null = null
  if (handwerkerId) {
    handwerkerLeadIds = await resolveLeadIdsForHandwerker(handwerkerId)
    if (!handwerkerLeadIds.length) {
      return { rows: [], error: null }
    }
  }

  const leadsRes = await withCrmReadFallback(async (db) => {
    let q = db
      .from('leads')
      .select(VORGAENGE_LEAD_SELECT)
      .is('geloescht_am', null)
      .order('updated_at', { ascending: false })
      .limit(leadLimit)
    if (kundeId) {
      q = q.or(`kunde_id.eq.${kundeId},auftraggeber_kunde_id.eq.${kundeId}`)
    }
    if (objektId) {
      q = q.eq('kunde_objekt_id', objektId)
    }
    if (handwerkerLeadIds?.length) {
      q = q.in('id', handwerkerLeadIds)
    }
    return q
  })

  if (leadsRes.error || !leadsRes.data) {
    return { rows: [], error: leadsRes.error?.message ?? 'Leads konnten nicht geladen werden.' }
  }

  const leadIds = (leadsRes.data ?? [])
    .map((l) => String((l as { id?: unknown }).id ?? ''))
    .filter(Boolean)

  const emptySatellites = {
    data: [] as unknown[],
    error: null as { message: string } | null,
  }

  const [angeboteRes, auftraegeRes] = leadIds.length
    ? await Promise.all([
        withCrmReadFallback(async (db) =>
          db
            .from('angebote')
            .select(
              'id, lead_id, status, status_einfach, gesendet_am, gesendet_kunde_at, leistungsumfang, notizen, gesamt_fix, gesamt_min, gesamt_max, created_at, updated_at, ist_wiederkehrend, wiederkehr_turnus, ersetzt_durch, zahlungsplan, ist_partner_einholung'
            )
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false })
            .limit(500)
        ),
        withCrmReadFallback(async (db) =>
          db
            .from('auftraege')
            .select(
              'id, lead_id, angebot_id, status, titel, created_at, updated_at, ist_wiederkehrend, wiederkehr_turnus, ist_notfall'
            )
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false })
            .limit(500)
        ),
      ])
    : [emptySatellites, emptySatellites]

  if (angeboteRes.error || auftraegeRes.error) {
    return {
      rows: [],
      error: angeboteRes.error?.message ?? auftraegeRes.error?.message ?? null,
    }
  }

  const auftragIds = (
    (auftraegeRes.data ?? []) as Array<{ id: string }>
  )
    .map((a) => a.id)
    .filter(Boolean)
  const angebotIds = (
    (angeboteRes.data ?? []) as Array<{ id: string }>
  )
    .map((a) => a.id)
    .filter(Boolean)

  const [rechnungenLinkedRes, rechnungenStandaloneRes, rechnungenEingehendRes, positionenRes] =
    await Promise.all([
    auftragIds.length || angebotIds.length
      ? withCrmReadFallback(async (db) => {
          let q = db
            .from('rechnungen')
            .select(RECHNUNG_SELECT)
            .order('created_at', { ascending: false })
            .limit(scoped ? 200 : 500)
          if (auftragIds.length && angebotIds.length) {
            q = q.or(
              `auftrag_id.in.(${auftragIds.join(',')}),angebot_id.in.(${angebotIds.join(',')})`
            )
          } else if (auftragIds.length) {
            q = q.in('auftrag_id', auftragIds)
          } else {
            q = q.in('angebot_id', angebotIds)
          }
          return q
        })
      : Promise.resolve(emptySatellites),
    // Globale Liste: Direktrechnungen ohne Lead. Scoped (Kunde/HW): überspringen.
    scoped
      ? Promise.resolve(emptySatellites)
      : withCrmReadFallback(async (db) =>
          db
            .from('rechnungen')
            .select(RECHNUNG_SELECT)
            .is('auftrag_id', null)
            .is('angebot_id', null)
            .order('created_at', { ascending: false })
            .limit(100)
        ),
    scoped
      ? Promise.resolve(emptySatellites)
      : withCrmReadFallback(async (db) =>
          db
            .from('rechnungen')
            .select(RECHNUNG_SELECT)
            .eq('richtung', 'eingehend')
            .order('created_at', { ascending: false })
            .limit(200)
        ),
    auftragIds.length
      ? withCrmReadFallback(async (db) =>
          db
            .from('auftrag_positionen')
            .select('auftrag_id, handwerker_id, handwerker_status')
            .in('auftrag_id', auftragIds)
            .order('created_at', { ascending: false })
            .limit(scoped ? 800 : 2000)
        )
      : Promise.resolve(emptySatellites),
  ])

  const rechnungenById = new Map<string, unknown>()
  for (const row of [
    ...(rechnungenLinkedRes.data ?? []),
    ...(rechnungenStandaloneRes.data ?? []),
    ...(rechnungenEingehendRes.data ?? []),
  ]) {
    const id = String((row as { id: string }).id)
    if (!rechnungenById.has(id)) rechnungenById.set(id, row)
  }
  const rechnungenRes = {
    data: Array.from(rechnungenById.values()),
    error:
      rechnungenLinkedRes.error ??
      rechnungenStandaloneRes.error ??
      rechnungenEingehendRes.error,
  }

  const err =
    rechnungenRes.error?.message ?? positionenRes.error?.message ?? null

  if (err) {
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
    kunde_id: string | null
    auftraggeber_kunde_id: string | null
    org_freigabe_status: string | null
    hv_meldung_status: string | null
    freigabe_bypass_grund: string | null
    funnel_daten: unknown
    preis_min: number | null
    preis_max: number | null
    budget_ca: number | null
    created_at: string
    updated_at: string
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
    kunden?: {
      id?: string | null
      name?: string | null
      vorname?: string | null
      nachname?: string | null
      typ?: string | null
    } | null
    auftraggeber?: {
      id?: string | null
      name?: string | null
      vorname?: string | null
      nachname?: string | null
      typ?: string | null
      org_anzeigename?: string | null
    } | null
  }

  const leads = filterOutLegacyDemoLeads(leadsRes.data as unknown as LeadRow[])
  const angebote = filterKundenAngebote(
    (angeboteRes.data ?? []) as Array<{
      id: string
      lead_id: string
      status: string
      status_einfach: string | null
      gesendet_am: string | null
      gesendet_kunde_at: string | null
      leistungsumfang: string | null
      notizen: string | null
      gesamt_fix: number | null
      gesamt_min: number | null
      gesamt_max: number | null
      created_at: string
      updated_at: string | null
      ist_wiederkehrend?: boolean | null
      wiederkehr_turnus?: string | null
      ersetzt_durch?: string | null
      zahlungsplan?: unknown
      ist_partner_einholung?: boolean | null
    }>
  )
  const auftraege = (auftraegeRes.data ?? []) as Array<{
    id: string
    lead_id: string
    angebot_id: string | null
    status: string
    titel: string | null
    created_at: string
    updated_at: string | null
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
    ist_notfall?: boolean | null
  }>
  const rechnungen = (rechnungenRes.data ?? []) as Array<{
    id: string
    status: string
    faellig_am: string | null
    brutto: number | null
    created_at: string
    updated_at: string | null
    auftrag_id: string | null
    kunde_id: string | null
    rechnung_art: string | null
    abschlag_index: number | null
    rechnungsnummer: string | null
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
    ersetzt_durch?: string | null
    korrektur_von?: string | null
    korrektur_art?: string | null
    richtung?: string | null
    handwerker_id?: string | null
    angebot_handwerker_id?: string | null
    angebote?: { lead_id: string | null } | { lead_id: string | null }[] | null
    auftraege?: { lead_id: string | null } | { lead_id: string | null }[] | null
    kunden?:
      | {
          id?: string | null
          name?: string | null
          vorname?: string | null
          nachname?: string | null
          typ?: string | null
        }
      | {
          id?: string | null
          name?: string | null
          vorname?: string | null
          nachname?: string | null
          typ?: string | null
        }[]
      | null
    handwerker?:
      | { id?: string | null; name?: string | null; firma?: string | null }
      | { id?: string | null; name?: string | null; firma?: string | null }[]
      | null
  }>

  type RechnungNorm = {
    id: string
    lead_id: string | null
    kunde_id: string | null
    kunde_name: string | null
    status: string
    faellig: string | null
    brutto: number | null
    created_at: string
    updated_at: string | null
    rechnung_art: string | null
    abschlag_index: number | null
    rechnungsnummer: string | null
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
    ersetzt_durch?: string | null
    korrektur_von?: string | null
    korrektur_art?: string | null
    richtung: 'ausgehend' | 'eingehend'
    handwerker_id: string | null
    handwerker_name: string | null
    angebot_handwerker_id: string | null
  }

  const rechnungenAll: RechnungNorm[] = rechnungen.map((r) => {
    const leadId =
      pickEmbedLeadId(r.auftraege) ?? pickEmbedLeadId(r.angebote) ?? null
    const kundeEmbed = Array.isArray(r.kunden) ? r.kunden[0] : r.kunden
    const kundeName = kundeEmbed
      ? kundeDisplayName(kundeEmbed).trim() || null
      : null
    const hwEmbed = Array.isArray(r.handwerker) ? r.handwerker[0] : r.handwerker
    const hwName =
      hwEmbed?.firma?.trim() || hwEmbed?.name?.trim() || null
    const richtung =
      String(r.richtung ?? '').toLowerCase() === 'eingehend' ? 'eingehend' : 'ausgehend'
    return {
      id: r.id,
      lead_id: leadId,
      kunde_id: r.kunde_id?.trim() || kundeEmbed?.id?.trim() || null,
      kunde_name: kundeName && kundeName !== '—' ? kundeName : null,
      status: r.status,
      faellig: r.faellig_am,
      brutto: r.brutto,
      created_at: r.created_at,
      updated_at: r.updated_at,
      rechnung_art: r.rechnung_art,
      abschlag_index: r.abschlag_index,
      rechnungsnummer: r.rechnungsnummer,
      ist_wiederkehrend: r.ist_wiederkehrend,
      wiederkehr_turnus: r.wiederkehr_turnus,
      ersetzt_durch: r.ersetzt_durch ?? null,
      korrektur_von: r.korrektur_von ?? null,
      korrektur_art: r.korrektur_art ?? null,
      richtung,
      handwerker_id: r.handwerker_id?.trim() || null,
      handwerker_name: hwName,
      angebot_handwerker_id: r.angebot_handwerker_id?.trim() || null,
    }
  })

  const ausgehendAll = rechnungenAll.filter((r) => r.richtung !== 'eingehend')
  const eingehendAll = rechnungenAll.filter((r) => r.richtung === 'eingehend')

  const rechnungenNorm = ausgehendAll.filter(
    (r): r is RechnungNorm & { lead_id: string } => Boolean(r.lead_id)
  )
  const standaloneRechnungen = ausgehendAll.filter((r) => !r.lead_id)

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

  const rows: VorgangListeRow[] = []

  for (const lead of leads) {
    const kundeName = leadKontaktAnzeigeName(lead, '') || null
    const kundeId = leadVertragsKundeId(lead)

    const leadAngebote = (angeboteByLead.get(lead.id) ?? []).map((a) => ({
      id: a.id,
      status: a.status,
      status_einfach: a.status_einfach,
      gesendet_am: a.gesendet_am,
      gesendet_kunde_at: a.gesendet_kunde_at,
      created_at: a.created_at,
      updated_at: a.updated_at,
      leistungsumfang: a.leistungsumfang,
      notizen: a.notizen,
      ist_wiederkehrend: a.ist_wiederkehrend,
      wiederkehr_turnus: a.wiederkehr_turnus,
    }))
    const leadAuftraege = (auftraegeByLead.get(lead.id) ?? []).map((a) => ({
      id: a.id,
      status: a.status,
      titel: a.titel,
      created_at: a.created_at,
      updated_at: a.updated_at,
      handwerkerAktionOffen: hwAktionByAuftrag.get(a.id) ?? false,
      ist_wiederkehrend: a.ist_wiederkehrend,
      wiederkehr_turnus: a.wiederkehr_turnus,
    }))
    const leadRechnungen = (rechnungenByLead.get(lead.id) ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      faellig: r.faellig,
      created_at: r.created_at,
      updated_at: r.updated_at,
      rechnung_art: r.rechnung_art,
      abschlag_index: r.abschlag_index,
      rechnungsnummer: r.rechnungsnummer,
      brutto: r.brutto,
      ist_wiederkehrend: r.ist_wiederkehrend,
      wiederkehr_turnus: r.wiederkehr_turnus,
    }))

    const resolveInput = {
      lead: {
        id: lead.id,
        status: lead.status,
        situation: lead.situation,
        funnel_daten: lead.funnel_daten,
        kanal: lead.kanal,
        org_freigabe_status: lead.org_freigabe_status,
        hv_meldung_status: lead.hv_meldung_status,
        freigabe_bypass_grund: lead.freigabe_bypass_grund,
        erfassung_von: lead.erfassung_von,
        anlass: lead.anlass,
        kontakt_name: lead.kontakt_name,
        plz: lead.plz,
        bereiche: lead.bereiche,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        ist_wiederkehrend: lead.ist_wiederkehrend,
        wiederkehr_turnus: lead.wiederkehr_turnus,
      },
      angebote: leadAngebote,
      auftraege: leadAuftraege,
      rechnungen: leadRechnungen,
    }

    const resolved = resolveVorgang(resolveInput)
    const wiederkehr = resolveListeWiederkehr({
      phase: resolved.phase,
      entityId: resolved.entityId,
      lead: resolveInput.lead,
      angebote: leadAngebote,
      auftraege: leadAuftraege,
      rechnungen: leadRechnungen,
    })

    const handwerkerIds = Array.from(
      new Set(
        (auftraegeByLead.get(lead.id) ?? []).flatMap((a) =>
          (positionenByAuftrag.get(a.id) ?? [])
            .map((p) => p.handwerker_id)
            .filter((id): id is string => Boolean(id?.trim()))
        )
      )
    )

    const wertLabelForRechnung = (rechnungId: string | null): string | null => {
      if (!rechnungId) return null
      const rechnung = leadRechnungen.find((r) => r.id === rechnungId)
      if (rechnung?.brutto == null) return null
      return `${Math.round(Number(rechnung.brutto)).toLocaleString('de-DE')} €`
    }

    const leadListenSummeEuro = computeLeadListenSummeEuro({
      lead,
      angebote: angeboteByLead.get(lead.id) ?? [],
      auftraege: auftraegeByLead.get(lead.id) ?? [],
      rechnungen: leadRechnungen,
    })

    const wertLabelForPhase = (phase: VorgangPhase, entityId: string): string | null => {
      if (phase === 'anfrage') {
        const label = resolveLeadPreisAnzeige(
          lead.kanal,
          lead.budget_ca,
          lead.preis_min,
          lead.preis_max,
          lead.funnel_daten
        )
        return label === '—' ? null : label
      }
      if (phase === 'rechnung') return wertLabelForRechnung(entityId)
      if (phase === 'angebot') {
        const ang = (angeboteByLead.get(lead.id) ?? []).find((a) => a.id === entityId)
        return angebotBetragLabel(ang)
      }
      if (phase === 'auftrag') {
        const auf = (auftraegeByLead.get(lead.id) ?? []).find((a) => a.id === entityId)
        const leadAngs = angeboteByLead.get(lead.id) ?? []
        const linked = auf?.angebot_id
          ? leadAngs.find((a) => a.id === auf.angebot_id)
          : null
        if (linked) return angebotBetragLabel(linked)
        // Fallback: neuestes Angebot mit Betrag
        for (const a of leadAngs) {
          const label = angebotBetragLabel(a)
          if (label) return label
        }
        return null
      }
      return null
    }

    // Abgeschlossener Auftrag ohne Voll-/Schlussrechnung → Rechnung/Offen
    // („Offen“). Reine Abschläge gewinnen die Phase nicht (isPhaseWinningRechnung).
    // Bei aktivem Abschlagsplan: keinen synthetischen Gesamt-Vorgang — nur gestellte Abschläge.
    const leadAngRaw = angeboteByLead.get(lead.id) ?? []
    const hatAbschlagsplan = leadAngRaw.some((a) =>
      hatAktivenAbschlagsplan(parseZahlungsplan(a.zahlungsplan))
    )

    const rechnungAusstehend =
      !hatAbschlagsplan &&
      resolved.phase === 'auftrag' &&
      resolved.unterstatus === 'abgeschlossen' &&
      !leadRechnungen.some(isPhaseWinningRechnung)

    const listPhase: VorgangPhase = rechnungAusstehend ? 'rechnung' : resolved.phase
    const listUnterstatus = rechnungAusstehend ? 'ausstehend' : resolved.unterstatus
    const listUnterstatusLabel =
      resolved.badges.wartet_freigabe
        ? resolved.unterstatusLabel
        : rechnungAusstehend
          ? unterstatusLabel('rechnung', 'ausstehend')
          : resolved.unterstatusLabel
    const listEntityType: VorgangPhase = rechnungAusstehend ? 'auftrag' : resolved.entityType
    const listDetailHref = rechnungAusstehend
      ? `/auftraege/${resolved.entityId}`
      : detailHrefForPhase(resolved.phase, resolved.entityId, lead.id)

    rows.push({
      ...resolved,
      phase: listPhase,
      unterstatus: listUnterstatus,
      unterstatusLabel: listUnterstatusLabel,
      needsAction: rechnungAusstehend ? true : resolved.needsAction,
      entityType: listEntityType,
      leadId: lead.id,
      kundeId,
      kundeName,
      wertLabel: wertLabelForPhase(resolved.phase, resolved.entityId),
      listenSummeEuro: leadListenSummeEuro,
      listeSummeZaehlen: true,
      detailHref: listDetailHref,
      handwerkerIds,
      ist_wiederkehrend: wiederkehr.ist_wiederkehrend,
      wiederkehr_turnus: wiederkehr.wiederkehr_turnus,
      kontaktTelefon: lead.kontakt_telefon ?? null,
      kontaktEmail: lead.kontakt_email ?? null,
      ersetzt_durch:
        resolved.phase === 'angebot'
          ? (angeboteByLead.get(lead.id) ?? []).find((a) => a.id === resolved.entityId)
              ?.ersetzt_durch ?? null
          : listPhase === 'rechnung' && !rechnungAusstehend
            ? (rechnungenByLead.get(lead.id) ?? []).find((r) => r.id === resolved.entityId)
                ?.ersetzt_durch ?? null
            : null,
      korrektur_von:
        listPhase === 'rechnung' && !rechnungAusstehend
          ? (rechnungenByLead.get(lead.id) ?? []).find((r) => r.id === resolved.entityId)
              ?.korrektur_von ?? null
          : null,
      korrektur_art:
        listPhase === 'rechnung' && !rechnungAusstehend
          ? (rechnungenByLead.get(lead.id) ?? []).find((r) => r.id === resolved.entityId)
              ?.korrektur_art ?? null
          : null,
    })

    // Abschläge als eigene Zeilen (auch wenn Stamm als „Rechnung ausstehend“ läuft).
    // Nach Voll-/Schlussrechnung: weitere Rechnungen als Satelliten.
    // Bei Abschlagsplan: nur gestellte Abschlag-/Schlussrechnungen (keine Entwürfe, kein Gesamt).
    const showSatelliten =
      resolved.phase === 'rechnung' ||
      resolved.phase === 'auftrag' ||
      rechnungAusstehend
    if (showSatelliten) {
      for (const r of leadRechnungen) {
        if (r.status === 'storniert' || r.status === 'entwurf') continue
        if (resolved.entityId === r.id) continue
        const art = (r.rechnung_art ?? 'voll').trim().toLowerCase()
        if (hatAbschlagsplan) {
          if (art !== 'abschlag' && art !== 'schluss') continue
          if (!istRechnungGestelltOderBezahlt(r.status)) continue
        } else if (resolved.phase === 'auftrag' || rechnungAusstehend) {
          // Bei Auftrag-Stamm / ausstehender Endabrechnung nur Abschläge als Satelliten
          if (art !== 'abschlag') continue
        }
        const sat: ResolvedVorgang = resolveSatellitenRechnungVorgang(resolveInput, r)
        const satWieder = resolveListeWiederkehr({
          phase: 'rechnung',
          entityId: r.id,
          lead: resolveInput.lead,
          angebote: leadAngebote,
          auftraege: leadAuftraege,
          rechnungen: leadRechnungen,
        })
        rows.push({
          ...sat,
          leadId: lead.id,
          kundeId,
          kundeName,
          wertLabel: wertLabelForRechnung(r.id),
          listenSummeEuro: leadListenSummeEuro,
          listeSummeZaehlen: false,
          detailHref: detailHrefForPhase('rechnung', r.id, lead.id),
          handwerkerIds,
          ist_wiederkehrend: satWieder.ist_wiederkehrend,
          wiederkehr_turnus: satWieder.wiederkehr_turnus,
        })
      }
    }
  }

  for (const r of standaloneRechnungen) {
    if (r.status === 'storniert') continue
    const nr = r.rechnungsnummer?.trim()
    const titel = nr
      ? `Rechnung ${nr}`
      : r.kunde_name?.trim() || 'Direktrechnung'
    const resolved = resolveStandaloneDirektrechnung({
      rechnung: {
        id: r.id,
        status: r.status,
        faellig: r.faellig,
        created_at: r.created_at,
        updated_at: r.updated_at,
        rechnung_art: r.rechnung_art ?? 'voll',
        abschlag_index: r.abschlag_index,
        rechnungsnummer: r.rechnungsnummer,
        brutto: r.brutto,
        ist_wiederkehrend: r.ist_wiederkehrend,
        wiederkehr_turnus: r.wiederkehr_turnus,
      },
      titel,
      kundeName: r.kunde_name,
    })
    const wertLabel =
      r.brutto == null
        ? null
        : `${Math.round(Number(r.brutto)).toLocaleString('de-DE')} €`
    const listenSummeEuro =
      r.brutto == null ? null : Math.round(Number(r.brutto))
    rows.push({
      ...resolved,
      titel,
      unterstatusLabel: unterstatusLabel('rechnung', resolved.unterstatus),
      kanalMeta: 'Direktkunde',
      leadId: '',
      kundeId: r.kunde_id,
      kundeName: r.kunde_name,
      wertLabel,
      listenSummeEuro,
      listeSummeZaehlen: true,
      detailHref: detailHrefForPhase('rechnung', r.id, ''),
      handwerkerIds: [],
      ist_wiederkehrend: Boolean(r.ist_wiederkehrend),
      wiederkehr_turnus: r.wiederkehr_turnus ?? null,
      standalone: true,
      ersetzt_durch: r.ersetzt_durch ?? null,
      korrektur_von: r.korrektur_von ?? null,
      korrektur_art: r.korrektur_art ?? null,
      rechnungRichtung: 'ausgehend',
    })
  }

  for (const r of eingehendAll) {
    if (r.status === 'storniert' && false) {
      /* storniert = abgelehnt — weiter anzeigen */
    }
    const nr = r.rechnungsnummer?.trim()
    const partner = r.handwerker_name?.trim() || 'Partner'
    const titel = nr
      ? `Eingangsrechnung ${nr}`
      : `Eingangsrechnung · ${partner}`
    const unter =
      r.status === 'bezahlt'
        ? 'bezahlt'
        : r.status === 'storniert'
          ? 'storniert'
          : 'gesendet'
    const wertLabel =
      r.brutto == null
        ? null
        : `${Math.round(Number(r.brutto)).toLocaleString('de-DE')} €`
    const listenSummeEuro =
      r.brutto == null ? null : Math.round(Number(r.brutto))
    rows.push({
      phase: 'rechnung',
      unterstatus: unter,
      unterstatusLabel:
        unter === 'bezahlt'
          ? 'Überwiesen'
          : unter === 'storniert'
            ? 'Abgelehnt'
            : 'Offen',
      needsAction: unter === 'gesendet',
      actor: unter === 'gesendet' ? 'bw' : null,
      badges: {},
      ueberfaellig: false,
      kanalMeta: 'Eingehend · Partner',
      titel,
      entityId: r.id,
      entityType: 'rechnung',
      updatedAt: r.updated_at ?? r.created_at,
      leadId: r.lead_id ?? '',
      kundeId: r.kunde_id,
      kundeName: r.handwerker_name || r.kunde_name,
      wertLabel,
      listenSummeEuro,
      listeSummeZaehlen: true,
      detailHref: detailHrefForPhase('rechnung', r.id, r.lead_id ?? ''),
      handwerkerIds: r.handwerker_id ? [r.handwerker_id] : [],
      ist_wiederkehrend: false,
      wiederkehr_turnus: null,
      standalone: !r.lead_id,
      ersetzt_durch: r.ersetzt_durch ?? null,
      rechnungRichtung: 'eingehend',
      angebotHandwerkerId: r.angebot_handwerker_id,
    })
  }

  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return { rows, error: null }
}

function angebotBetragLabel(
  ang:
    | {
        gesamt_fix?: number | null
        gesamt_min?: number | null
        gesamt_max?: number | null
      }
    | null
    | undefined
): string | null {
  if (!ang) return null
  const label = betragAnzeigeBrutto(ang.gesamt_fix, ang.gesamt_min, ang.gesamt_max)
  return label === '—' ? null : label
}

function euroFromAngebotRow(
  ang:
    | {
        gesamt_fix?: number | null
        gesamt_min?: number | null
        gesamt_max?: number | null
      }
    | null
    | undefined
): number | null {
  return parseVorgangWertLabelEuro(angebotBetragLabel(ang))
}

function computeLeadListenSummeEuro(input: {
  lead: {
    kanal: LeadKanal
    budget_ca: number | null
    preis_min: number | null
    preis_max: number | null
    funnel_daten: unknown
  }
  angebote: Array<{
    id: string
    status: string
    status_einfach: string | null
    gesamt_fix: number | null
    gesamt_min: number | null
    gesamt_max: number | null
  }>
  auftraege: Array<{
    id: string
    status: string
    angebot_id: string | null
  }>
  rechnungen: Array<{
    id: string
    status: string
    rechnung_art?: string | null
    brutto?: number | null
    created_at: string
    updated_at?: string | null
  }>
}): number | null {
  for (const auf of input.auftraege) {
    if (auf.status === 'storniert') continue
    const linked = auf.angebot_id
      ? input.angebote.find((a) => a.id === auf.angebot_id)
      : null
    let euro = euroFromAngebotRow(linked)
    if (euro == null) {
      for (const ang of input.angebote) {
        euro = euroFromAngebotRow(ang)
        if (euro != null) break
      }
    }
    if (euro != null) return euro
  }

  for (const ang of input.angebote) {
    const st = mapAngebotStatusEinfach({ ...ang, created_at: '' })
    if (st === 'abgelehnt' || st === 'ersetzt' || st === 'storniert') continue
    const euro = euroFromAngebotRow(ang)
    if (euro != null) return euro
  }

  const winning = input.rechnungen.filter(isPhaseWinningRechnung)
  if (winning.length) {
    const newest = [...winning].sort((a, b) =>
      (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at)
    )[0]
    const brutto = Number(newest?.brutto)
    if (Number.isFinite(brutto) && brutto > 0) return Math.round(brutto)
  }

  const label = resolveLeadPreisAnzeige(
    input.lead.kanal,
    input.lead.budget_ca,
    input.lead.preis_min,
    input.lead.preis_max,
    input.lead.funnel_daten
  )
  return parseVorgangWertLabelEuro(label === '—' ? null : label)
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

/** Stift-Icon in der Liste: Leistungen — Ausnahme Angebot → direkt Bearbeiten (Wizard). */
export function bearbeitenHrefForPhase(
  phase: VorgangPhase,
  entityId: string,
  leadId: string
): string {
  switch (phase) {
    case 'anfrage':
      return `/anfragen/${leadId}?tab=leistungen`
    case 'angebot':
      return `/angebote/${entityId}?bearbeiten=1`
    case 'auftrag':
      return `/auftraege/${entityId}?tab=leistungen`
    case 'rechnung':
      return `/rechnungen/${entityId}?tab=leistungen`
    default:
      return `/anfragen/${leadId}?tab=leistungen`
  }
}
