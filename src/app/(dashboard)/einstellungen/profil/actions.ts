'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { updateBenutzerProfil } from '@/app/(dashboard)/einstellungen/benutzer/actions'

export type MeinProfilDaten = {
  id: string
  email: string
  name: string
  telefon: string
  rolle: 'admin' | 'manager'
}

export async function loadMeinProfil(): Promise<MeinProfilDaten | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name, telefon')
    .eq('id', user.id)
    .maybeSingle()

  const meta = (user.user_metadata ?? {}) as {
    name?: string
    role?: string
    telefon?: string
    handy?: string
    phone?: string
  }
  const metaTel = meta.telefon?.trim() || meta.handy?.trim() || meta.phone?.trim() || ''

  return {
    id: user.id,
    email: user.email ?? '',
    name:
      (profile?.name as string | undefined)?.trim() ||
      meta.name?.trim() ||
      user.email?.split('@')[0] ||
      '—',
    telefon: (profile?.telefon as string | undefined)?.trim() || metaTel,
    rolle: meta.role === 'admin' ? 'admin' : 'manager',
  }
}

export async function saveMeinProfil(patch: {
  name: string
  telefon: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return { ok: false, message: 'Nicht angemeldet' }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
  const meta = (authUser?.user?.user_metadata ?? {}) as { role?: string }
  const rolle = meta.role === 'admin' ? 'admin' : 'manager'

  const r = await updateBenutzerProfil(user.id, {
    name: patch.name,
    telefon: patch.telefon,
    rolle,
  })
  if (!r.ok) return r

  revalidatePath('/einstellungen/profil')
  return { ok: true }
}
