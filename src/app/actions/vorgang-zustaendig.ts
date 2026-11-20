'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { istTeo } from '@/lib/marke'

/** Servus TEO: Vorgang (Anfrage) einem Teammitglied zuordnen oder die Zuordnung lösen. */
export async function setVorgangZustaendig(
  leadId: string,
  userId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!istTeo) return { ok: false, message: 'Nicht verfügbar.' }
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }

  const id = userId?.trim() || null
  if (id) {
    const { loadCrmTeamMitglieder } = await import('@/lib/crm-team')
    const team = await loadCrmTeamMitglieder()
    if (!team.some((m) => m.id === id)) {
      return { ok: false, message: 'Teammitglied nicht gefunden.' }
    }
  }

  const { error } = await gate.db
    .from('leads')
    .update({ zustaendig_id: id } as never)
    .eq('id', leadId)
  if (error) {
    logDbError('app/actions/vorgang-zustaendig:leads', error)
    if (/zustaendig_id/i.test(error.message)) {
      return { ok: false, message: 'Spalte „zustaendig_id“ fehlt — Migration 20270106120000_lead_zustaendig.sql ausführen.' }
    }
    return { ok: false, message: error.message }
  }
  // Zuständigen kurz per Mail informieren (nicht, wenn man sich selbst zuordnet)
  if (id && id !== gate.user.id) {
    await zustaendigPerMailInformieren(leadId, id).catch((e) => console.warn('[vorgang-zustaendig] Mail', e))
  }
  return { ok: true }
}

async function zustaendigPerMailInformieren(leadId: string, userId: string): Promise<void> {
  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId)
  const email = u?.user?.email?.trim()
  if (!email) return
  const { data: l } = await supabaseAdmin
    .from('leads')
    .select('kontakt_name, situation, strasse, hausnummer')
    .eq('id', leadId)
    .maybeSingle()
  const lead = l as { kontakt_name?: string | null; situation?: string | null; strasse?: string | null; hausnummer?: string | null } | null
  const was = [lead?.kontakt_name, [lead?.strasse, lead?.hausnummer].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || 'Vorgang'
  const { crmBasisUrl } = await import('@/lib/crm-basis-url')
  const { getMailBranding } = await import('@/lib/get-mail-branding')
  const { mailHtmlBase } = await import('@/lib/mail-templates')
  const { mailPrimaryButtonHtml } = await import('@/lib/mail/email-buttons')
  const { sendMail } = await import('@/lib/mail-service')
  const link = `${crmBasisUrl()}/anfragen/${leadId}`
  const b = await getMailBranding()
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  await sendMail({
    typ: 'intern_zustaendig',
    an: email,
    betreff: `Ihnen zugeordnet: ${was}`,
    html: mailHtmlBase(
      `<p style="font-size:15px;line-height:1.6;margin:0 0 14px;">Ihnen wurde ein Vorgang zugeordnet:</p>
       <p style="font-size:16px;font-weight:700;margin:0 0 18px;">${esc(was)}</p>
       ${mailPrimaryButtonHtml('Vorgang öffnen', link)}`,
      `Ihnen zugeordnet: ${was}`,
      b
    ),
    leadId,
  })
}

/** Servus TEO: aktuelle Zuordnung + Teamliste für die Auswahl im Detailkopf. */
export async function getVorgangZustaendig(
  leadId: string
): Promise<
  | { ok: true; zustaendigId: string | null; team: { id: string; name: string }[] }
  | { ok: false; message: string }
> {
  if (!istTeo) return { ok: false, message: 'Nicht verfügbar.' }
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const { data, error } = await gate.db.from('leads').select('zustaendig_id').eq('id', leadId).maybeSingle()
  if (error) {
    logDbError('app/actions/vorgang-zustaendig:get', error)
    return { ok: false, message: error.message }
  }
  const { loadCrmTeamMitglieder } = await import('@/lib/crm-team')
  const team = (await loadCrmTeamMitglieder()).map((m) => ({ id: m.id, name: m.name }))
  return { ok: true, zustaendigId: (data as { zustaendig_id?: string | null } | null)?.zustaendig_id ?? null, team }
}
