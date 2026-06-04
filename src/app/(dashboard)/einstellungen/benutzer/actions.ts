'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type BenutzerZeile = {
  id: string
  email: string
  name: string
  telefon: string
  rolle: 'admin' | 'manager'
  aktiv: boolean
}

export async function loadBenutzerListe(): Promise<BenutzerZeile[]> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 })
    if (error) {
      console.warn('loadBenutzerListe', error.message)
      return []
    }
    const ids = (data.users ?? []).map((u) => u.id)
    const telById = new Map<string, string>()
    if (ids.length) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, telefon')
        .in('id', ids)
      for (const p of profiles ?? []) {
        telById.set(p.id as string, (p.telefon as string)?.trim() || '')
      }
    }

    return (data.users ?? []).map((u) => {
    const meta = u.user_metadata as { name?: string; role?: string; telefon?: string; handy?: string; phone?: string } | null
    const roleRaw = meta?.role === 'admin' ? 'admin' : 'manager'
    const metaTel =
      meta?.telefon?.trim() || meta?.handy?.trim() || meta?.phone?.trim() || ''
    return {
      id: u.id,
      email: u.email ?? '',
      name: meta?.name?.trim() || u.email?.split('@')[0] || '—',
      telefon: telById.get(u.id) || metaTel,
      rolle: roleRaw,
      aktiv: !u.banned_until,
    }
  })
  } catch (e) {
    console.warn('loadBenutzerListe', e)
    return []
  }
}

export async function inviteBenutzer(
  email: string,
  name: string,
  rolle: 'admin' | 'manager'
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) return { ok: false, message: 'Gültige E-Mail nötig' }
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(trimmed, {
    data: { name: name.trim() || trimmed, role: rolle },
    ...(base ? { redirectTo: `${base}/` } : {}),
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/benutzer')
  return { ok: true }
}

export async function updateBenutzerProfil(
  id: string,
  patch: { name: string; rolle: 'admin' | 'manager'; telefon?: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: user, error: gErr } = await supabaseAdmin.auth.admin.getUserById(id)
  if (gErr || !user?.user) return { ok: false, message: gErr?.message ?? 'Nutzer nicht gefunden' }
  const prev = (user.user.user_metadata ?? {}) as Record<string, unknown>
  const telefon = patch.telefon?.trim() ?? ''
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: {
      ...prev,
      name: patch.name.trim(),
      role: patch.rolle,
      telefon: telefon || undefined,
    },
  })
  if (error) return { ok: false, message: error.message }

  const email = user.user.email?.trim() || null
  await supabaseAdmin.from('user_profiles').upsert({
    id,
    name: patch.name.trim(),
    telefon: telefon || null,
    phone: telefon || null,
    email,
  })

  revalidatePath('/einstellungen/benutzer')
  revalidatePath('/einstellungen/profil')
  return { ok: true }
}

export async function setBenutzerAktiv(
  id: string,
  aktiv: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: aktiv ? 'none' : '876600h',
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/benutzer')
  return { ok: true }
}
