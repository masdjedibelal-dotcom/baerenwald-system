'use server'

import { revalidatePath } from 'next/cache'

import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { logDbError } from '@/lib/errors/log-db-error'
import { MARKE } from '@/lib/marke'

/** Nachrichten zwischen Verwaltung (TEO-Arbeitsplatz) und TEO-Team zu einem Vorgang. */
export type VerwaltungNachricht = { id: string; wann: string; von: string; vonTeo: boolean; text: string }

type Fail = { ok: false; message: string }

export async function ladeVerwaltungNachrichten(leadId: string): Promise<{ ok: true; liste: VerwaltungNachricht[] } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const { data, error } = await gate.db
    .from('vorgang_kommentare')
    .select('id, actor_rolle, actor_name, text, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
  if (error) {
    logDbError('teo/hv/verwaltung-nachrichten:laden', error)
    return { ok: false, message: 'Nachrichten konnten nicht geladen werden.' }
  }
  return {
    ok: true,
    liste: (data ?? []).map((n) => ({
      id: String(n.id),
      wann: String(n.created_at),
      von: n.actor_name?.trim() || (n.actor_rolle === 'teo' ? MARKE.name : 'Verwaltung'),
      vonTeo: n.actor_rolle === 'teo',
      text: String(n.text ?? ''),
    })),
  }
}

export async function sendeNachrichtAnVerwaltung(leadId: string, text: string): Promise<{ ok: true } | Fail> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return gate
  const inhalt = text.trim()
  if (!inhalt) return { ok: false, message: 'Bitte eine Nachricht eingeben.' }
  if (inhalt.length > 4000) return { ok: false, message: 'Die Nachricht ist zu lang.' }
  const { data: lead, error: lErr } = await gate.db.from('leads').select('id, auftraggeber_kunde_id').eq('id', leadId).maybeSingle()
  if (lErr) logDbError('teo/hv/verwaltung-nachrichten:lead', lErr)
  if (!lead?.auftraggeber_kunde_id) return { ok: false, message: 'Dieser Vorgang hat keine Verwaltung.' }
  const { data: profil } = await gate.db.from('user_profiles').select('name').eq('id', gate.user.id).maybeSingle()
  const absender = `${(profil?.name as string | undefined)?.trim() || 'Team'} (${MARKE.name})`
  const { error } = await gate.db.from('vorgang_kommentare').insert({
    lead_id: leadId,
    kunde_id: lead.auftraggeber_kunde_id,
    actor_rolle: 'teo',
    actor_name: absender,
    text: inhalt,
  })
  if (error) {
    logDbError('teo/hv/verwaltung-nachrichten:senden', error)
    return { ok: false, message: 'Nachricht konnte nicht gesendet werden.' }
  }
  const { error: tlErr } = await gate.db.from('lead_timeline').insert({
    lead_id: leadId,
    typ: 'teo_nachricht',
    titel: `Nachricht an die Verwaltung`,
    beschreibung: inhalt,
    erstellt_von: gate.user.id,
  })
  if (tlErr) logDbError('teo/hv/verwaltung-nachrichten:timeline', tlErr)
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}
