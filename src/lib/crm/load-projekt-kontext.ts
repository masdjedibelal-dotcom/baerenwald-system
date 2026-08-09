import type { SupabaseClient } from '@supabase/supabase-js'
import { BEREICH_LABELS } from '@/lib/utils'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type {
  ProjektAngebotKurz,
  ProjektKetteKind,
  ProjektKontext,
  ProjektRechnungKurz,
} from '@/lib/crm/projekt-kontext-types'

type LoadProjektKontextInput = {
  activeKind: ProjektKetteKind
  activeId: string
  leadId?: string | null
  kundeId?: string | null
  angebotId?: string | null
  auftragId?: string | null
  rechnungId?: string | null
}

function leadLabel(row: {
  situation?: string | null
  bereiche?: string[] | null
  id: string
}): string {
  const bereiche = bereicheFuerAnzeige(row.bereiche, row.situation)
  if (bereiche.length) {
    return bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
  }
  const sit = leadSituationDisplay(row.situation)
  if (sit) return sit
  return `Anfrage ${row.id.slice(0, 8).toUpperCase()}`
}

export async function loadProjektKontext(
  supabase: SupabaseClient,
  input: LoadProjektKontextInput
): Promise<ProjektKontext> {
  let leadId = input.leadId?.trim() || null
  let kundeId = input.kundeId?.trim() || null
  let angebotId = input.angebotId?.trim() || null
  let auftragId = input.auftragId?.trim() || null
  const rechnungId = input.rechnungId?.trim() || null

  if (rechnungId && (!leadId || !kundeId || !auftragId)) {
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

  if (auftragId && !leadId) {
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
      .select('kunde_id')
      .eq('id', leadId)
      .maybeSingle()
    kundeId = (leadRow?.kunde_id as string | null) ?? null
  }

  let kunde: ProjektKontext['kunde'] = null
  if (kundeId) {
    const { data: kRow } = await supabase
      .from('kunden')
      .select('id, name, vorname, nachname, typ')
      .eq('id', kundeId)
      .maybeSingle()
    if (kRow) {
      kunde = { id: kRow.id as string, name: kundeDisplayName(kRow as Parameters<typeof kundeDisplayName>[0]) }
    }
  }

  let lead: ProjektKontext['lead'] = null
  if (leadId) {
    const { data: lRow } = await supabase
      .from('leads')
      .select('id, status, situation, bereiche')
      .eq('id', leadId)
      .maybeSingle()
    if (lRow) {
      lead = {
        id: lRow.id as string,
        label: leadLabel(lRow as { situation?: string | null; bereiche?: string[] | null; id: string }),
        status: String(lRow.status ?? ''),
      }
    }
  }

  let angebote: ProjektAngebotKurz[] = []
  if (leadId) {
    const { data: angRows } = await supabase
      .from('angebote')
      .select(
        'id, angebotsnr, status, status_einfach, gueltig_bis, created_at, gesamt_fix, gesamt_min, gesamt_max'
      )
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
    angebote = (angRows ?? []) as ProjektAngebotKurz[]
  } else if (kundeId) {
    const { data: angRows } = await supabase
      .from('angebote')
      .select(
        'id, angebotsnr, status, status_einfach, gueltig_bis, created_at, gesamt_fix, gesamt_min, gesamt_max'
      )
      .eq('kunde_id', kundeId)
      .order('created_at', { ascending: false })
      .limit(20)
    angebote = (angRows ?? []) as ProjektAngebotKurz[]
  }

  let auftrag: ProjektKontext['auftrag'] = null
  if (auftragId) {
    const { data: aRow } = await supabase
      .from('auftraege')
      .select('id, titel, status')
      .eq('id', auftragId)
      .maybeSingle()
    if (aRow) {
      auftrag = {
        id: aRow.id as string,
        titel: (aRow.titel as string | null) ?? null,
        status: String(aRow.status ?? ''),
      }
    }
  } else if (leadId) {
    const { data: aRow } = await supabase
      .from('auftraege')
      .select('id, titel, status')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (aRow) {
      auftragId = aRow.id as string
      auftrag = {
        id: aRow.id as string,
        titel: (aRow.titel as string | null) ?? null,
        status: String(aRow.status ?? ''),
      }
    }
  } else if (angebotId) {
    const { data: aRow } = await supabase
      .from('auftraege')
      .select('id, titel, status')
      .eq('angebot_id', angebotId)
      .maybeSingle()
    if (aRow) {
      auftragId = aRow.id as string
      auftrag = {
        id: aRow.id as string,
        titel: (aRow.titel as string | null) ?? null,
        status: String(aRow.status ?? ''),
      }
    }
  }

  let rechnungen: ProjektRechnungKurz[] = []
  if (auftragId) {
    const { data: recRows } = await supabase
      .from('rechnungen')
      .select('id, rechnungsnummer, status, brutto, rechnungsdatum, auftrag_id')
      .eq('auftrag_id', auftragId)
      .order('rechnungsdatum', { ascending: false })
    rechnungen = (recRows ?? []) as ProjektRechnungKurz[]
  } else if (angebotId) {
    const { data: recRows } = await supabase
      .from('rechnungen')
      .select('id, rechnungsnummer, status, brutto, rechnungsdatum, auftrag_id')
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
