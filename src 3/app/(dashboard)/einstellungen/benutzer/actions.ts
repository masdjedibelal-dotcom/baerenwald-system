'use server'

import { revalidatePath } from 'next/cache'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { crmRoleFromUser } from '@/lib/auth/crm-access'
import { getPublicAppUrl } from '@/lib/utils'

export type BenutzerZeile = {
  id: string
  email: string
  name: string
  telefon: string
  rolle: 'admin' | 'manager'
  aktiv: boolean
}

async function upsertCrmMitarbeiterProfil(input: {
  authUserId: string
  email: string
  name: string
  telefon?: string | null
}) {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim() || email.split('@')[0] || 'Team'
  const telefon = input.telefon?.trim() || null
  await supabaseAdmin.from('user_profiles').upsert({
    id: input.authUserId,
    name,
    email,
    telefon,
    phone: telefon,
  })
}

/** E-Mail/Login gehört zu Handwerker- oder Kundenportal — nicht für CRM-Team. */
async function portalKontoFuerEmail(
  email: string,
  authUserId?: string
): Promise<'handwerker' | 'kunde' | null> {
  if (authUserId) {
    const [{ data: hw }, { data: kunde }] = await Promise.all([
      supabaseAdmin.from('handwerker').select('id').eq('auth_user_id', authUserId).maybeSingle(),
      supabaseAdmin.from('kunden').select('id').eq('auth_user_id', authUserId).maybeSingle(),
    ])
    if (hw?.id) return 'handwerker'
    if (kunde?.id) return 'kunde'
  }

  const [{ data: hwRows }, { data: kundeRows }] = await Promise.all([
    supabaseAdmin.from('handwerker').select('id, email').ilike('email', email).limit(20),
    supabaseAdmin.from('kunden').select('id, email').ilike('email', email).limit(20),
  ])
  const exact = (rows: { email?: string | null }[] | null) =>
    (rows ?? []).some((r) => (r.email ?? '').trim().toLowerCase() === email)

  if (exact(hwRows)) return 'handwerker'
  if (exact(kundeRows)) return 'kunde'
  return null
}

function portalFehler(kind: 'handwerker' | 'kunde'): string {
  return kind === 'kunde'
    ? 'Diese E-Mail gehört zu einem Kundenportal. Bitte eine eigene Mitarbeiter-E-Mail verwenden.'
    : 'Diese E-Mail gehört zu einem Handwerker-/Partner-Portal. Bitte eine eigene Mitarbeiter-E-Mail verwenden.'
}

export async function loadBenutzerListe(): Promise<BenutzerZeile[]> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 })
    if (error) {
      console.warn('loadBenutzerListe', error.message)
      return []
    }

    const staff = (data.users ?? []).filter((u) => crmRoleFromUser(u) != null)
    const ids = staff.map((u) => u.id)
    const telById = new Map<string, string>()
    const nameById = new Map<string, string>()
    if (ids.length) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, telefon, name')
        .in('id', ids)
      for (const p of profiles ?? []) {
        telById.set(p.id as string, (p.telefon as string)?.trim() || '')
        nameById.set(p.id as string, (p.name as string)?.trim() || '')
      }
    }

    return staff
      .map((u) => {
        const meta = u.user_metadata as {
          name?: string
          telefon?: string
          handy?: string
          phone?: string
        } | null
        const rolle = crmRoleFromUser(u) ?? 'manager'
        const metaTel =
          meta?.telefon?.trim() || meta?.handy?.trim() || meta?.phone?.trim() || ''
        return {
          id: u.id,
          email: u.email ?? '',
          name:
            nameById.get(u.id) ||
            meta?.name?.trim() ||
            u.email?.split('@')[0] ||
            '—',
          telefon: telById.get(u.id) || metaTel,
          rolle,
          aktiv: !u.banned_until,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
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
  const displayName = name.trim() || trimmed
  const base = getPublicAppUrl()

  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 })
  const found = (existing?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === trimmed)

  if (found) {
    const isStaff = crmRoleFromUser(found) != null
    if (!isStaff) {
      const portal = await portalKontoFuerEmail(trimmed, found.id)
      return {
        ok: false,
        message: portal
          ? portalFehler(portal)
          : 'Diese E-Mail ist bereits registriert, aber kein CRM-Mitarbeiter. Bitte eine andere E-Mail verwenden.',
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(found.id, {
      user_metadata: {
        ...(found.user_metadata ?? {}),
        name: displayName,
        role: rolle,
      },
      app_metadata: {
        ...(found.app_metadata ?? {}),
        crm_role: rolle,
        is_crm_admin: rolle === 'admin',
      },
    })
    if (error) return { ok: false, message: error.message }

    await upsertCrmMitarbeiterProfil({
      authUserId: found.id,
      email: trimmed,
      name: displayName,
    })
    revalidatePath('/einstellungen/benutzer')
    return { ok: true, message: 'Mitarbeiter aktualisiert' }
  }

  const portalMail = await portalKontoFuerEmail(trimmed)
  if (portalMail) {
    return { ok: false, message: portalFehler(portalMail) }
  }

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(trimmed, {
    data: { name: displayName, role: rolle },
    redirectTo: `${base}/auth/callback`,
  })
  if (error) return { ok: false, message: error.message }

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
    await upsertCrmMitarbeiterProfil({
      authUserId: neu.id,
      email: trimmed,
      name: displayName,
    })
  }

  revalidatePath('/einstellungen/benutzer')
  return { ok: true, message: 'Einladung an Mitarbeiter versendet' }
}

export async function updateBenutzerProfil(
  id: string,
  patch: { name: string; rolle: 'admin' | 'manager'; telefon?: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: user, error: gErr } = await supabaseAdmin.auth.admin.getUserById(id)
  if (gErr || !user?.user) return { ok: false, message: gErr?.message ?? 'Nutzer nicht gefunden' }
  if (!crmRoleFromUser(user.user as User)) {
    return { ok: false, message: 'Nur CRM-Mitarbeiter können hier bearbeitet werden.' }
  }

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
  await upsertCrmMitarbeiterProfil({
    authUserId: id,
    email,
    name: patch.name.trim(),
    telefon,
  })

  revalidatePath('/einstellungen/benutzer')
  revalidatePath('/einstellungen/profil')
  return { ok: true }
}

export async function setBenutzerAktiv(
  id: string,
  aktiv: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: user, error: gErr } = await supabaseAdmin.auth.admin.getUserById(id)
  if (gErr || !user?.user) return { ok: false, message: gErr?.message ?? 'Nutzer nicht gefunden' }
  if (!crmRoleFromUser(user.user as User)) {
    return { ok: false, message: 'Nur CRM-Mitarbeiter können hier geändert werden.' }
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: aktiv ? 'none' : '876600h',
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/benutzer')
  return { ok: true }
}
