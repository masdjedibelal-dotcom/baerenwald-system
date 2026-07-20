import { supabaseAdmin } from '@/lib/supabase-admin'
import { finalizeRahmenVertrag } from '@/app/(dashboard)/vertraege/wizard-actions'
import { syncRahmenvertragComplianceDoc } from '@/lib/vertraege/sync-vertrag-compliance'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'

async function loadRahmenRow(handwerkerId: string): Promise<HandwerkerVertragRow | null> {
  const { data } = await supabaseAdmin
    .from('handwerker_vertraege')
    .select('*')
    .eq('handwerker_id', handwerkerId)
    .eq('typ', 'rahmen')
    .is('auftrag_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as HandwerkerVertragRow | null) ?? null
}

/**
 * Nach Portal-Annahme (Registrierung/Profil): Vertrag anlegen, PDF erzeugen, Annahme persistieren.
 * Kein weiterer manueller CRM-Schritt nötig.
 */
export async function acceptRahmenvertragFromPortal(input: {
  handwerkerId: string
  authUserId?: string | null
}): Promise<
  | { ok: true; vertrag_id: string; vertrags_nr: string; pdf_url: string | null; bereitsAkzeptiert: boolean }
  | { ok: false; message: string }
> {
  const handwerkerId = input.handwerkerId.trim()
  if (!handwerkerId) return { ok: false, message: 'Handwerker fehlt.' }

  const { data: hw } = await supabaseAdmin
    .from('handwerker')
    .select('id')
    .eq('id', handwerkerId)
    .maybeSingle()
  if (!hw?.id) return { ok: false, message: 'Handwerker nicht gefunden.' }

  let row = await loadRahmenRow(handwerkerId)
  const now = new Date().toISOString()

  if (row?.portal_akzeptiert_am && row.pdf_url?.trim()) {
    return {
      ok: true,
      vertrag_id: row.id,
      vertrags_nr: row.vertrags_nr,
      pdf_url: row.pdf_url,
      bereitsAkzeptiert: true,
    }
  }

  if (!row?.pdf_url?.trim()) {
    const finalized = await finalizeRahmenVertrag({
      vertrag_id: row?.id ?? null,
      handwerker_id: handwerkerId,
      notizen: row?.notizen ?? 'Automatisch nach Portal-Annahme erzeugt.',
    })
    if (!finalized.ok) return finalized
    row = await loadRahmenRow(handwerkerId)
    if (!row) {
      return {
        ok: true,
        vertrag_id: finalized.vertrag_id,
        vertrags_nr: finalized.vertrags_nr,
        pdf_url: finalized.pdf_url,
        bereitsAkzeptiert: false,
      }
    }
  } else if (row.pdf_url?.trim()) {
    await syncRahmenvertragComplianceDoc({
      handwerker_id: handwerkerId,
      pdf_url: row.pdf_url,
      vertrags_nr: row.vertrags_nr,
    })
  }

  const patch: Record<string, unknown> = {
    portal_akzeptiert_am: row.portal_akzeptiert_am ?? now,
    updated_at: now,
  }
  if (input.authUserId?.trim()) {
    patch.portal_akzeptiert_auth_user_id = input.authUserId.trim()
  }
  if (!row.signiert_am) {
    patch.status = 'unterschrieben'
    patch.signiert_am = now
  }

  const { error } = await supabaseAdmin
    .from('handwerker_vertraege')
    .update(patch)
    .eq('id', row.id)

  if (error) return { ok: false, message: error.message }

  const refreshed = await loadRahmenRow(handwerkerId)
  return {
    ok: true,
    vertrag_id: refreshed?.id ?? row.id,
    vertrags_nr: refreshed?.vertrags_nr ?? row.vertrags_nr,
    pdf_url: refreshed?.pdf_url ?? row.pdf_url ?? null,
    bereitsAkzeptiert: Boolean(row.portal_akzeptiert_am),
  }
}
