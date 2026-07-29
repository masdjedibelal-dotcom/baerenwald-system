'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createAnfrage } from '@/app/(dashboard)/anfragen/actions'
import { createClient } from '@/lib/supabase-server'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { LeadKanal } from '@/lib/types'

export type FabKundeAuftragZeile = {
  id: string
  titel: string | null
  status: string
  created_at: string
}

/** Gewerke für FAB-Handwerker-Create (Overlay-Host). */
export async function listGewerkeFuerFab(): Promise<
  { ok: true; gewerke: { id: string; name: string; slug: string }[] } | { ok: false; message: string }
> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gewerke')
    .select('id, name, slug')
    .eq('aktiv', true)
    .order('name')
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

/** Aufträge eines Kunden für optionale Verknüpfung (z. B. Rechnung).
 * Keine stornierten/abgeschlossenen und keine Geister ohne bestehenden Lead. */
export async function listAuftraegeFuerKunde(
  kundeId: string
): Promise<{ ok: true; auftraege: FabKundeAuftragZeile[] } | { ok: false; message: string }> {
  const id = kundeId.trim()
  if (!id) return { ok: false, message: 'Kunde fehlt.' }
  const supabase = createClient()

  // Nur offene Vorgänge mit existierendem Lead (keine gelöschten / abgeschlossenen Geister).
  const { data, error } = await supabase
    .from('auftraege')
    .select('id, titel, status, created_at, lead_id, leads!inner(id)')
    .eq('kunde_id', id)
    .neq('status', 'abgeschlossen')
    .neq('status', 'storniert')
    .not('lead_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) {
    // Fallback ohne Join, falls FK-Embed fehlt — dann manuell filtern.
    const fallback = await supabase
      .from('auftraege')
      .select('id, titel, status, created_at, lead_id')
      .eq('kunde_id', id)
      .neq('status', 'abgeschlossen')
      .neq('status', 'storniert')
      .not('lead_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(40)

    if (fallback.error) return { ok: false, message: fallback.error.message }

    const leadIds = Array.from(
      new Set(
        (fallback.data ?? [])
          .map((r) => (r.lead_id ? String(r.lead_id) : ''))
          .filter(Boolean)
      )
    )
    let existingLeadIds = new Set<string>()
    if (leadIds.length) {
      const { data: leads } = await supabase.from('leads').select('id').in('id', leadIds)
      existingLeadIds = new Set((leads ?? []).map((l) => String(l.id)))
    }

    return {
      ok: true,
      auftraege: (fallback.data ?? [])
        .filter((r) => r.lead_id && existingLeadIds.has(String(r.lead_id)))
        .filter((r) => {
          const st = String(r.status ?? '')
          return st !== 'abgeschlossen' && st !== 'storniert'
        })
        .map((r) => ({
          id: r.id as string,
          titel: (r.titel as string | null) ?? null,
          status: String(r.status ?? ''),
          created_at: String(r.created_at ?? ''),
        })),
    }
  }

  return {
    ok: true,
    auftraege: (data ?? [])
      .filter((r) => {
        const st = String(r.status ?? '')
        return st !== 'abgeschlossen' && st !== 'storniert'
      })
      .map((r) => ({
        id: r.id as string,
        titel: (r.titel as string | null) ?? null,
        status: String(r.status ?? ''),
        created_at: String(r.created_at ?? ''),
      })),
  }
}

/**
 * Neue Anfrage für bestehenden Kunden — Basis für Angebots-Wizard ohne Vorauswahl.
 * Nutzt eine bestehende offene Anfrage desselben Kunden, statt eine zweite zu erzeugen
 * (sonst erscheinen Anfrage + Angebot parallel unter „Offen“).
 */
export async function createAnfrageFuerKunde(
  kundeId: string,
  opts?: { kanal?: LeadKanal }
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

  // Bestehende offene Anfrage wiederverwenden (Melder oder Vertragskunde/HV).
  const { data: bestehende } = await supabase
    .from('leads')
    .select('id, status, updated_at, angebote(id)')
    .or(`kunde_id.eq.${id},auftraggeber_kunde_id.eq.${id}`)
    .in('status', ['neu', 'kontaktiert', 'termin', 'angebot'])
    .order('updated_at', { ascending: false })
    .limit(20)

  const wiederverwendbar = (bestehende ?? []).find((row) => {
    const st = String(row.status ?? '').toLowerCase()
    return st === 'neu' || st === 'kontaktiert' || st === 'termin' || st === 'angebot'
  })
  if (wiederverwendbar?.id) {
    return { ok: true, leadId: String(wiederverwendbar.id) }
  }

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
    kanal: opts?.kanal ?? 'sonstiges',
    situation: '',
    bereiche: [],
    kundentyp: (kunde.typ as string | null) ?? 'privat',
    notizen: '',
    bestaetigungsmail_senden: false,
  })

  if (!r.ok) return r
  return { ok: true, leadId: r.id }
}

/** Auftrag ohne Angebot/Anfrage — nur Kunde. */
export async function createDirektAuftrag(input: {
  kundeId: string
  titel?: string | null
}): Promise<{ ok: true; auftragId: string } | { ok: false; message: string }> {
  const kundeId = input.kundeId.trim()
  if (!kundeId) return { ok: false, message: 'Bitte einen Kunden wählen.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: kunde, error: kErr } = await supabase
    .from('kunden')
    .select('id, name, vorname, nachname')
    .eq('id', kundeId)
    .maybeSingle()

  if (kErr || !kunde) return { ok: false, message: kErr?.message ?? 'Kunde nicht gefunden.' }

  const titel =
    input.titel?.trim() ||
    `Auftrag — ${kundeDisplayName(kunde)}`.slice(0, 240)

  const { data, error } = await supabase
    .from('auftraege')
    .insert({
      angebot_id: null,
      lead_id: null,
      kunde_id: kundeId,
      status: 'offen',
      titel,
      start_datum: null,
      end_datum: null,
      notizen: null,
      erstellt_von: user?.id ?? null,
      kunden_token: randomBytes(32).toString('hex'),
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Auftrag konnte nicht angelegt werden.' }

  revalidatePath('/auftraege')
  revalidatePath('/vorgaenge')
  revalidatePath(`/auftraege/${data.id}`)
  return { ok: true, auftragId: data.id as string }
}
