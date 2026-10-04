'use server'

import { revalidateEinstellungenPath } from '@/lib/crm-revalidate'
import { createClient } from '@/lib/supabase-server'
import {
  anonymisiereKunde as anonymisiereKundeLib
} from '@/lib/datenschutz/execute-loeschung'

async function requireUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Kundenstamm anonymisieren (PLZ bleibt); Rechnungen unverändert. */
export async function anonymisiereKunde(
  kundeId: string,
  grund = 'manuell'
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = await requireUserId()
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }
  const r = await anonymisiereKundeLib(kundeId, uid, grund)
  if (!r.ok) return r
  revalidateEinstellungenPath('/einstellungen/integration')
  return { ok: true }
}
