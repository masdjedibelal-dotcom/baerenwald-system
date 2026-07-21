'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { createRechnungEntwurf } from '@/app/(dashboard)/rechnungen/actions'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import type { AngebotPosition } from '@/lib/types'

export async function duplicateAnfrage(
  leadId: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: src, error: loadErr } = await supabase
    .from('leads')
    .select(
      'kunde_id, kanal, situation, bereiche, bereiche_sonstiges, budget_ca, preis_min, preis_max, plz, zeitraum, zeitraum_von, zeitraum_bis, kundentyp, kontakt_name, kontakt_email, kontakt_telefon, kontakt_nachricht, funnel_daten, ist_bauprojekt, kunde_objekt_id, auftraggeber_kunde_id, anlass, kostentraeger, kostentraeger_vorgeschlagen, versicherungs_nr'
    )
    .eq('id', leadId)
    .maybeSingle()
  if (loadErr || !src) return { ok: false, message: loadErr?.message ?? 'Anfrage nicht gefunden.' }

  const row = src as Record<string, unknown>
  const { data: inserted, error: insErr } = await supabase
    .from('leads')
    .insert({
      ...row,
      status: 'neu',
      notizen: `Kopie von Anfrage ${leadId.slice(0, 8)}…`,
    })
    .select('id')
    .single()

  if (insErr || !inserted) return { ok: false, message: insErr?.message ?? 'Kopie fehlgeschlagen.' }
  const newId = inserted.id as string

  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from('leads_status_history').insert({
    lead_id: newId,
    status_alt: null,
    status_neu: 'neu',
    user_id: user?.id ?? null,
  })

  revalidatePath('/anfragen')
  revalidatePath('/vorgaenge')
  return { ok: true, id: newId }
}

export async function duplicateAngebotHref(
  angebotId: string
): Promise<{ ok: true; href: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data } = await supabase.from('angebote').select('lead_id').eq('id', angebotId).maybeSingle()
  const leadId = (data as { lead_id?: string | null } | null)?.lead_id?.trim()
  if (!leadId) {
    return { ok: true, href: `/angebote/neu?kopie_von=${encodeURIComponent(angebotId)}` }
  }
  return {
    ok: true,
    href: `/anfragen/${leadId}?angebot_kopie_von=${encodeURIComponent(angebotId)}`,
  }
}

export async function duplicateAuftragHref(
  auftragId: string
): Promise<{ ok: true; href: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data } = await supabase
    .from('auftraege')
    .select('lead_id, angebot_id')
    .eq('id', auftragId)
    .maybeSingle()

  if (!data) return { ok: false, message: 'Auftrag nicht gefunden.' }
  const row = data as { lead_id?: string | null; angebot_id?: string | null }
  if (row.angebot_id) {
    return duplicateAngebotHref(row.angebot_id)
  }
  if (row.lead_id) {
    const dup = await duplicateAnfrage(row.lead_id)
    if (!dup.ok) return dup
    return { ok: true, href: `/anfragen/${dup.id}` }
  }
  return { ok: false, message: 'Auftrag ohne Anfrage-Verknüpfung.' }
}

export async function duplicateRechnung(
  rechnungId: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: src, error: loadErr } = await supabase
    .from('rechnungen')
    .select(
      'kunde_id, auftrag_id, angebot_id, positionen, lohn_netto, material_netto, netto, mwst_satz, mwst_betrag, brutto, leistungszeitraum_von, leistungszeitraum_bis, faellig_am, reverse_charge_13b, hinweis_35a, einleitung, hinweise, zahlungsbedingungen, rechnung_art, beleg_typ'
    )
    .eq('id', rechnungId)
    .maybeSingle()

  if (loadErr || !src) return { ok: false, message: loadErr?.message ?? 'Rechnung nicht gefunden.' }

  const row = src as Record<string, unknown>
  const positionen = normalizeAngebotPositionen(row.positionen) as AngebotPosition[]

  const res = await createRechnungEntwurf({
    kunde_id: String(row.kunde_id),
    auftrag_id: (row.auftrag_id as string | null) ?? null,
    angebot_id: (row.angebot_id as string | null) ?? null,
    positionen,
    leistungszeitraum_von: (row.leistungszeitraum_von as string | null) ?? null,
    leistungszeitraum_bis: (row.leistungszeitraum_bis as string | null) ?? null,
    faellig_am: (row.faellig_am as string | null) ?? null,
    reverse_charge_13b: Boolean(row.reverse_charge_13b),
    hinweis_35a: (row.hinweis_35a as boolean | null) ?? null,
    einleitung: (row.einleitung as string | null) ?? null,
    hinweise: row.hinweise
      ? `Kopie\n${String(row.hinweise)}`
      : 'Kopie',
    zahlungsbedingungen: (row.zahlungsbedingungen as string | null) ?? null,
    rechnung_art: (row.rechnung_art as 'voll' | 'abschlag' | 'schluss' | undefined) ?? 'voll',
  })

  if (!res.ok) return res
  revalidatePath('/rechnungen')
  return { ok: true, id: res.id }
}

export async function duplicatePartner(
  partnerId: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: src, error: loadErr } = await supabase.from('partner').select('*').eq('id', partnerId).maybeSingle()
  if (loadErr || !src) return { ok: false, message: loadErr?.message ?? 'Partner nicht gefunden.' }

  const row = src as Record<string, unknown>
  const payload: Record<string, unknown> = { ...row }
  delete payload.id
  delete payload.created_at
  delete payload.updated_at
  payload.name = `Kopie: ${String(row.name ?? 'Partner')}`
  payload.aktiv = row.aktiv ?? true
  if (payload.email) payload.email = null

  const { data: inserted, error: insErr } = await supabase
    .from('partner')
    .insert(payload)
    .select('id')
    .single()

  if (insErr || !inserted) return { ok: false, message: insErr?.message ?? 'Kopie fehlgeschlagen.' }
  revalidatePath('/partner')
  return { ok: true, id: inserted.id as string }
}
