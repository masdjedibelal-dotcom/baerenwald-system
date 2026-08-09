'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { loadAngebotWizardBootstrap } from '@/app/(dashboard)/angebote/wizard-actions'
import { loadAnfrageDetail } from '@/lib/anfragen/load-anfrage-detail'
import { syncAngebotPositionenZuAuftrag } from '@/lib/auftraege/sync-angebot-zu-auftrag'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import type { LeadDetail } from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'

export async function loadAngebotKorrekturWizardBootstrap(auftragId: string): Promise<
  | {
      ok: true
      bootstrap: AngebotWizardBootstrap
      lead: LeadDetail
      angebotId: string
    }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const id = auftragId.trim()
  const { data: auftrag, error } = await supabase
    .from('auftraege')
    .select('id, angebot_id, lead_id, status')
    .eq('id', id)
    .maybeSingle()

  if (error || !auftrag) return { ok: false, message: 'Auftrag nicht gefunden' }
  if ((auftrag.status ?? '') === 'storniert') {
    return { ok: false, message: 'Stornierte Aufträge können nicht bearbeitet werden.' }
  }
  const angebotId = String(auftrag.angebot_id ?? '').trim()
  const leadId = String(auftrag.lead_id ?? '').trim()
  if (!angebotId) return { ok: false, message: 'Kein verknüpftes Angebot.' }
  if (!leadId) return { ok: false, message: 'Keine verknüpfte Anfrage — Wizard nicht verfügbar.' }

  const loaded = await loadAngebotWizardBootstrap(angebotId, leadId)
  if (!loaded.ok) return loaded

  const lead = await loadAnfrageDetail(supabase, leadId)
  if (!lead) return { ok: false, message: 'Anfrage nicht gefunden' }

  return {
    ok: true,
    angebotId,
    lead,
    bootstrap: {
      ...loaded.bootstrap,
      bereitsGesendet: true,
      auftragKorrektur: { auftragId: id },
    },
  }
}

export async function syncAuftragAusAngebotKorrektur(input: {
  auftragId: string
  angebotId: string
}): Promise<
  | { ok: true; neu: number; aktualisiert: number }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const auftragId = input.auftragId.trim()
  const angebotId = input.angebotId.trim()

  const { data: auftrag } = await supabase
    .from('auftraege')
    .select('id, angebot_id')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auftrag || String(auftrag.angebot_id) !== angebotId) {
    return { ok: false, message: 'Auftrag und Angebot passen nicht zusammen.' }
  }

  const { data: angebot, error: aErr } = await supabaseAdmin
    .from('angebote')
    .select('positionen, zahlungsplan, angebot_handwerker(*)')
    .eq('id', angebotId)
    .maybeSingle()

  if (aErr || !angebot) return { ok: false, message: 'Angebot nicht gefunden' }

  const sync = await syncAngebotPositionenZuAuftrag({
    auftragId,
    angebotPositionen: normalizeAngebotPositionen(angebot.positionen),
    angebotHandwerker: angebot.angebot_handwerker ?? [],
  })
  if (!sync.ok) return sync

  if (angebot.zahlungsplan) {
    await supabaseAdmin
      .from('auftraege')
      .update({ zahlungsplan: angebot.zahlungsplan })
      .eq('id', auftragId)
  }

  const teile: string[] = []
  if (sync.neu > 0) teile.push(`${sync.neu} neu`)
  if (sync.aktualisiert > 0) teile.push(`${sync.aktualisiert} aktualisiert`)
  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'notiz_intern',
    titel: 'Angebot-Korrektur übernommen',
    beschreibung: teile.length
      ? `Auftragspositionen: ${teile.join(', ')}.`
      : 'Angebot wurde gespeichert (keine Positionsänderung).',
    erstellt_von: user.id,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
  revalidatePath(`/angebote/${angebotId}`)
  return sync
}
