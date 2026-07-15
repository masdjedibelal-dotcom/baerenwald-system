'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailProjektStatusUpdate } from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import {
  aktuellePhaseIndex,
  auftragStatusLabelDe,
  mailPhasenStepsHtml,
} from '@/lib/auftraege/projekt-phasen'
import { ensureKundenTokenForAuftrag } from '@/lib/projekt/kunden-token'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import type { AuftragStatus, LeadStatus } from '@/lib/types'

async function assertAuftrag(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet' }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error || !data) return { ok: false as const, message: 'Auftrag nicht gefunden' }
  return { ok: true as const, userId: user.id }
}

export async function updateAuftragProjektSteuerung(input: {
  auftragId: string
  status?: AuftragStatus
  fortschritt?: number
  naechster_schritt?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const supabase = createClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.status !== undefined) patch.status = input.status
  if (input.fortschritt !== undefined) {
    patch.fortschritt = Math.max(0, Math.min(100, Math.round(input.fortschritt)))
  }
  if (input.naechster_schritt !== undefined) {
    patch.naechster_schritt = input.naechster_schritt?.trim() || null
  }

  const { error } = await supabase.from('auftraege').update(patch).eq('id', input.auftragId)
  if (error) return { ok: false, message: error.message }

  if (input.status === 'abgeschlossen' || input.status === 'storniert') {
    const { syncPortalLeadStatusAfterAuftragChange } = await import(
      '@/lib/portal/sync-portal-lead-status'
    )
    await syncPortalLeadStatusAfterAuftragChange({
      auftragId: input.auftragId,
      status: input.status,
      skipMieterMail: true,
    })
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function createKundenUpdateAndSend(input: {
  auftragId: string
  titel: string
  beschreibung: string
  foto_urls?: string[]
  /** Schlicht = weniger Inhalt in Mail, Details auf Status-Seite */
  mailModus: 'voll' | 'schlicht'
  kundeBenachrichtigen: boolean
}): Promise<{ ok: true; timelineId: string } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const titel = input.titel.trim()
  const beschreibung = input.beschreibung.trim()
  if (!titel) return { ok: false, message: 'Titel fehlt' }

  const fotos = (input.foto_urls ?? []).filter(Boolean)

  const { data: auf, error: loadErr } = await supabaseAdmin
    .from('auftraege')
    .select(
      `
      id, status, titel, fortschritt, naechster_schritt, kunden_token, kunde_id, lead_id,
      kunden(name, email, plz, ort, adresse),
      leads(status)
    `
    )
    .eq('id', input.auftragId)
    .maybeSingle()

  if (loadErr || !auf) return { ok: false, message: 'Auftrag nicht gefunden' }

  const tl = await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'handwerker_update',
    titel,
    beschreibung: beschreibung || null,
    foto_urls: fotos,
    erstellt_von: gate.userId,
    fuer_kunde_freigegeben: true,
    sichtbar_fuer_kunde: true,
  })
  if (!tl.ok) return { ok: false, message: tl.message ?? 'Timeline fehlgeschlagen' }

  const timelineId = tl.id ?? ''

  if (input.kundeBenachrichtigen) {
    const kunden = auf.kunden as { name?: string; email?: string | null; typ?: string | null } | null
    const email = kunden?.email?.trim()
    if (!email) return { ok: false, message: 'Keine Kunden-E-Mail — Update gespeichert, Mail nicht gesendet.' }

    let token = (auf.kunden_token as string | null)?.trim()
    if (!token) token = (await ensureKundenTokenForAuftrag(input.auftragId)) ?? undefined
    if (!token) return { ok: false, message: 'Kein Kunden-Link' }

    const leadRaw = auf.leads as { status?: LeadStatus } | { status?: LeadStatus }[] | null
    const leadStatus = (Array.isArray(leadRaw) ? leadRaw[0]?.status : leadRaw?.status) ?? null
    const aufStatus = auf.status as AuftragStatus
    const phaseIdx = aktuellePhaseIndex(leadStatus, aufStatus)
    const link = projektUrlFromToken(token)
    const branding = await getMailBranding(supabaseAdmin)
    const minimal = input.mailModus === 'schlicht'
    const kundeTyp = kunden?.typ ?? null

    const tpl = mailProjektStatusUpdate(
      {
        name: (kunden?.name ?? 'Kundin/Kunde').trim(),
        statusLink: link,
        kundeTyp,
        projektTitel: (auf.titel as string | null)?.trim() || 'Ihr Projekt',
        statusLabel: auftragStatusLabelDe(aufStatus),
        phaseStepsHtml: mailPhasenStepsHtml(phaseIdx),
        updateTitel: titel,
        updateText: beschreibung || titel,
        naechsterSchritt: (auf.naechster_schritt as string | null) ?? null,
        minimalBody: minimal,
        fotoLinks: fotos,
      },
      branding
    )

    const sent = await sendMail({
      typ: 'update_hinweis',
      an: email,
      anName: kunden?.name ?? null,
      betreff: tpl.betreff,
      html: tpl.html,
      kundeId: (auf.kunde_id as string | null) ?? null,
      auftragId: input.auftragId,
    })
    if (!sent.success) return { ok: false, message: sent.error ?? 'Mail fehlgeschlagen' }
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, timelineId }
}
