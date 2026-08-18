import type { SupabaseClient } from '@supabase/supabase-js'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import { leadVertragsKundeId } from '@/lib/lead-display-helpers'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { situationBereichTitel } from '@/lib/vorgang/vorgang-anzeige-titel'
import type {
  ProjektAngebotKurz,
  ProjektKetteKind,
  ProjektKontext,
  ProjektRechnungKurz,
} from '@/lib/crm/projekt-kontext-types'
import { filterKundenAngebote } from '@/lib/angebote/partner-einholung'

type LoadProjektKontextInput = {
  activeKind: ProjektKetteKind
  activeId: string
  leadId?: string | null
  kundeId?: string | null
  angebotId?: string | null
  auftragId?: string | null
  rechnungId?: string | null
}

const ANGEBOT_KURZ_SELECT =
  'id, angebotsnr, status, status_einfach, gueltig_bis, created_at, gesamt_fix, gesamt_min, gesamt_max, pdf_url, ist_partner_einholung'

const RECHNUNG_KURZ_SELECT =
  'id, rechnungsnummer, status, brutto, rechnungsdatum, auftrag_id, rechnung_art, abschlag_index, beleg_typ, pdf_url, gesendet_at, created_at'

const AUFTRAG_KURZ_SELECT =
  'id, titel, status, created_at, abnahme_protokoll_url, abschlussdokumentation_url, abschlussdokumentation_gesendet_at'

function leadLabel(row: {
  situation?: string | null
  bereiche?: string[] | null
  id: string
}): string {
  return (
    situationBereichTitel(row.situation, bereicheFuerAnzeige(row.bereiche, row.situation)) ||
    `Anfrage ${row.id.slice(0, 8).toUpperCase()}`
  )
}

/**
 * Pipeline-Kontext für Phasen-UI.
 * IDs sequentiell auflösen (Abhängigkeiten), Entity-Reads parallel.
 */
export async function loadProjektKontext(
  supabase: SupabaseClient,
  input: LoadProjektKontextInput
): Promise<ProjektKontext> {
  let leadId = input.leadId?.trim() || null
  let kundeId = input.kundeId?.trim() || null
  let angebotId = input.angebotId?.trim() || null
  let auftragId = input.auftragId?.trim() || null
  const rechnungId = input.rechnungId?.trim() || null

  // ── Phase 1: fehlende IDs auflösen (nur nötige Schritte) ──
  if (rechnungId && (!leadId || !kundeId || !auftragId || !angebotId)) {
    const { data: rec } = await supabase
      .from('rechnungen')
      .select('id, kunde_id, auftrag_id, angebot_id')
      .eq('id', rechnungId)
      .maybeSingle()
    if (rec) {
      kundeId = kundeId ?? (rec.kunde_id as string | null)
      auftragId = auftragId ?? (rec.auftrag_id as string | null)
      angebotId = angebotId ?? (rec.angebot_id as string | null)
    }
  }

  if (auftragId && (!leadId || !kundeId || !angebotId)) {
    const { data: auf } = await supabase
      .from('auftraege')
      .select('lead_id, kunde_id, angebot_id')
      .eq('id', auftragId)
      .maybeSingle()
    if (auf) {
      leadId = leadId ?? (auf.lead_id as string | null)
      kundeId = kundeId ?? (auf.kunde_id as string | null)
      angebotId = angebotId ?? (auf.angebot_id as string | null)
    }
  }

  if (angebotId && (!leadId || !kundeId)) {
    const { data: ang } = await supabase
      .from('angebote')
      .select('lead_id, kunde_id')
      .eq('id', angebotId)
      .maybeSingle()
    if (ang) {
      leadId = leadId ?? (ang.lead_id as string | null)
      kundeId = kundeId ?? (ang.kunde_id as string | null)
    }
  }

  if (leadId && !kundeId) {
    const { data: leadRow } = await supabase
      .from('leads')
      .select('kunde_id, auftraggeber_kunde_id')
      .eq('id', leadId)
      .maybeSingle()
    kundeId = leadVertragsKundeId(leadRow ?? {}) ?? null
  }

  // ── Phase 2: Entity-Reads parallel ──
  const [kundeRes, leadRes, angeboteRes, auftragRes] = await Promise.all([
    kundeId
      ? supabase
          .from('kunden')
          .select('id, name, vorname, nachname, typ')
          .eq('id', kundeId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    leadId
      ? supabase
          .from('leads')
          .select('id, status, situation, bereiche, org_freigabe_status, created_at')
          .eq('id', leadId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    leadId
      ? supabase
          .from('angebote')
          .select(ANGEBOT_KURZ_SELECT)
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
      : kundeId
        ? supabase
            .from('angebote')
            .select(ANGEBOT_KURZ_SELECT)
            .eq('kunde_id', kundeId)
            .order('created_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
    auftragId
      ? supabase.from('auftraege').select(AUFTRAG_KURZ_SELECT).eq('id', auftragId).maybeSingle()
      : leadId
        ? supabase
            .from('auftraege')
            .select(AUFTRAG_KURZ_SELECT)
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : angebotId
          ? supabase
              .from('auftraege')
              .select(AUFTRAG_KURZ_SELECT)
              .eq('angebot_id', angebotId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
  ])

  let kunde: ProjektKontext['kunde'] = null
  if (kundeRes.data) {
    const kRow = kundeRes.data
    kunde = {
      id: kRow.id as string,
      name: kundeDisplayName(kRow as Parameters<typeof kundeDisplayName>[0]),
    }
  }

  let lead: ProjektKontext['lead'] = null
  if (leadRes.data) {
    const lRow = leadRes.data
    lead = {
      id: lRow.id as string,
      label: leadLabel(lRow as { situation?: string | null; bereiche?: string[] | null; id: string }),
      status: String(lRow.status ?? ''),
      org_freigabe_status: (lRow.org_freigabe_status as string | null) ?? null,
      created_at: (lRow.created_at as string | null) ?? null,
    }
  }

  const angebote = filterKundenAngebote(
    (angeboteRes.data ?? []) as (ProjektAngebotKurz & { ist_partner_einholung?: boolean | null })[]
  )

  let auftrag: ProjektKontext['auftrag'] = null
  if (auftragRes.data) {
    const aRow = auftragRes.data
    auftragId = aRow.id as string
    auftrag = {
      id: aRow.id as string,
      titel: (aRow.titel as string | null) ?? null,
      status: String(aRow.status ?? ''),
      created_at: (aRow.created_at as string | null) ?? null,
      abnahme_protokoll_url: (aRow.abnahme_protokoll_url as string | null) ?? null,
      abschlussdokumentation_url: (aRow.abschlussdokumentation_url as string | null) ?? null,
      abschlussdokumentation_gesendet_at:
        (aRow.abschlussdokumentation_gesendet_at as string | null) ?? null,
    }
  }

  // ── Phase 3: Rechnungen (braucht ggf. aufgelöste auftragId) ──
  let rechnungen: ProjektRechnungKurz[] = []
  if (auftragId) {
    const { data: recRows } = await supabase
      .from('rechnungen')
      .select(RECHNUNG_KURZ_SELECT)
      .eq('auftrag_id', auftragId)
      .order('rechnungsdatum', { ascending: false })
    rechnungen = (recRows ?? []) as ProjektRechnungKurz[]
  } else if (angebotId) {
    const { data: recRows } = await supabase
      .from('rechnungen')
      .select(RECHNUNG_KURZ_SELECT)
      .eq('angebot_id', angebotId)
      .order('rechnungsdatum', { ascending: false })
    rechnungen = (recRows ?? []) as ProjektRechnungKurz[]
  }

  return {
    kunde,
    lead,
    angebote,
    auftrag,
    rechnungen,
    activeKind: input.activeKind,
    activeId: input.activeId,
  }
}
