'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export type WiedervorlageEntity = 'lead' | 'angebot' | 'auftrag' | 'rechnung'

const TABLE: Record<WiedervorlageEntity, string> = {
  lead: 'leads',
  angebot: 'angebote',
  auftrag: 'auftraege',
  rechnung: 'rechnungen',
}

const DETAIL_PATH: Record<WiedervorlageEntity, (id: string) => string> = {
  lead: (id) => `/anfragen/${id}`,
  angebot: (id) => `/angebote/${id}`,
  auftrag: (id) => `/auftraege/${id}`,
  rechnung: (id) => `/rechnungen/${id}`,
}

export async function setWiedervorlage(input: {
  entity: WiedervorlageEntity
  id: string
  datum: string | null
  notiz?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const id = input.id.trim()
  if (!id) return { ok: false, message: 'ID fehlt' }
  const table = TABLE[input.entity]
  const datum = input.datum?.trim().slice(0, 10) || null
  const notiz = input.notiz?.trim() || null

  const { error } = await supabase
    .from(table)
    .update({
      wiedervorlage_datum: datum,
      wiedervorlage_notiz: notiz,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { ok: false, message: error.message }

  revalidatePath(DETAIL_PATH[input.entity](id))
  revalidatePath('/vorgaenge')
  return { ok: true }
}
