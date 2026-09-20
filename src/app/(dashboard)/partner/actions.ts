'use server'

import { revalidatePartnerDetail, revalidatePartnerList } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'

export async function createPartner(input: {
  name: string
  kategorie?: string | null
  ansprechpartner?: string | null
  telefon?: string | null
  email?: string | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const name = input.name.trim()
  if (!name) return { ok: false, message: 'Bitte Name angeben.' }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('partner')
    .insert({
      name,
      partner_typ: input.kategorie?.trim() || null,
      ansprechpartner: input.ansprechpartner?.trim() || null,
      telefon: input.telefon?.trim() || null,
      email: input.email?.trim() || null,
      aktiv: true,
    })
    .select('id')
    .single()
  if (error) logDbError('app/partner/actions:partner', error)

  if (error || !data?.id) {
    return { ok: false, message: error?.message ?? 'Netzwerk-Eintrag konnte nicht angelegt werden.' }
  }

  revalidatePartnerList()
  return { ok: true, id: data.id }
}

export async function deletePartner(
  partnerId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('partner').delete().eq('id', partnerId)
  if (error) logDbError('app/partner/actions:partner', error)
  if (error) return { ok: false, message: error.message }
  revalidatePartnerList()
  revalidatePartnerDetail(partnerId)
  return { ok: true }
}
