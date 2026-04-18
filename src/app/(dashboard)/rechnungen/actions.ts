'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { AngebotPosition, RechnungStatus } from '@/lib/types'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'

export async function createRechnungEntwurf(input: {
  angebot_id: string | null
  auftrag_id: string | null
  kunde_id: string
  positionen: AngebotPosition[]
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  faellig_am: string | null
  mwst_satz?: number
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const positionen = normalizeAngebotPositionen(input.positionen)
  const mwst = input.mwst_satz ?? DEFAULT_MWST_SATZ
  const summen = summenAusPositionen(positionen, mwst)

  const { data: numRaw, error: rpcErr } = await supabase.rpc('generate_rechnungsnummer')
  if (rpcErr) {
    return { ok: false, message: rpcErr.message }
  }
  const rechnungsnummer = String(numRaw ?? '').trim()
  if (!rechnungsnummer) {
    return { ok: false, message: 'Rechnungsnummer konnte nicht erzeugt werden.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: row, error } = await supabase
    .from('rechnungen')
    .insert({
      angebot_id: input.angebot_id,
      auftrag_id: input.auftrag_id,
      kunde_id: input.kunde_id,
      rechnungsnummer,
      status: 'entwurf' as RechnungStatus,
      positionen,
      lohn_netto: summen.lohnZeileMin,
      material_netto: summen.materialZeileMin,
      netto: summen.nettoMin,
      mwst_satz: mwst,
      mwst_betrag: summen.mwstBetragMin,
      brutto: summen.bruttoMin,
      leistungszeitraum_von: input.leistungszeitraum_von,
      leistungszeitraum_bis: input.leistungszeitraum_bis,
      faellig_am: input.faellig_am,
      pdf_url: null,
      erstellt_von: user?.id ?? null,
    })
    .select('id')
    .single()

  if (error || !row) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePath('/rechnungen')
  return { ok: true, id: row.id as string }
}

export async function updateRechnungStatus(
  id: string,
  status: RechnungStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'gesendet') patch.gesendet_at = new Date().toISOString()
  if (status === 'bezahlt') patch.bezahlt_at = new Date().toISOString()
  const { error } = await supabase.from('rechnungen').update(patch).eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${id}`)
  return { ok: true }
}
