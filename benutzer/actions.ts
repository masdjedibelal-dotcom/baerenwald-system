'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  ensureUnifiedTeamAccount,
  teamAccountHasPartnerPortal,
} from '@/lib/auth/unified-team-account'
import { getPublicAppUrl } from '@/lib/utils'

export type BenutzerZeile = {
  id: string
  email: string
  name: string
  telefon: string
  rolle: 'admin' | 'manager'
  aktiv: boolean
  partnerPortal: boolean
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

    const partnerIds = new Set<string>()
    if (ids.length) {
      const { data: hwLinks } = await supabaseAdmin
        .from('handwerker')
        .select('auth_user_id')
        .in('auth_user_id', ids)
      for (const h of hwLinks ?? []) {
        const aid = (h as { auth_user_id?: string }).auth_user_id
        if (aid) partnerIds.add(aid)
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
      partnerPortal: partnerIds.has(u.id),
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
): Promise<{ ok: true; message?: string } | { ok: false; message: string }> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) return { ok: false, message: 'Gültige E-Mail nötig' }
  const base = getPublicAppUrl()
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 })
  const found = (existing?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === trimmed)

  if (found) {
    const link = await ensureUnifiedTeamAccount(supabaseAdmin, {
      authUserId: found.id,
      email: trimmed,
      name: name.trim() || trimmed,
      rolle,
    })
    if (link.handwerkerConflict) {
      return { ok: false, message: link.handwerkerConflict }
    }
    revalidatePath('/einstellungen/benutzer')
    return {
      ok: true,
      message: link.handwerkerLinked
        ? `Bestehender Login verknüpft — CRM + Partner-Portal (${link.handwerkerName}).`
        : 'Bestehender Login als CRM-Nutzer hinterlegt (gleiche E-Mail wie Partner-Stamm empfohlen).',
    }
  }

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(trimmed, {
    data: { name: name.trim() || trimmed, role: rolle },
    redirectTo: `${base}/auth/callback`,
  })
  if (error) return { ok: false, message: error.message }
  // app_metadata Admin-Flag (kanonisch für Impersonation / Guards)
  const { data: invited } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 })
  const neu = (invited?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === trimmed)
  if (neu) {
    await supabaseAdmin.auth.admin.updateUserById(neu.id, {
      app_metadata: {
        ...(neu.app_metadata ?? {}),
        crm_role: rolle,
        is_crm_admin: rolle === 'admin',
      },
    })
  }
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
    app_metadata: {
      ...(user.user.app_metadata ?? {}),
      crm_role: patch.rolle,
      is_crm_admin: patch.rolle === 'admin',
    },
  })
  if (error) return { ok: false, message: error.message }

  const email = (user.user.email?.trim() || '').toLowerCase()
  const link = await ensureUnifiedTeamAccount(supabaseAdmin, {
    authUserId: id,
    email,
    name: patch.name.trim(),
    rolle: patch.rolle,
    telefon,
  })
  if (link.handwerkerConflict) {
    return { ok: false, message: link.handwerkerConflict }
  }

  revalidatePath('/einstellungen/benutzer')
  revalidatePath('/einstellungen/profil')
  return { ok: true }
}

/** CRM-Login mit Partner-Portal verknüpfen (Handwerker-Stamm mit gleicher E-Mail). */
export async function syncBenutzerPartnerPortal(
  benutzerId: string
): Promise<{ ok: true; handwerkerName: string | null } | { ok: false; message: string }> {
  const { data: user, error: gErr } = await supabaseAdmin.auth.admin.getUserById(benutzerId)
  if (gErr || !user?.user?.email) {
    return { ok: false, message: gErr?.message ?? 'Nutzer nicht gefunden' }
  }
  const meta = (user.user.user_metadata ?? {}) as { name?: string; role?: string }
  const rolle = meta.role === 'admin' ? 'admin' : 'manager'
  const link = await ensureUnifiedTeamAccount(supabaseAdmin, {
    authUserId: benutzerId,
    email: user.user.email,
    name: meta.name?.trim() || user.user.email.split('@')[0] || 'Team',
    rolle,
  })
  if (link.handwerkerConflict) return { ok: false, message: link.handwerkerConflict }
  revalidatePath('/einstellungen/benutzer')
  return { ok: true, handwerkerName: link.handwerkerName }
}

export async function benutzerHatPartnerPortal(benutzerId: string): Promise<boolean> {
  return teamAccountHasPartnerPortal(supabaseAdmin, benutzerId)
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
