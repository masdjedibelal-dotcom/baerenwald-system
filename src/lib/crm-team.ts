import { supabaseAdmin } from '@/lib/supabase-admin'

export type CrmTeamMitglied = {
  id: string
  name: string
  telefon: string
}

function telefonAusMeta(meta: Record<string, unknown> | null | undefined): string {
  if (!meta || typeof meta !== 'object') return ''
  for (const key of ['telefon', 'handy', 'phone', 'mobil']) {
    const v = meta[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

/** Aktive CRM-Nutzer:innen mit Name und Handynummer (Profil + Auth-Metadata). */
export async function loadCrmTeamMitglieder(): Promise<CrmTeamMitglied[]> {
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 500,
  })
  if (authErr) {
    console.warn('loadCrmTeamMitglieder auth', authErr.message)
    return []
  }

  const users = (authData.users ?? []).filter((u) => !u.banned_until)
  if (!users.length) return []

  const ids = users.map((u) => u.id)
  const profileTel = new Map<string, string>()
  const profileName = new Map<string, string>()

  const { data: profiles } = await supabaseAdmin
    .from('user_profiles')
    .select('id, name, telefon')
    .in('id', ids)

  for (const p of profiles ?? []) {
    const id = p.id as string
    profileName.set(id, (p.name as string)?.trim() || '')
    profileTel.set(id, (p.telefon as string)?.trim() || '')
  }

  return users
    .map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>
      const name =
        profileName.get(u.id)?.trim() ||
        (typeof meta.name === 'string' ? meta.name.trim() : '') ||
        u.email?.split('@')[0] ||
        'Team'
      const telefon = profileTel.get(u.id) || telefonAusMeta(meta)
      return { id: u.id, name, telefon }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

export async function getCrmTeamMitglied(
  userId: string | null | undefined
): Promise<CrmTeamMitglied | null> {
  const id = userId?.trim()
  if (!id) return null
  const list = await loadCrmTeamMitglieder()
  return list.find((m) => m.id === id) ?? null
}
