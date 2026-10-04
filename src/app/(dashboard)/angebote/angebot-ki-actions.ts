'use server'

import { speichereAngebotKiBeispiel } from '@/lib/angebote/angebot-ki-lernen';
import type {
  AngebotKiLernenInput
} from '@/lib/angebote/angebot-ki-types';
import { createClient } from '@/lib/supabase-server';

async function requireAuth(): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }
  return { ok: true }
}

/** Nach „Übernehmen“: Beispiel speichern, damit die KI daraus lernt. */
export async function angebotKiLernen(
  input: AngebotKiLernenInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireAuth()
  if (!auth.ok) return auth
  const r = await speichereAngebotKiBeispiel(input)
  if (!r.ok) return { ok: false, message: r.message }
  return { ok: true }
}
