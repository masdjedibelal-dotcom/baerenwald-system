'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { listAuftragBautagebuch } from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import { loadLetztesAbnahmeprotokoll } from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import { persistPdfForRechnung } from '@/lib/rechnungen/persist-pdf'
import type { AuftragDetail } from '@/lib/types'
import { resolveRechnungProjektTitel } from '@/lib/angebote/resolve-angebot-leistungsumfang'
import { formatAuftragsNr, auftragTitel } from '@/lib/auftraege/auftrag-liste-helpers'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { getMailBranding } from '@/lib/mail-branding'
import {
  buildAbschlussdokumentationMail,
  defaultAbschlussdokumentationNachricht,
} from '@/lib/mail/abschlussdokumentation-mail'
import {
  kundeAngebotBegruessung,
  kundeAnredeKontextFromEmpfaenger,
  kundeRechnungsempfaengerAusStammdaten,
} from '@/lib/kunde-rechnungsempfaenger'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import { loadLeistungszeitraumAusRechnung } from '@/lib/auftraege/abschlussdokumentation-leistungszeitraum'
import { renderAbschlussdokumentationPdfBuffer } from '@/lib/auftraege/render-abschlussdokumentation-pdf'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { sendMail } from '@/lib/mail-service'
import { normalizeUrlList } from '@/lib/utils'

export type AbschlussdokuOptionen = {
  mitBautagebuch: boolean
  mitFotos: boolean
  mitHandwerker: boolean
  mitPreisen: boolean
}

async function getAuthUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function loadAbschlussMailKontext(
  auftragId: string,
  anredeOverride?: AngebotMailAnrede
): Promise<
  | {
      ok: true
      auftragsNr: string
      projektTitel: string
      anrede: AngebotMailAnrede
      begruessung: string
      kundeEmail: string
      kundeName: string
    }
  | { ok: false; message: string }
> {
  const detail = await loadAuftragDetail(auftragId)
  if (!detail?.kunden) return { ok: false, message: 'Auftrag/Kunde nicht gefunden' }

  const kunde = detail.kunden
  const email = kunde.email?.trim()
  if (!email) return { ok: false, message: 'Keine Kunden-E-Mail' }

  const empfaenger = kundeRechnungsempfaengerAusStammdaten(kunde)
  const anrede: AngebotMailAnrede =
    anredeOverride ?? (istPrivatKundeTyp(kunde.typ) ? 'du' : 'sie')
  const begruessung = kundeAngebotBegruessung(anrede, kundeAnredeKontextFromEmpfaenger(empfaenger))

  return {
    ok: true,
    auftragsNr: formatAuftragsNr(detail),
    projektTitel: resolveRechnungProjektTitel({
      angebot: detail.angebote ?? null,
      auftragTitel: detail.titel,
      fallback: auftragTitel(detail),
    }),
    anrede,
    begruessung,
    kundeEmail: email,
    kundeName: empfaenger.name,
  }
}

async function collectFotoUrls(
  detail: AuftragDetail,
  bautagebuch: Awaited<ReturnType<typeof listAuftragBautagebuch>>
): Promise<string[]> {
  const urls: string[] = []
  const push = (list: unknown) => {
    for (const u of normalizeUrlList(list)) {
      if (u && !urls.includes(u)) urls.push(u)
    }
  }
  for (const e of bautagebuch) push(e.foto_urls)
  for (const e of detail.formular_eintraege ?? []) push(e.foto_urls)
  return urls
}

export type AbschlussVoraussetzungen = {
  hasAbnahme: boolean
  hasRechnung: boolean
  rechnungId: string | null
  rechnungsnummer: string | null
}

export async function loadAbschlussVoraussetzungen(
  auftragId: string
): Promise<AbschlussVoraussetzungen> {
  const detail = await loadAuftragDetail(auftragId)
  const { data: rechnungen } = await supabaseAdmin
    .from('rechnungen')
    .select('id, rechnungsnummer, status')
    .eq('auftrag_id', auftragId)
    .neq('status', 'storniert')
    .order('created_at', { ascending: false })
    .limit(1)

  const rechnung = rechnungen?.[0] as
    | { id: string; rechnungsnummer: string | null; status: string | null }
    | undefined

  return {
    hasAbnahme: Boolean(detail?.abnahme_protokoll_url),
    hasRechnung: Boolean(rechnung?.id),
    rechnungId: rechnung?.id ?? null,
    rechnungsnummer: rechnung?.rechnungsnummer?.trim() || null,
  }
}

function validateAbschlussVoraussetzungen(v: AbschlussVoraussetzungen): { ok: false; message: string } | null {
  if (!v.hasAbnahme) {
    return {
      ok: false,
      message:
        'Bitte zuerst das Abnahmeprotokoll erstellen (ohne E-Mail speichern reicht).',
    }
  }
  if (!v.hasRechnung || !v.rechnungId) {
    return {
      ok: false,
      message: 'Bitte zuerst eine Rechnung erstellen (ohne E-Mail speichern reicht).',
    }
  }
  return null
}

async function pdfBufferFromUrl(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function buildAbschlussMailAnhaenge(
  auftragId: string,
  detail: AuftragDetail
): Promise<
  | {
      ok: true
      extraPdfAttachments: { filename: string; content: Buffer }[]
    }
  | { ok: false; message: string }
> {
  const voraus = await loadAbschlussVoraussetzungen(auftragId)
  const block = validateAbschlussVoraussetzungen(voraus)
  if (block) return block

  const extraPdfAttachments: { filename: string; content: Buffer }[] = []

  const abnahmeUrl = detail.abnahme_protokoll_url?.trim()
  if (abnahmeUrl) {
    const abnahmeBuf = await pdfBufferFromUrl(abnahmeUrl)
    if (!abnahmeBuf) {
      return { ok: false, message: 'Abnahmeprotokoll-PDF konnte nicht geladen werden.' }
    }
    extraPdfAttachments.push({
      filename: `Abnahmeprotokoll-${formatAuftragsNr(detail)}.pdf`,
      content: abnahmeBuf,
    })
  }

  const rechnungPdf = await persistPdfForRechnung(voraus.rechnungId!)
  if (!rechnungPdf.ok) return rechnungPdf
  extraPdfAttachments.push({
    filename: `Rechnung-${voraus.rechnungsnummer || voraus.rechnungId}.pdf`,
    content: rechnungPdf.buffer,
  })

  return { ok: true, extraPdfAttachments }
}

async function markAuftragAbgeschlossen(auftragId: string, beschreibung: string, perMail: boolean) {
  const detail = await loadAuftragDetail(auftragId)
  await supabaseAdmin
    .from('auftraege')
    .update({
      status: 'abgeschlossen',
      fortschritt: 100,
      abnahme_datum: detail?.abnahme_datum ?? new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq('id', auftragId)

  const uid = await getAuthUserId()
  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'abschlussdoku_versendet',
    titel: perMail ? 'Abschlussdokumentation versendet' : 'Auftrag abgeschlossen',
    beschreibung,
    erstellt_von: uid,
    sichtbar_fuer_kunde: perMail,
    fuer_kunde_freigegeben: perMail,
    freigegeben_at: perMail ? new Date().toISOString() : null,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
}

async function buildAbschlussPdf(
  auftragId: string,
  optionen: AbschlussdokuOptionen
) {
  const detail = await loadAuftragDetail(auftragId)
  if (!detail?.kunden) return { ok: false as const, message: 'Auftrag/Kunde nicht gefunden' }

  const bautagebuch = optionen.mitBautagebuch ? await listAuftragBautagebuch(auftragId) : []
  const fotoUrls = optionen.mitFotos ? await collectFotoUrls(detail, bautagebuch) : []

  const hwZeilen = (detail.auftrag_handwerker ?? []).map((r: NonNullable<AuftragDetail['auftrag_handwerker']>[number]) => {
    const n = r.handwerker?.name ?? '—'
    const g = r.gewerke?.name ?? '—'
    const f = r.handwerker?.firma ?? ''
    return `${n} — ${g}${f ? ` (${f})` : ''}`
  })

  const abnahme = detail.abnahme_protokoll_url ? await loadLetztesAbnahmeprotokoll(auftragId) : null

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
    bautagebuch,
    handwerkerZeilen: hwZeilen,
    fotoUrls,
    abnahmePunkte: abnahme?.punkte ?? null,
    mitPreisen: optionen.mitPreisen,
    mitBautagebuch: optionen.mitBautagebuch,
    mitFotos: optionen.mitFotos,
    mitHandwerker: optionen.mitHandwerker,
  }
  const buffer = await renderAbschlussdokumentationPdfBuffer(
    pdfInput,
    firm,
    detail,
    leistungszeitraum
  )

  return { ok: true as const, buffer, detail, bautagebuch, fotoUrls, hasAbnahme: Boolean(detail.abnahme_protokoll_url) }
}

export async function getAbschlussdokuVorschau(auftragId: string): Promise<{
  positionenCount: number
  bautagebuchCount: number
  fotoCount: number
  hasAbnahme: boolean
  hasRechnung: boolean
  rechnungsnummer: string | null
  handwerkerCount: number
}> {
  const detail = await loadAuftragDetail(auftragId)
  const bautagebuch = await listAuftragBautagebuch(auftragId)
  const fotos = detail
    ? await collectFotoUrls(detail, bautagebuch)
    : []
  const voraus = await loadAbschlussVoraussetzungen(auftragId)
  return {
    positionenCount: detail?.auftrag_positionen?.length ?? 0,
    bautagebuchCount: bautagebuch.length,
    fotoCount: fotos.length,
    hasAbnahme: voraus.hasAbnahme,
    hasRechnung: voraus.hasRechnung,
    rechnungsnummer: voraus.rechnungsnummer,
    handwerkerCount: detail?.auftrag_handwerker?.length ?? 0,
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
    filename: `Abschlussdokumentation-${formatAuftragsNr(built.detail)}.pdf`,
  }
}

export async function getAbschlussdokumentationMailDefaults(auftragId: string): Promise<
  | {
      ok: true
      defaultAnrede: AngebotMailAnrede
      defaultBetreff: string
      defaultNachricht: string
      defaultTo: string[]
      projektTitel: string
    }
  | { ok: false; message: string }
> {
  const ctx = await loadAbschlussMailKontext(auftragId)
  if (!ctx.ok) return ctx
  const branding = await getMailBranding(supabaseAdmin)
  const nachricht = defaultAbschlussdokumentationNachricht(ctx.anrede, ctx.projektTitel)
  const { betreff } = buildAbschlussdokumentationMail(
    {
      anrede: ctx.anrede,
      begruessung: ctx.begruessung,
      nachricht,
      projektTitel: ctx.projektTitel,
    },
    branding
  )
  return {
    ok: true,
    defaultAnrede: ctx.anrede,
    defaultBetreff: betreff,
    defaultNachricht: nachricht,
    defaultTo: [ctx.kundeEmail],
    projektTitel: ctx.projektTitel,
  }
}

export async function previewAbschlussdokumentationMail(input: {
  auftragId: string
  betreff: string
  nachricht: string
  anrede: AngebotMailAnrede
}): Promise<
  | { ok: true; html: string; defaultTo: string[]; defaultCc: string[] }
  | { ok: false; message: string }
> {
  const built = await buildAbschlussMail(input)
  if (!built.ok) return built
  return {
    ok: true,
    html: built.html,
    defaultTo: [built.kundeEmail],
    defaultCc: [],
  }
}

async function buildAbschlussMail(input: {
  auftragId: string
  betreff: string
  nachricht: string
  anrede: AngebotMailAnrede
}) {
  const ctx = await loadAbschlussMailKontext(input.auftragId, input.anrede)
  if (!ctx.ok) return ctx

  const branding = await getMailBranding(supabaseAdmin)
  const tpl = buildAbschlussdokumentationMail(
    {
      anrede: input.anrede,
      begruessung: ctx.begruessung,
      nachricht: input.nachricht,
      projektTitel: ctx.projektTitel,
    },
    branding
  )
  return {
    ok: true as const,
    html: tpl.html,
    betreff: input.betreff.trim() || tpl.betreff,
    kundeEmail: ctx.kundeEmail,
    kundeName: ctx.kundeName,
  }
}

export async function sendAbschlussdokumentationAnKunde(
  auftragId: string,
  optionen: AbschlussdokuOptionen,
  mail: {
    betreff: string
    nachricht: string
    anrede: AngebotMailAnrede
    to?: string[]
    cc?: string[]
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const mailBuilt = await buildAbschlussMail({
    auftragId,
    betreff: mail.betreff,
    nachricht: mail.nachricht,
    anrede: mail.anrede,
  })
  if (!mailBuilt.ok) return mailBuilt

  const toList = mail.to?.map((v) => v.trim()).filter(Boolean) ?? []
  if (!toList.length) return { ok: false, message: 'Bitte mindestens eine Empfänger-Adresse in An angeben.' }

  const built = await buildAbschlussPdf(auftragId, optionen)
  if (!built.ok) return built

  const anhaenge = await buildAbschlussMailAnhaenge(auftragId, built.detail)
  if (!anhaenge.ok) return anhaenge

  const sent = await sendMail({
    typ: 'abschlussdokumentation',
    an: toList,
    anName: mailBuilt.kundeName,
    cc: mail.cc?.length ? mail.cc : undefined,
    betreff: mailBuilt.betreff,
    html: mailBuilt.html,
    extraPdfAttachments: anhaenge.extraPdfAttachments,
    pdfBuffer: built.buffer,
    pdfName: `Abschlussdokumentation-${formatAuftragsNr(built.detail)}.pdf`,
    kundeId: built.detail.kunde_id ?? null,
    leadId: built.detail.lead_id ?? null,
    auftragId,
    kontextTyp: 'auftrag',
  })
  if (!sent.success) return { ok: false, message: sent.error ?? 'E-Mail fehlgeschlagen' }

  await markAuftragAbgeschlossen(
    auftragId,
    'Abschlussdokumentation mit Abnahmeprotokoll und Rechnung per E-Mail an den Kunden gesendet.',
    true
  )
  return { ok: true }
}

/** Auftrag abschließen ohne E-Mail — PDF nur lokal / für späteren Versand. */
export async function finalizeAbschlussdokumentationOhneMail(
  auftragId: string,
  optionen: AbschlussdokuOptionen
): Promise<{ ok: true } | { ok: false; message: string }> {
  const voraus = await loadAbschlussVoraussetzungen(auftragId)
  const block = validateAbschlussVoraussetzungen(voraus)
  if (block) return block

  const built = await buildAbschlussPdf(auftragId, optionen)
  if (!built.ok) return built

  await markAuftragAbgeschlossen(
    auftragId,
    'Auftrag abgeschlossen — Abschlussdokumentation erstellt (ohne E-Mail-Versand).',
    false
  )
  return { ok: true }
}
