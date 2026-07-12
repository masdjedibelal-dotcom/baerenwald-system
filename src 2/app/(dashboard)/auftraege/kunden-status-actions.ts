'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailUpdateHinweis } from '@/lib/mail-templates'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'

type ServerRuntime = typeof import('@/lib/server-runtime')

async function serverRuntime(): Promise<ServerRuntime> {
  return import('@/lib/server-runtime')
}

async function assertAuftragZugriff(auftragId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error || !data) return { ok: false, message: 'Auftrag nicht gefunden' }
  return { ok: true }
}

export async function ensureKundenTokenAction(
  auftragId: string
): Promise<{ ok: true; token: string; url: string } | { ok: false; message: string }> {
  const gate = await assertAuftragZugriff(auftragId)
  if (!gate.ok) return gate
  const { ensureKundenTokenForAuftrag } = await serverRuntime()
  const token = await ensureKundenTokenForAuftrag(auftragId)
  if (!token) return { ok: false, message: 'Token konnte nicht erzeugt werden' }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true, token, url: projektUrlFromToken(token) }
}

export async function setTimelineKundenfreigabe(input: {
  auftragId: string
  timelineId: string
  fuerKunde: boolean
  kundeBenachrichtigen: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftragZugriff(input.auftragId)
  if (!gate.ok) return gate

  const { supabaseAdmin, sendMail, ensureKundenTokenForAuftrag } = await serverRuntime()

  const supabase = createClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('auftrag_timeline')
    .update({
      fuer_kunde_freigegeben: input.fuerKunde,
      freigegeben_at: input.fuerKunde ? now : null,
    })
    .eq('id', input.timelineId)
    .eq('auftrag_id', input.auftragId)

  if (error) return { ok: false, message: error.message }

  if (input.fuerKunde && input.kundeBenachrichtigen) {
    const { data: auf } = await supabaseAdmin
      .from('auftraege')
      .select('kunden_token, kunde_id, kunden(name, email, typ)')
      .eq('id', input.auftragId)
      .maybeSingle()
    const kunden = auf?.kunden as { name?: string; email?: string | null; typ?: string | null } | null
    const email = kunden?.email?.trim()
    const token = (auf?.kunden_token as string | null) ?? (await ensureKundenTokenForAuftrag(input.auftragId))
    if (email && token) {
      const link = projektUrlFromToken(token)
      const branding = await getMailBranding(supabaseAdmin)
      const tpl = mailUpdateHinweis(
        {
          name: (kunden?.name ?? 'Kundin/Kunde').trim(),
          statusLink: link,
          kundeTyp: kunden?.typ ?? null,
        },
        branding
      )
      await sendMail({
        typ: 'update_hinweis',
        an: email,
        anName: kunden?.name ?? null,
        betreff: tpl.betreff,
        html: tpl.html,
        kundeId: (auf?.kunde_id as string | null) ?? null,
        auftragId: input.auftragId,
      })
    }
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function sendKundenProjektLinkEmail(auftragId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftragZugriff(auftragId)
  if (!gate.ok) return gate

  const { supabaseAdmin, sendMail, ensureKundenTokenForAuftrag } = await serverRuntime()

  const token = await ensureKundenTokenForAuftrag(auftragId)
  if (!token) return { ok: false, message: 'Kein Kunden-Link' }

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('kunde_id, kunden(name, email, typ)')
    .eq('id', auftragId)
    .maybeSingle()
  const kunden = auf?.kunden as { name?: string; email?: string | null; typ?: string | null } | null
  const email = kunden?.email?.trim()
  if (!email) return { ok: false, message: 'Keine Kunden-E-Mail' }

  const link = projektUrlFromToken(token)
  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailUpdateHinweis(
    {
      name: (kunden?.name ?? 'Kundin/Kunde').trim(),
      statusLink: link,
      kundeTyp: kunden?.typ ?? null,
    },
    branding
  )
  const sent = await sendMail({
    typ: 'update_hinweis',
    an: email,
    anName: kunden?.name ?? null,
    betreff: tpl.betreff,
    html: tpl.html,
    kundeId: (auf?.kunde_id as string | null) ?? null,
    auftragId,
  })
  if (!sent.success) return { ok: false, message: sent.error ?? 'Versand fehlgeschlagen' }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}
