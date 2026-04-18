'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'

export async function loadEinstellungenForm(): Promise<FirmenEinstellungen> {
  const supabase = createClient()
  return fetchFirmenEinstellungen(supabase)
}

export async function saveEinstellungen(
  patch: Partial<FirmenEinstellungen>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const base = defaultFirmenEinstellungen()
  const rows = Object.entries(patch).filter(([k, v]) => k in base && v !== undefined)
  if (!rows.length) return { ok: true }

  const payload = rows.map(([key, value]) => ({
    key,
    value: String(value ?? ''),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('einstellungen').upsert(payload, { onConflict: 'key' })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen')
  revalidatePath('/angebote')
  revalidatePath('/rechnungen')
  return { ok: true }
}
