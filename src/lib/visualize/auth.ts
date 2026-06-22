import 'server-only'

import { createClient } from '@/lib/supabase-server'

export async function requireCrmAngebotAccess(
  angebotId: string
): Promise<
  | { ok: true; angebotId: string; userId: string }
  | { ok: false; status: number; message: string }
> {
  const id = angebotId.trim()
  if (!id) return { ok: false, status: 400, message: 'angebot_id fehlt' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return { ok: false, status: 401, message: 'Nicht angemeldet' }

  const { data: angebot, error } = await supabase.from('angebote').select('id').eq('id', id).maybeSingle()
  if (error) return { ok: false, status: 500, message: error.message }
  if (!angebot) return { ok: false, status: 404, message: 'Angebot nicht gefunden' }

  return { ok: true, angebotId: id, userId: user.id }
}
