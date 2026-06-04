'use server'

import { revalidatePath } from 'next/cache'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { updateGesamtUmsatz } from '@/app/actions/kunden'
import { getMailBranding } from '@/lib/mail-branding'
import { formatDatumDeFromIso } from '@/lib/mail/versand-helpers'
import { istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { resolveRechnungProjektTitel } from '@/lib/angebote/resolve-angebot-leistungsumfang'
import {
  kundeAngebotBegruessung,
  kundeAnredeKontextFromEmpfaenger,
  kundeRechnungsempfaengerAusStammdaten,
} from '@/lib/kunde-rechnungsempfaenger'
import { buildRechnungMail } from '@/lib/mail/rechnung-mail'
import { buildZahlungsbestaetigungMail } from '@/lib/mail/zahlungsbestaetigung-mail'
import { sendMail } from '@/lib/mail-service'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { persistPdfForRechnung } from '@/lib/rechnungen/persist-pdf'
import {
  berechneRechnungMitFirmeneinstellungen,
  isRechnungComplianceSchemaError,
  positionenFuerGutschrift,
  rechnungComplianceMigrationHinweis,
  rechnungInsertMitSchemaFallback,
  rechnungUpdateMitSchemaFallback,
} from '@/lib/rechnungen/rechnung-speichern'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { validateRechnungPflichtangaben } from '@/lib/rechnung-validierung'
import type { AngebotPosition, Kunde, RechnungStatus } from '@/lib/types'
import { insertKalenderAutoTermin, addDaysYmd } from '@/lib/kalender-auto-termine'
import { syncNeueLeistungenToPreisliste } from '@/app/(dashboard)/preislisten/actions'
import { syncInputsFromAngebotPositionen } from '@/lib/preislisten/sync-neue-leistungen'
import { loadKundeFuerRechnung } from '@/lib/rechnungen/kunde-select'
import {
  allocateRechnungsnummer,
  maybeUpgradeLegacyRechnungsnummer,
} from '@/lib/rechnungen/next-rechnungsnummer'

export type RechnungEntwurfPayload = {
  positionen: AngebotPosition[]
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  faellig_am: string | null
  rechnungsdatum?: string | null
  reverse_charge_13b?: boolean
  einleitung?: string | null
  hinweise?: string | null
}

async function validateVorSpeichern(
  supabase: ReturnType<typeof createClient>,
  kundeId: string,
  payload: RechnungEntwurfPayload
): Promise<{ ok: true; kunde: Kunde } | { ok: false; message: string }> {
  const { data: kunde, error } = await loadKundeFuerRechnung(supabase, kundeId)

  if (error || !kunde) return { ok: false, message: error?.message ?? 'Kunde nicht gefunden.' }

  const firm = await fetchFirmenEinstellungen(supabase)
  const artikelCount = payload.positionen.filter(
    (p) => p.gewerk_slug !== '__freitext__' && (p.lohn_netto !== 0 || p.material_netto !== 0)
  ).length

  const msg = validateRechnungPflichtangaben(firm, kunde as Kunde, {
    leistungszeitraum_von: payload.leistungszeitraum_von,
    leistungszeitraum_bis: payload.leistungszeitraum_bis,
    rechnungsdatum: payload.rechnungsdatum ?? new Date().toISOString().slice(0, 10),
    positionenCount: artikelCount,
  })
  if (msg) return { ok: false, message: msg }

  return { ok: true, kunde: kunde as Kunde }
}

export async function createRechnungEntwurf(input: {
  angebot_id: string | null
  auftrag_id: string | null
  kunde_id: string
} & RechnungEntwurfPayload): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()

  const valid = await validateVorSpeichern(supabase, input.kunde_id, input)
  if (!valid.ok) return valid

  await syncNeueLeistungenToPreisliste(syncInputsFromAngebotPositionen(input.positionen))

  const { positionen, berechnung } = await berechneRechnungMitFirmeneinstellungen(supabase, {
    positionen: input.positionen,
    reverse_charge_13b: input.reverse_charge_13b,
  })

  const numRes = await allocateRechnungsnummer('rechnung', supabaseAdmin)
  if (!numRes.ok) return { ok: false, message: numRes.message }
  const rechnungsnummer = numRes.nummer

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const rechnungsdatum =
    (input.rechnungsdatum && input.rechnungsdatum.trim()) ||
    new Date().toISOString().slice(0, 10)

  const { data: row, error } = await rechnungInsertMitSchemaFallback(
    supabase,
    {
      angebot_id: input.angebot_id,
      auftrag_id: input.auftrag_id,
      kunde_id: input.kunde_id,
      rechnungsnummer,
      status: 'entwurf' as RechnungStatus,
      positionen,
      leistungszeitraum_von: input.leistungszeitraum_von,
      leistungszeitraum_bis: input.leistungszeitraum_bis,
      faellig_am: input.faellig_am,
      rechnungsdatum,
      einleitung: input.einleitung?.trim() || null,
      hinweise: input.hinweise?.trim() || null,
      pdf_url: null,
      erstellt_von: user?.id ?? null,
    },
    berechnung,
    { reverse_charge_13b: Boolean(input.reverse_charge_13b) }
  )

  if (error || !row) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }

  if (input.faellig_am) {
    await insertKalenderAutoTermin({
      titel: `Fällig: ${rechnungsnummer}`,
      datum: input.faellig_am,
      typ: 'sonstiges',
      auftrag_id: input.auftrag_id,
    })
  }

  revalidatePath('/rechnungen')
  return { ok: true, id: row.id as string }
}

export async function updateRechnungEntwurf(
  id: string,
  input: RechnungEntwurfPayload & { kunde_id: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()

  const valid = await validateVorSpeichern(supabase, input.kunde_id, input)
  if (!valid.ok) return valid

  await syncNeueLeistungenToPreisliste(syncInputsFromAngebotPositionen(input.positionen))

  const { positionen, berechnung } = await berechneRechnungMitFirmeneinstellungen(supabase, {
    positionen: input.positionen,
    reverse_charge_13b: input.reverse_charge_13b,
  })

  const rechnungsdatum =
    (input.rechnungsdatum && input.rechnungsdatum.trim()) || undefined

  const { error } = await rechnungUpdateMitSchemaFallback(
    supabase,
    id,
    {
      positionen,
      leistungszeitraum_von: input.leistungszeitraum_von,
      leistungszeitraum_bis: input.leistungszeitraum_bis,
      faellig_am: input.faellig_am,
      einleitung: input.einleitung?.trim() || null,
      hinweise: input.hinweise?.trim() || null,
      ...(rechnungsdatum ? { rechnungsdatum } : {}),
      updated_at: new Date().toISOString(),
    },
    berechnung,
    { reverse_charge_13b: Boolean(input.reverse_charge_13b) }
  )

  if (error) return { ok: false, message: error.message }
  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${id}`)
  return { ok: true }
}

/** Gutschrift zur Originalrechnung (negative Beträge, neue Nummer GS-BW-…). */
export async function createGutschriftFromRechnung(
  rechnungId: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()

  const { data: orig, error: loadErr } = await supabase
    .from('rechnungen')
    .select('*')
    .eq('id', rechnungId)
    .maybeSingle()

  if (loadErr || !orig) {
    if (isRechnungComplianceSchemaError(loadErr?.message)) {
      return { ok: false, message: rechnungComplianceMigrationHinweis() }
    }
    return { ok: false, message: 'Rechnung nicht gefunden.' }
  }
  if ('beleg_typ' in orig && orig.beleg_typ === 'gutschrift') {
    return { ok: false, message: 'Von einer Gutschrift kann keine weitere Gutschrift erzeugt werden.' }
  }
  if (orig.status === 'storniert') {
    return { ok: false, message: 'Stornierte Rechnung — Gutschrift nicht möglich.' }
  }

  const positionenNeg = positionenFuerGutschrift(
    (orig.positionen as AngebotPosition[]) ?? []
  )

  const { positionen, berechnung } = await berechneRechnungMitFirmeneinstellungen(supabase, {
    positionen: positionenNeg,
    reverse_charge_13b: Boolean(orig.reverse_charge_13b),
  })

  const numRes = await allocateRechnungsnummer('gutschrift', supabaseAdmin)
  if (!numRes.ok) return { ok: false, message: numRes.message }
  const rechnungsnummer = numRes.nummer

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: row, error } = await rechnungInsertMitSchemaFallback(
    supabase,
    {
      angebot_id: orig.angebot_id,
      auftrag_id: orig.auftrag_id,
      kunde_id: orig.kunde_id,
      rechnungsnummer,
      status: 'entwurf' as RechnungStatus,
      positionen,
      leistungszeitraum_von: orig.leistungszeitraum_von,
      leistungszeitraum_bis: orig.leistungszeitraum_bis,
      faellig_am: null,
      rechnungsdatum: new Date().toISOString().slice(0, 10),
      pdf_url: null,
      erstellt_von: user?.id ?? null,
    },
    berechnung,
    {
      reverse_charge_13b: Boolean(orig.reverse_charge_13b),
      beleg_typ: 'gutschrift',
      bezug_rechnung_id: rechnungId,
    }
  )

  if (error || !row) return { ok: false, message: error?.message ?? 'Gutschrift fehlgeschlagen' }

  await supabase
    .from('rechnungen')
    .update({ status: 'storniert', updated_at: new Date().toISOString() })
    .eq('id', rechnungId)

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${rechnungId}`)
  revalidatePath(`/rechnungen/${row.id}`)
  return { ok: true, id: row.id as string }
}

export type UpdateRechnungStatusResult =
  | { ok: true; zahlungsbestaetigungGesendet?: boolean }
  | { ok: false; message: string }

async function sendZahlungsbestaetigungForRechnung(
  rechnungId: string
): Promise<{ ok: true } | { ok: false; message: string } | { ok: true; skipped: true }> {
  const supabase = createClient()

  type RechnungBezahltRow = {
    rechnungsnummer: string | null
    status: string | null
    beleg_typ: string | null
    auftrag_id: string | null
    kunde_id: string | null
    brutto: number | null
    kunden: Kunde | Kunde[] | null
    angebote: unknown
    auftraege: unknown
  }

  const { data: rec, error: loadErr } = await withCrmReadFallback<RechnungBezahltRow>(async (db) =>
    db
      .from('rechnungen')
      .select(
        `
      rechnungsnummer,
      status,
      beleg_typ,
      auftrag_id,
      kunde_id,
      brutto,
      kunden(name, email, typ, vorname, nachname),
      angebote(leistungsumfang, notizen),
      auftraege(titel, angebote(leistungsumfang, notizen))
    `
      )
      .eq('id', rechnungId)
      .maybeSingle()
  )

  if (loadErr || !rec) return { ok: false, message: loadErr?.message ?? 'Rechnung nicht gefunden' }
  if ((rec.beleg_typ as string | null) === 'gutschrift') return { ok: true, skipped: true }

  const kRaw = rec.kunden as Kunde | Kunde[] | null
  const kunde = Array.isArray(kRaw) ? kRaw[0] : kRaw
  const email = kunde?.email?.trim()
  if (!email) return { ok: true, skipped: true }

  const rechnungsnummer = await maybeUpgradeLegacyRechnungsnummer(
    supabase,
    rechnungId,
    rec.rechnungsnummer as string,
    String(rec.status ?? 'bezahlt'),
    (rec.beleg_typ as 'rechnung' | 'gutschrift') ?? 'rechnung'
  )

  const branding = await getMailBranding(supabaseAdmin)
  const anrede = istPrivatKundeTyp(kunde?.typ) ? 'du' : 'sie'
  const empfaenger = kundeRechnungsempfaengerAusStammdaten(kunde as Kunde)
  const begruessung = kundeAngebotBegruessung(anrede, kundeAnredeKontextFromEmpfaenger(empfaenger))

  const angRechnung = Array.isArray(rec.angebote) ? rec.angebote[0] : rec.angebote
  const aufRaw = rec.auftraege
  const auftrag = Array.isArray(aufRaw) ? aufRaw[0] : aufRaw
  const angAuftrag = auftrag?.angebote
    ? Array.isArray(auftrag.angebote)
      ? auftrag.angebote[0]
      : auftrag.angebote
    : null
  const projektTitel = resolveRechnungProjektTitel({
    angebot: angRechnung ?? angAuftrag,
    auftragTitel: (auftrag?.titel as string | null) ?? null,
    fallback: '',
  })

  const bezahltAm = formatDatumDeFromIso(new Date().toISOString())
  const tpl = buildZahlungsbestaetigungMail(
    {
      anrede,
      begruessung,
      rechnungsnummer,
      brutto: Number(rec.brutto ?? 0),
      bezahltAm,
      projektTitel: projektTitel || null,
    },
    branding
  )

  const mail = await sendMail({
    typ: 'zahlungsbestaetigung',
    an: email,
    anName: kunde?.name ?? null,
    betreff: tpl.betreff,
    html: tpl.html,
    kundeId: rec.kunde_id as string | null,
    auftragId: rec.auftrag_id as string | null,
    rechnungId,
  })
  if (!mail.success) return { ok: false, message: mail.error ?? 'Zahlungsbestätigung konnte nicht gesendet werden' }

  const now = new Date().toISOString()
  const auftragId = (rec.auftrag_id as string | null) ?? null
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (auftragId) {
    await insertAuftragTimelineEvent({
      auftrag_id: auftragId,
      typ: 'rechnung_bezahlt',
      titel: `Zahlung erhalten — ${rechnungsnummer}`,
      beschreibung: `Zahlungsbestätigung an ${email}`,
      erstellt_von: user?.id ?? null,
      sichtbar_fuer_kunde: true,
      fuer_kunde_freigegeben: true,
      freigegeben_at: now,
    })
  }

  return { ok: true }
}

export async function updateRechnungStatus(
  id: string,
  status: RechnungStatus
): Promise<UpdateRechnungStatusResult> {
  const supabase = createClient()

  const { data: before } = await supabase.from('rechnungen').select('status, beleg_typ').eq('id', id).maybeSingle()
  if (!before) return { ok: false, message: 'Rechnung nicht gefunden' }
  if (before.status === status) return { ok: true }

  let zahlungsbestaetigungGesendet = false

  if (status === 'bezahlt' && before.status !== 'bezahlt' && before.status !== 'storniert') {
    const mailRes = await sendZahlungsbestaetigungForRechnung(id)
    if (!mailRes.ok) return mailRes
    zahlungsbestaetigungGesendet = !('skipped' in mailRes && mailRes.skipped)
  }

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'gesendet') patch.gesendet_at = new Date().toISOString()
  if (status === 'bezahlt') patch.bezahlt_at = new Date().toISOString()
  const { error } = await supabase.from('rechnungen').update(patch).eq('id', id)
  if (error) return { ok: false, message: error.message }

  if (status === 'bezahlt') {
    const { data: r } = await supabase.from('rechnungen').select('kunde_id').eq('id', id).maybeSingle()
    if (r?.kunde_id) {
      await updateGesamtUmsatz(r.kunde_id as string)
    }
  }

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${id}`)
  const auftragId = (
    await supabase.from('rechnungen').select('auftrag_id').eq('id', id).maybeSingle()
  ).data?.auftrag_id as string | null | undefined
  if (auftragId) revalidatePath(`/auftraege/${auftragId}`)

  return { ok: true, zahlungsbestaetigungGesendet }
}

/** Rechnung per Mail (PDF + mail-templates + email_log). */
export async function sendRechnung(
  rechnungId: string,
  options?: { to?: string[]; cc?: string[] }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()

  type RechnungVersandRow = {
    rechnungsnummer: string | null
    status: string | null
    beleg_typ: string | null
    auftrag_id: string | null
    kunde_id: string | null
    faellig_am: string | null
    brutto: number | null
    kunden: Kunde | Kunde[] | null
    angebote: unknown
    auftraege: unknown
  }

  const { data: rec, error: loadErr } = await withCrmReadFallback<RechnungVersandRow>(async (db) =>
    db
      .from('rechnungen')
      .select(
        `
      rechnungsnummer,
      status,
      beleg_typ,
      auftrag_id,
      kunde_id,
      faellig_am,
      brutto,
      kunden(name, email, typ, vorname, nachname),
      angebote(leistungsumfang, notizen),
      auftraege(titel, angebote(leistungsumfang, notizen))
    `
      )
      .eq('id', rechnungId)
      .maybeSingle()
  )

  if (loadErr || !rec) return { ok: false, message: loadErr?.message ?? 'Rechnung nicht gefunden' }

  const rechnungsnummer = await maybeUpgradeLegacyRechnungsnummer(
    supabase,
    rechnungId,
    rec.rechnungsnummer as string,
    String(rec.status ?? 'entwurf'),
    (rec.beleg_typ as 'rechnung' | 'gutschrift') ?? 'rechnung'
  )
  rec.rechnungsnummer = rechnungsnummer

  const pdf = await persistPdfForRechnung(rechnungId)
  if (!pdf.ok) return pdf

  const kRaw = rec.kunden as Kunde | Kunde[] | null
  const kunde = Array.isArray(kRaw) ? kRaw[0] : kRaw
  const toList = options?.to?.map((v) => v.trim()).filter(Boolean) ?? []
  const email = kunde?.email?.trim()
  if (!toList.length && !email) return { ok: false, message: 'Kunden-E-Mail fehlt' }

  const branding = await getMailBranding(supabaseAdmin)
  const anrede = istPrivatKundeTyp(kunde?.typ) ? 'du' : 'sie'
  const empfaenger = kundeRechnungsempfaengerAusStammdaten(kunde as Kunde)
  const begruessung = kundeAngebotBegruessung(anrede, kundeAnredeKontextFromEmpfaenger(empfaenger))

  const angRechnung = Array.isArray(rec.angebote) ? rec.angebote[0] : rec.angebote
  const aufRaw = rec.auftraege
  const auftrag = Array.isArray(aufRaw) ? aufRaw[0] : aufRaw
  const angAuftrag = auftrag?.angebote
    ? Array.isArray(auftrag.angebote)
      ? auftrag.angebote[0]
      : auftrag.angebote
    : null
  const projektTitel = resolveRechnungProjektTitel({
    angebot: angRechnung ?? angAuftrag,
    auftragTitel: (auftrag?.titel as string | null) ?? null,
    fallback: '',
  })

  const tpl = buildRechnungMail(
    {
      anrede,
      begruessung,
      rechnungsnummer,
      brutto: Number(rec.brutto ?? 0),
      faelligAm: formatDatumDeFromIso(rec.faellig_am as string | null),
      projektTitel: projektTitel || null,
    },
    branding
  )

  const mail = await sendMail({
    typ: 'rechnung',
    an: toList.length ? toList : (email as string),
    cc: options?.cc?.map((v) => v.trim()).filter(Boolean),
    anName: kunde?.name ?? null,
    betreff: tpl.betreff,
    html: tpl.html,
    pdfBuffer: pdf.buffer,
    pdfName: `Rechnung-${rechnungsnummer}.pdf`,
    kundeId: rec.kunde_id as string | null,
    auftragId: rec.auftrag_id as string | null,
    rechnungId,
  })
  if (!mail.success) return { ok: false, message: mail.error ?? 'Versand fehlgeschlagen' }

  const now = new Date().toISOString()
  const auftragId = (rec.auftrag_id as string | null) ?? null
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (auftragId) {
    await insertAuftragTimelineEvent({
      auftrag_id: auftragId,
      typ: 'rechnung_gesendet',
      titel: `Rechnung ${rechnungsnummer} versendet`,
      beschreibung: `An ${(toList.length ? toList : [email]).filter(Boolean).join(', ')}`,
      erstellt_von: user?.id ?? null,
      sichtbar_fuer_kunde: true,
      fuer_kunde_freigegeben: true,
      freigegeben_at: now,
    })
  }

  const { error } = await supabase
    .from('rechnungen')
    .update({
      status: 'gesendet' as RechnungStatus,
      gesendet_at: now,
      updated_at: now,
    })
    .eq('id', rechnungId)

  if (error) return { ok: false, message: error.message }

  const heute = new Date().toISOString().slice(0, 10)
  await insertKalenderAutoTermin({
    titel: rec?.rechnungsnummer
      ? `Zahlungserinnerung: ${rec.rechnungsnummer}`
      : 'Zahlungserinnerung Rechnung',
    datum: addDaysYmd(heute, 7),
    typ: 'sonstiges',
    auftrag_id: (rec?.auftrag_id as string | null) ?? null,
  })

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${rechnungId}`)
  if (auftragId) revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function sendRechnungErinnerung(
  rechnungId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  void rechnungId
  return { ok: true }
}
