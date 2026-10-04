'use server'

import { revalidateEinstellungenPath } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { crmRoleFromUser } from '@/lib/auth/crm-access'
import { requireCrmAdmin } from '@/lib/auth/crm-access-server'

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
  const { error: __dbErr1 } = await supabaseAdmin.from('user_profiles').upsert({
    id: input.authUserId,
    name,
    email,
    telefon,
    phone: telefon,
  })
  if (__dbErr1) logDbError('app/einstellungen/benutzer/actions:user_profiles', __dbErr1)
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
    : 'Diese E-Mail gehört zu einem Partner-/Partner-Portal. Bitte eine eigene Mitarbeiter-E-Mail verwenden.'
}

export async function loadBenutzerListe(): Promise<BenutzerZeile[]> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 })
    if (error) logDbError('app/einstellungen/benutzer/actions:query', error)
    if (error) {
      console.warn('loadBenutzerListe', error.message)
      return []
    }

    const staff = (data.users ?? []).filter((u) => crmRoleFromUser(u) != null)
    const ids = staff.map((u) => u.id)
    const telById = new Map<string, string>()
    const nameById = new Map<string, string>()
    if (ids.length) {
      const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, telefon, name')
        .in('id', ids)
      if (error) logDbError('app/einstellungen/benutzer/actions:user_profiles', error)
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

/** Mitarbeiter direkt anlegen (Name, E-Mail, Passwort) — keine Einladungs-Mail. Nur Admins. */
export async function createBenutzer(input: {
  email: string
  name: string
  passwort: string
  rolle: 'admin' | 'manager'
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmAdmin()
  if (!gate.ok) return { ok: false, message: gate.message }
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!name) return { ok: false, message: 'Bitte einen Namen angeben.' }
  if (!email || !email.includes('@')) return { ok: false, message: 'Gültige E-Mail nötig' }
  if (input.passwort.length < 8) return { ok: false, message: 'Passwort mindestens 8 Zeichen.' }

  const { data: existing, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 })
  if (error) logDbError('app/einstellungen/benutzer/actions:query', error)
  const found = (existing?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email)
  if (found) {
    if (crmRoleFromUser(found) != null) return { ok: false, message: 'Diese E-Mail ist schon im Team.' }
    const portal = await portalKontoFuerEmail(email, found.id)
    return {
      ok: false,
      message: portal ? portalFehler(portal) : 'Diese E-Mail ist bereits registriert. Bitte eine andere verwenden.',
    }
  }
  const portal = await portalKontoFuerEmail(email)
  if (portal) return { ok: false, message: portalFehler(portal) }

  const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.passwort,
    email_confirm: true,
    user_metadata: { name, role: input.rolle },
    app_metadata: { crm_role: input.rolle, is_crm_admin: input.rolle === 'admin' },
  })
  if (cErr) logDbError('app/einstellungen/benutzer/actions:create', cErr)
  if (cErr || !created?.user) return { ok: false, message: cErr?.message ?? 'Benutzer konnte nicht angelegt werden.' }

  await upsertCrmMitarbeiterProfil({ authUserId: created.user.id, email, name })
  revalidateEinstellungenPath('/einstellungen/benutzer')
  return { ok: true }
}

export async function updateBenutzerProfil(
  id: string,
  patch: { name: string; rolle: 'admin' | 'manager'; email?: string; passwort?: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmAdmin()
  if (!gate.ok) return { ok: false, message: gate.message }
  const neuesPasswort = patch.passwort ?? ''
  if (neuesPasswort && neuesPasswort.length < 8) {
    return { ok: false, message: 'Passwort mindestens 8 Zeichen.' }
  }
  const { data: user, error: gErr } = await supabaseAdmin.auth.admin.getUserById(id)
  if (gErr) logDbError('app/einstellungen/benutzer/actions:query', gErr)
  if (gErr || !user?.user) return { ok: false, message: gErr?.message ?? 'Nutzer nicht gefunden' }
  if (!crmRoleFromUser(user.user as User)) {
    return { ok: false, message: 'Nur CRM-Mitarbeiter können hier bearbeitet werden.' }
  }

  const currentEmail = (user.user.email?.trim() || '').toLowerCase()
  const nextEmail = (patch.email?.trim() || currentEmail).toLowerCase()
  if (!nextEmail || !nextEmail.includes('@')) {
    return { ok: false, message: 'Gültige E-Mail nötig' }
  }

  if (nextEmail !== currentEmail) {
    const portal = await portalKontoFuerEmail(nextEmail, id)
    if (portal) return { ok: false, message: portalFehler(portal) }

    const { data: existing, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 })
    if (error) logDbError('app/einstellungen/benutzer/actions:query', error)
    const taken = (existing?.users ?? []).find(
      (u) => u.id !== id && (u.email ?? '').toLowerCase() === nextEmail
    )
    if (taken) {
      return { ok: false, message: 'Diese E-Mail ist bereits vergeben.' }
    }
  }

  const prev = (user.user.user_metadata ?? {}) as Record<string, unknown>
  const { error: error2 } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ...(nextEmail !== currentEmail ? { email: nextEmail, email_confirm: true } : {}),
    ...(neuesPasswort ? { password: neuesPasswort } : {}),
    user_metadata: {
      ...prev,
      name: patch.name.trim(),
      role: patch.rolle,
    },
    app_metadata: {
      ...(user.user.app_metadata ?? {}),
      crm_role: patch.rolle,
      is_crm_admin: patch.rolle === 'admin',
    },
  })
  if (error2) logDbError('app/einstellungen/benutzer/actions:query', error2)
  if (error2) return { ok: false, message: error2.message }

  await upsertCrmMitarbeiterProfil({
    authUserId: id,
    email: nextEmail,
    name: patch.name.trim(),
    telefon: (prev.telefon as string | undefined) ?? null,
  })

  revalidateEinstellungenPath('/einstellungen/benutzer')
  revalidateEinstellungenPath('/einstellungen/profil')
  return { ok: true }
}
