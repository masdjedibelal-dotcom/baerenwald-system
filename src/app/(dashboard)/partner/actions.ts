'use server'

import { revalidatePath } from 'next/cache'
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

  if (error || !data?.id) {
    return { ok: false, message: error?.message ?? 'Partner konnte nicht angelegt werden.' }
  }

  revalidatePath('/partner')
  return { ok: true, id: data.id }
}

export async function deletePartner(
  partnerId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('partner').delete().eq('id', partnerId)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/partner')
  revalidatePath(`/partner/${partnerId}`)
  return { ok: true }
}
