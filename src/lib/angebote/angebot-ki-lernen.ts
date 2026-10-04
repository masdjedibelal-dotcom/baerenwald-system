import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type {
  AngebotKiLernenInput
} from '@/lib/angebote/angebot-ki-types'

async function authUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function speichereAngebotKiBeispiel(
  input: AngebotKiLernenInput
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const userId = await authUserId()
  const { data, error } = await supabaseAdmin
    .from('angebot_ki_beispiele')
    .insert({
      scope: 'positionen',
      prompt: input.prompt.trim().slice(0, 4000),
      gewerk_slug: input.gewerk_slug?.trim() || null,
      kontext: input.kontext,
      ergebnis: input.ergebnis,
      akzeptiert: true,
      user_id: userId,
    })
    .select('id')
    .single()
  if (error) logDbError('lib/angebote/angebot-ki-lernen:angebot_ki_beispiele', error)

  if (error) {
    console.warn('[angebot-ki] beispiele speichern:', error.message)
    return { ok: false, message: error.message }
  }
  return { ok: true, id: data.id as string }
}
