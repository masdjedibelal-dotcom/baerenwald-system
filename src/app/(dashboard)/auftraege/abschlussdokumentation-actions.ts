'use server'

import { revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeAuftragStatus } from '@/lib/status/write-auftrag-status'
import { listAuftragBautagebuch } from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import { formatAuftragsNr,auftragTitel } from '@/lib/auftraege/auftrag-liste-helpers'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { loadLeistungszeitraumAusRechnung } from '@/lib/auftraege/abschlussdokumentation-leistungszeitraum'
import {
  collectAbschlussBautagebuch,
  collectAbschlussFotoUrls,
  loadAbnahmeForAbschlussbericht,
} from '@/lib/auftraege/abschlussdokumentation-collect'
import { renderAbschlussdokumentationPdfBuffer } from '@/lib/auftraege/render-abschlussdokumentation-pdf'
import { persistAbschlussdokumentationPdf } from '@/lib/auftraege/persist-abschlussdokumentation-pdf'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'

export type AbschlussdokuOptionen = {
  mitBautagebuch: boolean
  mitFotos: boolean
  mitPreisen: boolean
}

async function getAuthUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function markAuftragAbgeschlossen(
  auftragId: string,
  beschreibung: string,
  perMail: boolean,
  abschlussPdfUrl?: string | null,
  emailLogId?: string | null
) {
  const detail = await loadAuftragDetail(auftragId)
  const now = new Date().toISOString()
  const existingAbnahme = detail?.abnahme_datum?.trim()?.slice(0, 10) || null
  const { error: __dbErr1 } = await writeAuftragStatus(supabaseAdmin, auftragId, 'abgeschlossen', {
    fortschritt: 100,
    // Nur setzen wenn Abnahme wirklich vorliegt — Abschluss ohne Abnahme lässt Feld leer.
    ...(existingAbnahme ? { abnahme_datum: existingAbnahme } : {}),
    ...(abschlussPdfUrl?.trim()
      ? {
          abschlussdokumentation_url: abschlussPdfUrl.trim(),
          ...(perMail ? { abschlussdokumentation_gesendet_at: now } : {}),
        }
      : perMail
        ? { abschlussdokumentation_gesendet_at: now }
        : {}),
    updated_at: now,
  })
  if (__dbErr1) logDbError('app/auftraege/abschlussdokumentation-actions:auftraege', __dbErr1)

  const { syncPortalLeadStatusAfterAuftragChange } = await import(
    '@/lib/portal/sync-portal-lead-status'
  )
  await syncPortalLeadStatusAfterAuftragChange({
    auftragId,
    status: 'abgeschlossen',
    leadId: detail?.lead_id ?? null,
    skipMieterMail: true,
  })

  const uid = await getAuthUserId()
  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'abschlussdoku_versendet',
    titel: perMail ? 'Abschlussdokumentation versendet' : 'Auftrag abgeschlossen',
    beschreibung,
    foto_urls: perMail && abschlussPdfUrl?.trim() ? [abschlussPdfUrl.trim()] : [],
    erstellt_von: uid,
    sichtbar_fuer_kunde: perMail,
    fuer_kunde_freigegeben: perMail,
    freigegeben_at: perMail ? now : null,
    email_log_id: perMail ? emailLogId ?? null : null,
  })

  revalidateAuftragDetail(auftragId)
}

async function buildAbschlussPdf(
  auftragId: string,
  optionen: AbschlussdokuOptionen
) {
  const detail = await loadAuftragDetail(auftragId)
  if (!detail?.kunden) return { ok: false as const, message: 'Auftrag/Kunde nicht gefunden' }

  const [bautagebuchZeilen, abnahme, bautagebuchRaw] = await Promise.all([
    optionen.mitBautagebuch
      ? collectAbschlussBautagebuch(auftragId)
      : Promise.resolve([]),
    loadAbnahmeForAbschlussbericht(auftragId),
    optionen.mitFotos || optionen.mitBautagebuch
      ? listAuftragBautagebuch(auftragId)
      : Promise.resolve([]),
  ])

  const mitBautagebuch = optionen.mitBautagebuch && bautagebuchZeilen.length > 0
  const fotoRows = optionen.mitFotos
    ? await collectAbschlussFotoUrls(detail, bautagebuchRaw, abnahme?.meta ?? null)
    : []
  const mitFotos = optionen.mitFotos && fotoRows.length > 0

  const positionen = [...(detail.auftrag_positionen ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const leistungszeitraum = await loadLeistungszeitraumAusRechnung(supabaseAdmin, auftragId)
  const pdfInput = {
    kunde: detail.kunden,
    auftragsNr: formatAuftragsNr(detail),
    projektTitel: auftragTitel(detail),
    positionen,
    bautagebuch: bautagebuchZeilen,
    fotoUrls: fotoRows,
    abnahmePunkte: abnahme?.punkte ?? null,
    abnahmeMaengel: abnahme?.maengel ?? null,
    abnahmeMeta: abnahme?.meta ?? null,
    abnahmeDatum: abnahme?.abnahmeDatum ?? null,
    abnahmeNotizen: abnahme?.notizen ?? null,
    abnahmeErgebnisLabel: abnahme?.ergebnisLabel ?? null,
    mitPreisen: optionen.mitPreisen,
    mitBautagebuch,
    mitFotos,
  }
  const buffer = await renderAbschlussdokumentationPdfBuffer(
    pdfInput,
    firm,
    detail,
    leistungszeitraum
  )

  return {
    ok: true as const,
    buffer,
    detail,
    bautagebuch: bautagebuchZeilen,
    fotoUrls: fotoRows.map((f) => f.url),
    hasAbnahme: Boolean(abnahme),
  }
}

export async function downloadAbschlussdokumentationPdf(
  auftragId: string,
  optionen: AbschlussdokuOptionen
): Promise<
  | { ok: true; pdfBase64: string; filename: string }
  | { ok: false; message: string }
> {
  const built = await buildAbschlussPdf(auftragId, optionen)
  if (!built.ok) return built
  return {
    ok: true,
    pdfBase64: built.buffer.toString('base64'),
    filename: `Abschlussbericht-${formatAuftragsNr(built.detail)}.pdf`,
  }
}

/** Erzeugt und speichert den Abschlussbericht (ohne Versand / ohne Auftrag abzuschließen).
 * Standard: Dokumentationsformat ohne Preise — Abrechnung bleibt Rechnung/Endabrechnung. */
export async function createAbschlussberichtPdf(
  auftragId: string,
  optionen: AbschlussdokuOptionen = {
    mitBautagebuch: true,
    mitFotos: true,
    mitPreisen: false,
  }
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const built = await buildAbschlussPdf(auftragId, optionen)
  if (!built.ok) return built

  const stored = await persistAbschlussdokumentationPdf(auftragId, built.buffer)
  if (!stored.ok) return stored

  const now = new Date().toISOString()
  await supabaseAdmin
    .from('auftraege')
    .update({
      abschlussdokumentation_url: stored.publicUrl,
      updated_at: now,
    })
    .eq('id', auftragId)

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'notiz',
    titel: 'Abschlussbericht erstellt',
    beschreibung: 'Abschlussbericht als PDF gespeichert.',
  })

  revalidateAuftragDetail(auftragId)
  return { ok: true, publicUrl: stored.publicUrl }
}

/** Ob der Wizard-Block „Abschlussbericht“ Sinn ergibt. */
export async function loadAbschlussberichtWizardHint(auftragId: string): Promise<{
  hasAbnahme: boolean
  hasBautagebuch: boolean
  hasBericht: boolean
  berichtUrl: string | null
  showBlock: boolean
}> {
  const detail = await loadAuftragDetail(auftragId)
  const bt = await listAuftragBautagebuch(auftragId)
  const hasAbnahme = Boolean(detail?.abnahme_protokoll_url)
  const hasBautagebuch = bt.length > 0
  const berichtUrl = detail?.abschlussdokumentation_url?.trim() || null
  return {
    hasAbnahme,
    hasBautagebuch,
    hasBericht: Boolean(berichtUrl),
    berichtUrl,
    showBlock: hasAbnahme || hasBautagebuch || Boolean(berichtUrl),
  }
}

/** Auftrag abschließen ohne E-Mail — Abschluss-PDF optional separat herunterladen. */
export async function finalizeAbschlussdokumentationOhneMail(
  auftragId: string,
  _optionen?: AbschlussdokuOptionen
): Promise<{ ok: true } | { ok: false; message: string }> {
  const detail = await loadAuftragDetail(auftragId)
  if (!detail) return { ok: false, message: 'Auftrag nicht gefunden' }
  if (detail.status === 'abgeschlossen') return { ok: false, message: 'Auftrag ist bereits abgeschlossen.' }

  await markAuftragAbgeschlossen(auftragId, 'Auftrag abgeschlossen.', false)
  return { ok: true }
}
