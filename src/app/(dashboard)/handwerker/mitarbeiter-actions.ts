'use server'

import { revalidateHandwerkerDetail } from '@/lib/crm-revalidate'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { logDbError } from '@/lib/errors/log-db-error'
import { mapPartnerMitarbeiter, PARTNER_MITARBEITER_SELECT, type PartnerMitarbeiter } from '@/lib/partner/mitarbeiter'

type Fail = { ok: false; message: string }

export async function listPartnerMitarbeiter(handwerkerId: string): Promise<{ ok: true; liste: PartnerMitarbeiter[] } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const { data, error } = await gate.db
    .from('handwerker_mitarbeiter')
    .select(PARTNER_MITARBEITER_SELECT)
    .eq('handwerker_id', handwerkerId)
    .eq('aktiv', true)
    .order('sort_order')
    .order('name')
  if (error) {
    logDbError('app/handwerker/mitarbeiter-actions:list', error)
    return { ok: false, message: 'Mitarbeiter konnten nicht geladen werden.' }
  }
  return { ok: true, liste: (data ?? []).map((r) => mapPartnerMitarbeiter(r as Record<string, unknown>)) }
}

export async function savePartnerMitarbeiter(input: {
  id?: string | null
  handwerkerId: string
  name: string
  email?: string | null
  telefon?: string | null
  rolle?: string | null
}): Promise<{ ok: true; id: string } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const name = input.name.trim().replace(/\s+/g, ' ')
  if (!name) return { ok: false, message: 'Name ist Pflicht.' }
  const email = input.email?.trim().toLowerCase() || null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'E-Mail-Adresse ist ungültig.' }
  const patch = {
    name,
    email,
    telefon: input.telefon?.trim() || null,
    rolle: input.rolle?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  const res = input.id
    ? await gate.db.from('handwerker_mitarbeiter').update(patch).eq('id', input.id).eq('handwerker_id', input.handwerkerId).select('id').single()
    : await gate.db.from('handwerker_mitarbeiter').insert({ ...patch, handwerker_id: input.handwerkerId }).select('id').single()
  if (res.error || !res.data) {
    logDbError('app/handwerker/mitarbeiter-actions:save', res.error)
    return { ok: false, message: 'Mitarbeiter konnte nicht gespeichert werden.' }
  }
  revalidateHandwerkerDetail(input.handwerkerId)
  return { ok: true, id: String(res.data.id) }
}

/** Entfernen = deaktivieren (Einsätze behalten den Bezug für die Historie, Zugang endet). */
export async function deletePartnerMitarbeiter(id: string, handwerkerId: string): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const { error } = await gate.db
    .from('handwerker_mitarbeiter')
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('handwerker_id', handwerkerId)
  if (error) {
    logDbError('app/handwerker/mitarbeiter-actions:delete', error)
    return { ok: false, message: 'Mitarbeiter konnte nicht entfernt werden.' }
  }
  revalidateHandwerkerDetail(handwerkerId)
  return { ok: true }
}
