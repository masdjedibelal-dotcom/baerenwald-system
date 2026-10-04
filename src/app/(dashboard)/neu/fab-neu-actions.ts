'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { createAnfrage } from '@/app/(dashboard)/anfragen/actions'
import { createClient } from '@/lib/supabase-server'
import { planLeadStatusWrite } from '@/lib/status/write-lead-status'
import { kundeDisplayName,istKundeHausverwaltungTyp } from '@/lib/kunde-stammdaten'
import type { LeadKanal } from '@/lib/types'

/** Gewerke für FAB-Handwerker-Create (Overlay-Host). */
export async function listGewerkeFuerFab(): Promise<
  { ok: true; gewerke: { id: string; name: string; slug: string }[] } | { ok: false; message: string }
> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gewerke')
    .select('id, name, slug')
    .eq('aktiv', true)
    .order('sort_order')
    .order('name')
  if (error) logDbError('app/neu/fab-neu-actions:gewerke', error)
  if (error) return { ok: false, message: error.message }
  return {
    ok: true,
    gewerke: (data ?? []).map((g) => ({
      id: String(g.id),
      name: String(g.name),
      slug: String(g.slug),
    })),
  }
}

/**
 * Nur FAB / Direkt-Angebot ohne bestehende Anfrage (`deferredLeadCreate`).
 * Normale Angebote aus einer Anfrage nutzen den bestehenden Lead — hier nicht aufrufen.
 *
 * Immer neuer Lead-Träger (kein Reuse, auch nicht soft-gelöscht).
 * Status sofort `angebot` → nicht in Anfragen-Liste, sichtbar in Vorgängen.
 * Direkt-Rechnung braucht keinen Lead (Standalone in Vorgängen).
 */
export async function createAnfrageFuerKunde(
  kundeId: string,
  opts?: {
    kanal?: LeadKanal
    melder_name?: string | null
    melder_email?: string | null
    melder_telefon?: string | null
    melder_einheit?: string | null
    kunde_objekt_id?: string | null
    objekt_anlage_id?: string | null
  }
): Promise<{ ok: true; leadId: string } | { ok: false; message: string }> {
  const id = kundeId.trim()
  if (!id) return { ok: false, message: 'Bitte einen Kunden wählen.' }

  const supabase = createClient()
  const { data: kunde, error } = await supabase
    .from('kunden')
    .select(
      'id, name, vorname, nachname, email, telefon, plz, ort, strasse, hausnummer, typ'
    )
    .eq('id', id)
    .maybeSingle()
  if (error) logDbError('app/neu/fab-neu-actions:kunden', error)

  if (error || !kunde) return { ok: false, message: error?.message ?? 'Kunde nicht gefunden.' }

  const name = kundeDisplayName(kunde)
  const email = (kunde.email as string | null)?.trim() || ''
  const telefon = (kunde.telefon as string | null)?.trim() || ''
  if (!email && !telefon) {
    return {
      ok: false,
      message: 'Kunde braucht E-Mail oder Telefon, damit eine Anfrage angelegt werden kann.',
    }
  }

  const istHv = istKundeHausverwaltungTyp(kunde.typ as string | null)

  const r = await createAnfrage({
    kunde_id: id,
    name,
    vorname: (kunde.vorname as string | null) ?? null,
    nachname: (kunde.nachname as string | null) ?? null,
    email,
    telefon,
    plz: (kunde.plz as string | null)?.trim() || '',
    ort: (kunde.ort as string | null) ?? null,
    strasse: (kunde.strasse as string | null) ?? null,
    hausnummer: (kunde.hausnummer as string | null) ?? null,
    kanal: opts?.kanal ?? (istHv ? 'hv_manuell' : 'sonstiges'),
    situation: '',
    bereiche: [],
    kundentyp: (kunde.typ as string | null) ?? 'privat',
    notizen: '',
    bestaetigungsmail_senden: false,
    auftraggeber_kunde_id: istHv ? id : null,
    anlass: istHv ? 'meldung' : 'projekt',
    melder_name: opts?.melder_name ?? null,
    melder_email: opts?.melder_email ?? null,
    melder_telefon: opts?.melder_telefon ?? null,
    melder_einheit: opts?.melder_einheit ?? null,
    kunde_objekt_id: opts?.kunde_objekt_id ?? null,
    objekt_anlage_id: opts?.objekt_anlage_id ?? null,
    funnel_daten: {
      quelle: 'crm_direkt_angebot',
      direkt_dokument: 'angebot',
    },
  })

  if (!r?.ok) {
    return {
      ok: false,
      message:
        r && 'message' in r && r.message
          ? r.message
          : 'Anfrage konnte nicht angelegt werden.',
    }
  }

  // Sofort aus Anfragen-Pipeline nehmen (Status vor Angebot = neu/kontaktiert/termin).
  const { error: statusErr } = await supabase
    .from('leads')
    .update(planLeadStatusWrite('angebot'))
    .eq('id', r.id)
    .is('geloescht_am', null)
  if (statusErr) logDbError('app/neu/fab-neu-actions:leads', statusErr)

  if (statusErr) {
    console.warn('[createAnfrageFuerKunde] status→angebot:', statusErr.message)
  } else {
    const { error: __dbErr1 } = await supabase.from('leads_status_history').insert({
      lead_id: r.id,
      status_alt: 'neu',
      status_neu: 'angebot',
      user_id: null,
      notiz: 'Direkt-Angebot — Lead nur als Vorgangsträger (nicht in Anfragen).',
    })
    if (__dbErr1) logDbError('app/neu/fab-neu-actions:leads_status_history', __dbErr1)
  }

  return { ok: true, leadId: r.id }
}

/**
 * Direkt-Angebot abgebrochen: Lead-Träger ohne gespeichertes Angebot soft-löschen.
 * Nur `crm_direkt_angebot` — normale Anfragen bleiben unberührt.
 */
export async function discardOrphanDirektAngebotLead(
  leadId: string
): Promise<{ ok: true; discarded: boolean } | { ok: false; message: string }> {
  const id = leadId.trim()
  if (!id) return { ok: true, discarded: false }

  const supabase = createClient()
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, funnel_daten, geloescht_am')
    .eq('id', id)
    .maybeSingle()
  if (error) logDbError('app/neu/fab-neu-actions:leads', error)

  if (error) return { ok: false, message: error.message }
  if (!lead?.id) return { ok: true, discarded: false }
  if ((lead as { geloescht_am?: string | null }).geloescht_am) {
    return { ok: true, discarded: false }
  }

  const funnel = (lead as { funnel_daten?: unknown }).funnel_daten
  const quelle =
    funnel && typeof funnel === 'object' && !Array.isArray(funnel)
      ? String((funnel as { quelle?: unknown }).quelle ?? '')
      : ''
  if (quelle !== 'crm_direkt_angebot') {
    return { ok: true, discarded: false }
  }

  const { data: angs, error: angErr } = await supabase
    .from('angebote')
    .select('id')
    .eq('lead_id', id)
    .limit(1)
  if (angErr) logDbError('app/neu/fab-neu-actions:angebote', angErr)

  if (angErr) return { ok: false, message: angErr.message }
  if ((angs ?? []).length > 0) {
    return { ok: true, discarded: false }
  }

  const { softDeleteLeadForPortal } = await import('@/lib/portal/soft-delete-lead')
  const del = await softDeleteLeadForPortal({ leadId: id })
  if (!del.ok) return del
  return { ok: true, discarded: true }
}
