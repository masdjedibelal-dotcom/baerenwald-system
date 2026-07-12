import type { SupabaseClient } from '@supabase/supabase-js'

export type UnifiedTeamLinkResult = {
  userProfileOk: boolean
  handwerkerLinked: boolean
  handwerkerName: string | null
  handwerkerConflict: string | null
}

/** CRM-Team-Account: user_profiles + optional Partner-Portal (handwerker.auth_user_id). */
export async function ensureUnifiedTeamAccount(
  admin: SupabaseClient,
  input: {
    authUserId: string
    email: string
    name: string
    rolle: 'admin' | 'manager'
    telefon?: string | null
  }
): Promise<UnifiedTeamLinkResult> {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim() || email.split('@')[0] || 'Team'
  const telefon = input.telefon?.trim() || null

  await admin.from('user_profiles').upsert({
    id: input.authUserId,
    name,
    email,
    telefon,
    phone: telefon,
  })

  const { data: hwRows } = await admin
    .from('handwerker')
    .select('id, name, email, auth_user_id')
    .ilike('email', email)

  const hw = (hwRows ?? []).find((r) => (r.email as string)?.trim().toLowerCase() === email)
  if (!hw) {
    return {
      userProfileOk: true,
      handwerkerLinked: false,
      handwerkerName: null,
      handwerkerConflict: null,
    }
  }

  const existingAuth = (hw.auth_user_id as string | null)?.trim() || null
  if (existingAuth && existingAuth !== input.authUserId) {
    return {
      userProfileOk: true,
      handwerkerLinked: false,
      handwerkerName: hw.name as string,
      handwerkerConflict: `Handwerker „${hw.name}“ ist bereits einem anderen Login zugeordnet.`,
    }
  }

  if (!existingAuth) {
    const { error } = await admin
      .from('handwerker')
      .update({ auth_user_id: input.authUserId })
      .eq('id', hw.id as string)
    if (error) {
      return {
        userProfileOk: true,
        handwerkerLinked: false,
        handwerkerName: hw.name as string,
        handwerkerConflict: error.message,
      }
    }
  }

  return {
    userProfileOk: true,
    handwerkerLinked: true,
    handwerkerName: hw.name as string,
    handwerkerConflict: null,
  }
}

export async function teamAccountHasPartnerPortal(
  admin: SupabaseClient,
  authUserId: string
): Promise<boolean> {
  const { data } = await admin
    .from('handwerker')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  return Boolean(data?.id)
}
