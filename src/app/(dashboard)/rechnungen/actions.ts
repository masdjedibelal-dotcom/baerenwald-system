'use server'

import { revalidatePath } from 'next/cache'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { updateGesamtUmsatz } from '@/app/actions/kunden'
import { getMailBranding } from '@/lib/get-mail-branding'
import { formatDatumDeFromIso } from '@/lib/mail/versand-helpers'
import { istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { resolveRechnungProjektTitel } from '@/lib/angebote/resolve-angebot-leistungsumfang'
import {
  kundeAngebotBegruessung,
  kundeAnredeKontextFromEmpfaenger,
  kundeRechnungsempfaengerAusStammdaten,
} from '@/lib/kunde-rechnungsempfaenger'
import {
  buildRechnungMail,
  rechnungKorrekturMailBetreff,
  sanitizeRechnungMailBetreff,
} from '@/lib/mail/rechnung-mail'
import { buildZahlungserinnerungMail } from '@/lib/mail-templates'
import {
  zahlungserinnerungZahlbarBis,
  type ZahlungserinnerungStufe,
} from '@/lib/mail/zahlungserinnerung-mail'
import {
  mahnungBetragKontextFuerRechnung,
  mahnungBetragMailFelder,
} from '@/lib/rechnungen/mahnung-betrag'
import { tageSeitFaelligkeitRechnung } from '@/lib/rechnungen/mahnverlauf'
import { buildZahlungsbestaetigungMail } from '@/lib/mail/zahlungsbestaetigung-mail'
import { sendMail } from '@/lib/mail-service'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { persistPdfForRechnung } from '@/lib/rechnungen/persist-pdf'
import { linkRechnungKorrekturKette } from '@/lib/rechnungen/rechnung-korrektur'
import {
  berechneRechnungMitFirmeneinstellungen,
  isRechnungComplianceSchemaError,
  positionenFuerGutschrift,
  rechnungComplianceMigrationHinweis,
  rechnungInsertMitSchemaFallback,
  rechnungUpdateMitSchemaFallback,
} from '@/lib/rechnungen/rechnung-speichern'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import {
  berechneRechnungZahlungszielUpdate,
  mahnungFelderBeiFaelligkeitAenderung,
  rechnungZahlungszielIstBearbeitbar,
} from '@/lib/rechnungen/rechnung-zahlungsziel-patch'
import type { ZahlfristSeg } from '@/lib/zahlfrist'
import { validateRechnungPflichtangaben } from '@/lib/rechnung-validierung'
import type { RechnungBerechnung } from '@/lib/rechnung-berechnung'
import type { AngebotPosition, Kunde, RechnungStatus } from '@/lib/types'
import { syncNeueLeistungenToPreisliste } from '@/app/(dashboard)/preislisten/actions'
import { syncInputsFromAngebotPositionen } from '@/lib/preislisten/sync-neue-leistungen'
import { loadKundeFuerRechnung } from '@/lib/rechnungen/kunde-select'
import { ensureRechnungsnummerFuerVersand } from '@/lib/rechnungen/next-rechnungsnummer'

export type RechnungEntwurfPayload = {
  positionen: AngebotPosition[]
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  faellig_am: string | null
  rechnungsdatum?: string | null
  reverse_charge_13b?: boolean
  hinweis_35a?: boolean | null
  einleitung?: string | null
  hinweise?: string | null
  mail_einleitung?: string | null
  mail_betreff?: string | null
  zahlungsbedingungen?: string | null
  rechnung_art?: 'voll' | 'abschlag' | 'schluss'
  abschlag_index?: number | null
  zahlungsplan_abschlag_id?: string | null
  mwst_satz?: number
  /** Listenbetrag = Summe zugeordneter Leistungen (Plan-Prozente nur Info). */
  liste_berechnung?: RechnungBerechnung | null
  ist_wiederkehrend?: boolean
  wiederkehr_turnus?: string | null
  /** Entwurf: keine Nummer — offizielle RE erst beim Versand (siehe ensureRechnungsnummerFuerVersand). */
  rechnungsnummer?: string | null
  /** Empfänger-Ansprechpartner (null = Hauptkontakt). */
  ansprechpartner_id?: string | null
  /** Ausführungsort / Verwaltungsobjekt. */
  kunde_objekt_id?: string | null
  /** Anlage/Teil am Ausführungsort. */
  objekt_anlage_id?: string | null
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

  const abschlagEntwurfOhnePositionen =
    (payload.rechnung_art === 'abschlag' || payload.rechnung_art === 'schluss') &&
    artikelCount === 0

  const msg = validateRechnungPflichtangaben(firm, kunde as Kunde, {
    leistungszeitraum_von: payload.leistungszeitraum_von,
    leistungszeitraum_bis: payload.leistungszeitraum_bis,
    rechnungsdatum: payload.rechnungsdatum ?? new Date().toISOString().slice(0, 10),
    positionenCount: abschlagEntwurfOhnePositionen ? 1 : artikelCount,
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

  const { positionen, berechnung: berechnungVoll } = await berechneRechnungMitFirmeneinstellungen(
    supabase,
    {
      positionen: input.positionen,
      reverse_charge_13b: input.reverse_charge_13b,
    }
  )
  const berechnung = input.liste_berechnung ?? berechnungVoll

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
      rechnungsnummer: null,
      ansprechpartner_id: input.ansprechpartner_id?.trim() || null,
      kunde_objekt_id: input.kunde_objekt_id?.trim() || null,
      objekt_anlage_id: input.objekt_anlage_id?.trim() || null,
      status: 'entwurf' as RechnungStatus,
      positionen,
      leistungszeitraum_von: input.leistungszeitraum_von,
      leistungszeitraum_bis: input.leistungszeitraum_bis,
      faellig_am: input.faellig_am,
      rechnungsdatum,
      einleitung: input.einleitung?.trim() || null,
      hinweise: input.hinweise?.trim() || null,
      mail_einleitung: input.mail_einleitung?.trim() || null,
      mail_betreff: input.mail_betreff?.trim() || null,
      zahlungsbedingungen: input.zahlungsbedingungen?.trim() || null,
      rechnung_art: input.rechnung_art ?? 'voll',
      abschlag_index: input.abschlag_index ?? null,
      zahlungsplan_abschlag_id: input.zahlungsplan_abschlag_id ?? null,
      hinweis_35a: input.hinweis_35a ?? null,
      pdf_url: null,
      erstellt_von: user?.id ?? null,
      ist_wiederkehrend: input.ist_wiederkehrend === true,
      wiederkehr_turnus:
        input.ist_wiederkehrend === true
          ? input.wiederkehr_turnus?.trim() || null
          : null,
    },
    berechnung,
    { reverse_charge_13b: Boolean(input.reverse_charge_13b) }
  )

  if (error || !row) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }

  revalidatePath('/rechnungen')
  revalidatePath('/vorgaenge')
  return { ok: true, id: row.id as string }
}

export async function updateRechnungEntwurf(
  id: string,
  input: RechnungEntwurfPayload & { kunde_id: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const supabase = gate.db

  const valid = await validateVorSpeichern(supabase, input.kunde_id, input)
  if (!valid.ok) return valid

  await syncNeueLeistungenToPreisliste(syncInputsFromAngebotPositionen(input.positionen))

  const { positionen, berechnung: berechnungVoll } = await berechneRechnungMitFirmeneinstellungen(
    supabase,
    {
      positionen: input.positionen,
      reverse_charge_13b: input.reverse_charge_13b,
    }
  )
  const berechnung = input.liste_berechnung ?? berechnungVoll

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
      mail_einleitung: input.mail_einleitung?.trim() || null,
      mail_betreff: input.mail_betreff?.trim() || null,
      zahlungsbedingungen: input.zahlungsbedingungen?.trim() || null,
      hinweis_35a: input.hinweis_35a ?? null,
      ...(input.ansprechpartner_id !== undefined
        ? { ansprechpartner_id: input.ansprechpartner_id?.trim() || null }
        : {}),
      ...(input.kunde_objekt_id !== undefined
        ? { kunde_objekt_id: input.kunde_objekt_id?.trim() || null }
        : {}),
      ...(input.objekt_anlage_id !== undefined
        ? { objekt_anlage_id: input.objekt_anlage_id?.trim() || null }
        : {}),
      ...(input.rechnung_art ? { rechnung_art: input.rechnung_art } : {}),
      ...(input.abschlag_index != null ? { abschlag_index: input.abschlag_index } : {}),
      ...(input.zahlungsplan_abschlag_id
        ? { zahlungsplan_abschlag_id: input.zahlungsplan_abschlag_id }
        : {}),
      ...(input.ist_wiederkehrend !== undefined
        ? {
            ist_wiederkehrend: input.ist_wiederkehrend === true,
            wiederkehr_turnus:
              input.ist_wiederkehrend === true
                ? input.wiederkehr_turnus?.trim() || null
                : null,
          }
        : {}),
      ...(rechnungsdatum ? { rechnungsdatum } : {}),
      updated_at: new Date().toISOString(),
    },
    berechnung,
    { reverse_charge_13b: Boolean(input.reverse_charge_13b) }
  )

  if (error) return { ok: false, message: error.message }

  // Korrektur-Entwurf: Art bleibt 'gutschrift' (DB-Check) — UI leitet Status aus status ab
  // absichtlich kein Update auf ungültige Werte wie 'gespeichert'/'entwurf'

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${id}`)
  revalidatePath('/vorgaenge')
  return { ok: true }
}

/** Fälligkeit / Zahlungsziel nachträglich — ohne Storno (Entwurf + versendet). */
export async function updateRechnungZahlungsziel(input: {
  rechnungId: string
  zahlfrist: ZahlfristSeg
  zahlfristDatum?: string
}): Promise<{ ok: true; faellig_am: string } | { ok: false; message: string }> {
  const rechnungId = input.rechnungId?.trim()
  if (!rechnungId) return { ok: false, message: 'Rechnung fehlt.' }

  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const supabase = gate.db
  const { data: rec, error: loadErr } = await supabase
    .from('rechnungen')
    .select('id, status, beleg_typ, richtung, faellig_am, rechnungsdatum, created_at, zahlungsbedingungen')
    .eq('id', rechnungId)
    .maybeSingle()

  if (loadErr || !rec) return { ok: false, message: loadErr?.message ?? 'Rechnung nicht gefunden.' }

  if (
    !rechnungZahlungszielIstBearbeitbar({
      status: rec.status as string,
      beleg_typ: rec.beleg_typ as string,
      richtung: rec.richtung as string,
    })
  ) {
    return { ok: false, message: 'Zahlungsziel kann für diese Rechnung nicht mehr geändert werden.' }
  }

  const rechnungsdatum =
    String(rec.rechnungsdatum ?? '').trim().slice(0, 10) ||
    String(rec.created_at ?? '').trim().slice(0, 10) ||
    new Date().toISOString().slice(0, 10)

  const { faellig_am, zahlungsbedingungen } = berechneRechnungZahlungszielUpdate({
    zahlfrist: input.zahlfrist,
    zahlfristDatum: input.zahlfristDatum?.trim()?.slice(0, 10) ?? '',
    rechnungsdatum,
    bisherigeZahlungsbedingungen: rec.zahlungsbedingungen as string | null,
  })

  const { error } = await supabase
    .from('rechnungen')
    .update({
      faellig_am,
      zahlungsbedingungen,
      ...mahnungFelderBeiFaelligkeitAenderung(faellig_am, rec.faellig_am as string | null),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rechnungId)

  if (error) return { ok: false, message: error.message }

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${rechnungId}`)
  revalidatePath('/vorgaenge')
  return { ok: true, faellig_am }
}

/** Gutschrift zur Originalrechnung (negative Beträge, neue Nummer GS-BW-…). */
export async function createGutschriftFromRechnung(
  rechnungId: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const supabase = gate.db

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

  const { data: row, error } = await rechnungInsertMitSchemaFallback(
    supabase,
    {
      angebot_id: orig.angebot_id,
      auftrag_id: orig.auftrag_id,
      kunde_id: orig.kunde_id,
      rechnungsnummer: null,
      status: 'entwurf' as RechnungStatus,
      positionen,
      leistungszeitraum_von: orig.leistungszeitraum_von,
      leistungszeitraum_bis: orig.leistungszeitraum_bis,
      faellig_am: null,
      rechnungsdatum: new Date().toISOString().slice(0, 10),
      pdf_url: null,
      erstellt_von: gate.user.id,
      zahlungsplan_abschlag_id: orig.zahlungsplan_abschlag_id ?? null,
      rechnung_art: orig.rechnung_art ?? null,
      abschlag_index: orig.abschlag_index ?? null,
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
  revalidatePath('/vorgaenge')
  return { ok: true, id: row.id as string }
}

/**
 * Rechnung korrigieren:
 * - Entwurf → Client öffnet Wizard (mode: direkt)
 * - Gesendet/Bezahlt → Storno-Gutschrift + neue RE als Entwurf (mode: storno_neu)
 */
export async function korrigiereRechnung(rechnungId: string): Promise<
  | { ok: true; mode: 'direkt' }
  | { ok: true; mode: 'storno_neu'; stornoId: string; neuId: string }
  | { ok: false; message: string }
> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const supabase = gate.db

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

  const status = String(orig.status ?? 'entwurf')
  const belegTyp = ('beleg_typ' in orig && orig.beleg_typ) || 'rechnung'

  if (belegTyp === 'gutschrift') {
    return { ok: false, message: 'Gutschriften werden nicht über „Korrigieren“ geändert.' }
  }
  if (status === 'storniert') {
    return { ok: false, message: 'Stornierte Rechnung — keine Korrektur möglich.' }
  }
  if (status === 'entwurf') {
    return { ok: true, mode: 'direkt' }
  }
  if (status !== 'gesendet' && status !== 'bezahlt') {
    return { ok: false, message: 'Status erlaubt keine Korrektur.' }
  }

  // 1) Storno-Beleg (Gutschrift, negativ, mit Bezug)
  const gutschrift = await createGutschriftFromRechnung(rechnungId)
  if (!gutschrift.ok) return gutschrift

  // 2) Neue Rechnung als Entwurf (Nummer erst beim Versand)
  const positionenRaw = (orig.positionen as AngebotPosition[]) ?? []
  const { positionen, berechnung } = await berechneRechnungMitFirmeneinstellungen(supabase, {
    positionen: positionenRaw,
    reverse_charge_13b: Boolean(orig.reverse_charge_13b),
  })

  const { data: neu, error: neuErr } = await rechnungInsertMitSchemaFallback(
    supabase,
    {
      angebot_id: orig.angebot_id,
      auftrag_id: orig.auftrag_id,
      kunde_id: orig.kunde_id,
      rechnungsnummer: null,
      status: 'entwurf' as RechnungStatus,
      positionen,
      leistungszeitraum_von: orig.leistungszeitraum_von,
      leistungszeitraum_bis: orig.leistungszeitraum_bis,
      faellig_am: null,
      rechnungsdatum: new Date().toISOString().slice(0, 10),
      pdf_url: null,
      erstellt_von: gate.user.id,
      einleitung: orig.einleitung ?? null,
      hinweise: orig.hinweise ?? null,
      zahlungsbedingungen: orig.zahlungsbedingungen ?? null,
      mail_einleitung: null,
      mail_betreff: null,
      ansprechpartner_id: orig.ansprechpartner_id ?? null,
      kunde_objekt_id: orig.kunde_objekt_id ?? null,
      objekt_anlage_id: orig.objekt_anlage_id ?? null,
      reverse_charge_13b: Boolean(orig.reverse_charge_13b),
      hinweis_35a: orig.hinweis_35a ?? null,
      rechnung_art: orig.rechnung_art ?? 'voll',
      abschlag_index: orig.abschlag_index ?? null,
      zahlungsplan_abschlag_id: orig.zahlungsplan_abschlag_id ?? null,
      korrektur_von: rechnungId,
      korrektur_art: 'gutschrift',
    },
    berechnung,
    {
      reverse_charge_13b: Boolean(orig.reverse_charge_13b),
      beleg_typ: 'rechnung',
      bezug_rechnung_id: null,
    }
  )

  if (neuErr || !neu) {
    return { ok: false, message: neuErr?.message ?? 'Neue Rechnung konnte nicht angelegt werden.' }
  }

  const link = await linkRechnungKorrekturKette(supabase, {
    originalId: rechnungId,
    neuId: neu.id as string,
    art: 'gutschrift',
  })
  if (!link.ok) {
    console.warn('[korrigiereRechnung] link:', link.message)
  }

  // Sicherstellen: korrektur_von + ersetzt_durch (sonst kein Storno-Anhang / keine Korrektur-Mail)
  const { data: linked } = await supabase
    .from('rechnungen')
    .select('korrektur_von')
    .eq('id', neu.id)
    .maybeSingle()
  if (!String(linked?.korrektur_von ?? '').trim()) {
    const { error: forceErr } = await supabase
      .from('rechnungen')
      .update({
        korrektur_von: rechnungId,
        korrektur_art: 'gutschrift',
        updated_at: new Date().toISOString(),
      })
      .eq('id', neu.id)
    if (forceErr) {
      console.warn('[korrigiereRechnung] korrektur_von force:', forceErr.message)
    }
  }
  const { data: origLinked } = await supabase
    .from('rechnungen')
    .select('ersetzt_durch')
    .eq('id', rechnungId)
    .maybeSingle()
  if (String(origLinked?.ersetzt_durch ?? '').trim() !== String(neu.id)) {
    const { error: forceOrig } = await supabase
      .from('rechnungen')
      .update({
        ersetzt_durch: neu.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rechnungId)
    if (forceOrig) {
      console.warn('[korrigiereRechnung] ersetzt_durch force:', forceOrig.message)
    }
  }

  // Storno-Gutschrift: Bezug bleibt auf Original; optional Hinweis auf Nachfolger in Notizen weglassen
  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${rechnungId}`)
  revalidatePath(`/rechnungen/${gutschrift.id}`)
  revalidatePath(`/rechnungen/${neu.id}`)
  revalidatePath('/vorgaenge')
  if (orig.auftrag_id) revalidatePath(`/auftraege/${orig.auftrag_id}`)

  return {
    ok: true,
    mode: 'storno_neu',
    stornoId: gutschrift.id,
    neuId: neu.id as string,
  }
}

/**
 * Soft-Storno ohne Ersatzbeleg — Entwurf oder gesendet (nicht bezahlt).
 * Gibt die Planzeile wieder frei für „neu stellen“.
 */
export async function storniereRechnungOhneErsatz(
  rechnungId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const { data: orig, error } = await gate.db
    .from('rechnungen')
    .select('status, beleg_typ')
    .eq('id', rechnungId)
    .maybeSingle()

  if (error || !orig) return { ok: false, message: 'Rechnung nicht gefunden.' }
  const status = String(orig.status)
  if (status === 'bezahlt') {
    return {
      ok: false,
      message:
        'Bezahlte Rechnung: bitte „Rechnung korrigieren“ (Storno-Gutschrift) auf der Rechnungsseite nutzen.',
    }
  }
  if (status !== 'gesendet' && status !== 'entwurf') {
    return {
      ok: false,
      message: 'Ohne Ersatz nur bei Entwurf oder gesendeten, noch nicht bezahlten Rechnungen.',
    }
  }
  return updateRechnungStatus(rechnungId, 'storniert')
}

/**
 * Soft-Storno zurücknehmen (nur wenn keine Storno-Gutschrift mit Bezug existiert).
 */
export async function nehmeRechnungStornoZurueck(
  rechnungId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const supabase = gate.db
  const { data: orig, error } = await supabase
    .from('rechnungen')
    .select('id, status, beleg_typ')
    .eq('id', rechnungId)
    .maybeSingle()

  if (error || !orig) return { ok: false, message: 'Rechnung nicht gefunden.' }
  if (String(orig.status) !== 'storniert') {
    return { ok: false, message: 'Nur stornierte Rechnungen können zurückgenommen werden.' }
  }
  if (String(orig.beleg_typ ?? 'rechnung') === 'gutschrift') {
    return { ok: false, message: 'Gutschriften werden so nicht zurückgenommen.' }
  }

  const { data: gutschriften } = await supabase
    .from('rechnungen')
    .select('id')
    .eq('bezug_rechnung_id', rechnungId)
    .eq('beleg_typ', 'gutschrift')
    .limit(1)

  if ((gutschriften ?? []).length > 0) {
    return {
      ok: false,
      message:
        'Es existiert bereits eine Storno-Gutschrift. Bitte die Nachfolger-Rechnung nutzen — Soft-Storno ist nicht rückgängig.',
    }
  }

  return updateRechnungStatus(rechnungId, 'gesendet')
}

export type UpdateRechnungStatusResult =
  | {
      ok: true
      zahlungsbestaetigungGesendet?: boolean
      partnerUeberwiesenNotified?: boolean
    }
  | { ok: false; message: string }

export type UpdateRechnungStatusOptions = {
  /** Zahlungsbestätigung an Kunden — Standard: aus (nur Status ändern). */
  notifyKunde?: boolean
  /** Eingangsrechnung: Partner „Rechnung wurde überwiesen“ — Standard: aus. */
  notifyPartner?: boolean
}

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
    reverse_charge_13b?: boolean | null
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
      reverse_charge_13b,
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

  const numRes = await ensureRechnungsnummerFuerVersand(
    supabase,
    rechnungId,
    rec.rechnungsnummer as string | null,
    (rec.beleg_typ as 'rechnung' | 'gutschrift') ?? 'rechnung'
  )
  if (!numRes.ok) return numRes
  const rechnungsnummer = numRes.nummer

  const branding = await getMailBranding(supabaseAdmin)
  const anrede = 'sie'
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
      reverseCharge: Boolean(rec.reverse_charge_13b),
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
      email_log_id: mail.emailLogId ?? null,
    })
  }

  return { ok: true }
}

export async function updateRechnungStatus(
  id: string,
  status: RechnungStatus,
  options?: UpdateRechnungStatusOptions
): Promise<UpdateRechnungStatusResult> {
  const rechnungId = id?.trim()
  if (!rechnungId) return { ok: false, message: 'Rechnung nicht gefunden' }

  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const db = gate.db

  const notifyKunde = options?.notifyKunde === true

  const { data: before, error: loadErr } = await db
    .from('rechnungen')
    .select(
      'status, beleg_typ, auftrag_id, rechnung_art, rechnungsnummer, richtung, handwerker_id, angebot_handwerker_id, gesendet_at, bezahlt_at, kunde_id'
    )
    .eq('id', rechnungId)
    .maybeSingle()
  if (loadErr) return { ok: false, message: loadErr.message }
  if (!before) return { ok: false, message: 'Rechnung nicht gefunden' }
  if (before.status === status) return { ok: true }

  const isEingehend = String(before.richtung ?? '') === 'eingehend'

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  const vorherBezahlt = before.status === 'bezahlt'
  // Storno zurücknehmen darf das echte Versanddatum nicht auf „heute“ überschreiben.
  if (status === 'gesendet' && !before.gesendet_at) {
    patch.gesendet_at = new Date().toISOString()
  }
  if (status === 'bezahlt' && !before.bezahlt_at) {
    patch.bezahlt_at = new Date().toISOString()
  }
  // F-201: Revert bezahlt → gesendet muss KPI/Zahlplan nicht verfälschen.
  if (status === 'gesendet' && vorherBezahlt) {
    patch.bezahlt_at = null
  }
  const { error } = await db.from('rechnungen').update(patch).eq('id', rechnungId)
  if (error) return { ok: false, message: error.message }

  if (!isEingehend) {
    const kundeId = (before.kunde_id as string | null)?.trim()
    if (kundeId && (status === 'bezahlt' || (status === 'gesendet' && vorherBezahlt))) {
      await updateGesamtUmsatz(kundeId)
    }
  }

  if (
    !isEingehend &&
    (status === 'gesendet' || status === 'bezahlt') &&
    before.status !== 'gesendet' &&
    before.status !== 'bezahlt'
  ) {
    const { completeAuftragNachEndabrechnung } = await import(
      '@/app/(dashboard)/auftraege/actions'
    )
    await completeAuftragNachEndabrechnung({
      auftragId: before.auftrag_id as string | null,
      rechnungArt: before.rechnung_art as string | null,
      rechnungsnummer: before.rechnungsnummer as string | null,
      belegTyp: before.beleg_typ as string | null,
    })
  }

  let zahlungsbestaetigungGesendet = false
  let partnerUeberwiesenNotified = false

  if (
    isEingehend &&
    status === 'bezahlt' &&
    before.status !== 'bezahlt' &&
    before.status !== 'storniert'
  ) {
    const { syncEingangsrechnungUeberwiesen } = await import(
      '@/lib/rechnungen/sync-eingangsrechnung-ueberwiesen'
    )
    const sync = await syncEingangsrechnungUeberwiesen({
      rechnungId,
      angebotHandwerkerId: (before.angebot_handwerker_id as string | null) ?? null,
      handwerkerId: (before.handwerker_id as string | null) ?? null,
      auftragId: (before.auftrag_id as string | null) ?? null,
      rechnungsnummer: (before.rechnungsnummer as string | null) ?? null,
    })
    partnerUeberwiesenNotified = sync.partnerNotified
  } else if (
    notifyKunde &&
    status === 'bezahlt' &&
    before.status !== 'bezahlt' &&
    before.status !== 'storniert'
  ) {
    const mailRes = await sendZahlungsbestaetigungForRechnung(rechnungId)
    if (mailRes.ok) {
      zahlungsbestaetigungGesendet = !('skipped' in mailRes && mailRes.skipped)
    } else {
      console.warn('[updateRechnungStatus] Zahlungsbestätigung:', mailRes.message)
    }
  }

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${rechnungId}`)
  revalidatePath('/vorgaenge')
  const auftragId = (before.auftrag_id as string | null | undefined) ?? null
  if (auftragId) revalidatePath(`/auftraege/${auftragId}`)

  return { ok: true, zahlungsbestaetigungGesendet, partnerUeberwiesenNotified }
}

/** Zahlungsbestätigung nachträglich senden (Rechnung muss bereits bezahlt sein). */
export async function sendZahlungsbestaetigung(
  rechnungId: string
): Promise<{ ok: true; skipped?: boolean } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const { data: rec } = await gate.db
    .from('rechnungen')
    .select('status')
    .eq('id', rechnungId)
    .maybeSingle()
  if (!rec) return { ok: false, message: 'Rechnung nicht gefunden' }
  if (rec.status !== 'bezahlt') {
    return { ok: false, message: 'Nur bei Status „Bezahlt“ möglich.' }
  }
  const mailRes = await sendZahlungsbestaetigungForRechnung(rechnungId)
  if (!mailRes.ok) return mailRes
  if ('skipped' in mailRes && mailRes.skipped) return { ok: true, skipped: true }
  revalidatePath(`/rechnungen/${rechnungId}`)
  return { ok: true }
}

/** Rechnung per Mail (PDF + mail-templates + email_log). */
export async function sendRechnung(
  rechnungId: string,
  options?: { to?: string[]; cc?: string[]; mitAbschlussbericht?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const supabase = gate.db

  type RechnungVersandRow = {
    rechnungsnummer: string | null
    status: string | null
    beleg_typ: string | null
    auftrag_id: string | null
    kunde_id: string | null
    faellig_am: string | null
    brutto: number | null
    mail_einleitung?: string | null
    mail_betreff?: string | null
    rechnung_art?: string | null
    reverse_charge_13b?: boolean | null
    ansprechpartner_id?: string | null
    korrektur_von?: string | null
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
      mail_einleitung,
      mail_betreff,
      rechnung_art,
      reverse_charge_13b,
      ansprechpartner_id,
      korrektur_von,
      kunden(name, email, typ, vorname, nachname, ansprechpartner, kunden_ansprechpartner(id, name, email, telefon, rolle, ist_primaer, sort_order)),
      angebote(id, leistungsumfang, notizen),
      auftraege(titel, angebote(id, leistungsumfang, notizen))
    `
      )
      .eq('id', rechnungId)
      .maybeSingle()
  )

  if (loadErr || !rec) return { ok: false, message: loadErr?.message ?? 'Rechnung nicht gefunden' }

  const numRes = await ensureRechnungsnummerFuerVersand(
    supabase,
    rechnungId,
    rec.rechnungsnummer as string | null,
    (rec.beleg_typ as 'rechnung' | 'gutschrift') ?? 'rechnung'
  )
  if (!numRes.ok) return numRes
  const rechnungsnummer = numRes.nummer
  rec.rechnungsnummer = rechnungsnummer

  const angRechnungPre = Array.isArray(rec.angebote) ? rec.angebote[0] : rec.angebote
  const aufPre = Array.isArray(rec.auftraege) ? rec.auftraege[0] : rec.auftraege
  const angAufPre = aufPre?.angebote
    ? Array.isArray(aufPre.angebote)
      ? aufPre.angebote[0]
      : aufPre.angebote
    : null
  const angebotFuerTitel = (angRechnungPre ?? angAufPre) as
    | { id?: string; leistungsumfang?: string | null; notizen?: string | null }
    | null
  const projektTitelVorPdf = resolveRechnungProjektTitel({
    angebot: angebotFuerTitel,
    auftragTitel: (aufPre?.titel as string | null) ?? null,
  })
  if (
    projektTitelVorPdf &&
    projektTitelVorPdf !== 'Rechnung' &&
    angebotFuerTitel?.id &&
    !String(angebotFuerTitel.leistungsumfang ?? '').trim()
  ) {
    await supabase
      .from('angebote')
      .update({ leistungsumfang: projektTitelVorPdf })
      .eq('id', angebotFuerTitel.id)
    angebotFuerTitel.leistungsumfang = projektTitelVorPdf
  }

  const pdf = await persistPdfForRechnung(rechnungId)
  if (!pdf.ok) return pdf

  /** Storno-Gutschrift zur gleichen Planzeile (nach „Stornieren & neu stellen“) mitversenden. */
  type StornoAnhang = { id: string; nr: string; buffer: Buffer; bezugRechnungsnummer: string | null }
  let stornoAnhang: StornoAnhang | null = null
  const belegTyp = String(rec.beleg_typ ?? 'rechnung')
  if (belegTyp !== 'gutschrift') {
    const { data: neuMeta } = await supabase
      .from('rechnungen')
      .select('zahlungsplan_abschlag_id, auftrag_id, kunde_id')
      .eq('id', rechnungId)
      .maybeSingle()
    const zeileId = String(neuMeta?.zahlungsplan_abschlag_id ?? '').trim()
    const auftragIdMeta = String(neuMeta?.auftrag_id ?? rec.auftrag_id ?? '').trim()
    const kundeIdMeta = String(neuMeta?.kunde_id ?? rec.kunde_id ?? '').trim()

    async function loadGutschriftAnhang(origId: string): Promise<StornoAnhang | null> {
      const { data: gs } = await supabase
        .from('rechnungen')
        .select('id, rechnungsnummer, status, bezug_rechnung_id, brutto, reverse_charge_13b')
        .eq('bezug_rechnung_id', origId)
        .eq('beleg_typ', 'gutschrift')
        .in('status', ['entwurf', 'gesendet'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!gs?.id) return null

      // Legacy-Bug: Festpreis nur in vk_netto → Gutschrift mit Brutto 0 — Beträge nachziehen
      if (Math.abs(Number(gs.brutto ?? 0)) < 0.01) {
        const { data: origPos } = await supabase
          .from('rechnungen')
          .select('positionen, reverse_charge_13b')
          .eq('id', origId)
          .maybeSingle()
        if (origPos?.positionen) {
          const positionenNeg = positionenFuerGutschrift(
            (origPos.positionen as AngebotPosition[]) ?? []
          )
          const { positionen, berechnung } = await berechneRechnungMitFirmeneinstellungen(
            supabase,
            {
              positionen: positionenNeg,
              reverse_charge_13b: Boolean(
                origPos.reverse_charge_13b ?? gs.reverse_charge_13b
              ),
            }
          )
          await rechnungUpdateMitSchemaFallback(
            supabase,
            String(gs.id),
            {
              positionen,
              updated_at: new Date().toISOString(),
            },
            berechnung,
            {
              reverse_charge_13b: Boolean(
                origPos.reverse_charge_13b ?? gs.reverse_charge_13b
              ),
            }
          )
        }
      }

      const gsPdf = await persistPdfForRechnung(String(gs.id))
      if (!gsPdf.ok) return null
      const { data: gsAfter } = await supabase
        .from('rechnungen')
        .select('rechnungsnummer')
        .eq('id', gs.id)
        .maybeSingle()
      let bezugRechnungsnummer: string | null = null
      const { data: origRow } = await supabase
        .from('rechnungen')
        .select('rechnungsnummer')
        .eq('id', origId)
        .maybeSingle()
      bezugRechnungsnummer = String(origRow?.rechnungsnummer ?? '').trim() || null
      return {
        id: String(gs.id),
        nr:
          String(gsAfter?.rechnungsnummer ?? gs.rechnungsnummer ?? 'Gutschrift').trim() ||
          'Gutschrift',
        buffer: gsPdf.buffer,
        bezugRechnungsnummer,
      }
    }

    if (zeileId && auftragIdMeta) {
      const { data: stornierte } = await supabase
        .from('rechnungen')
        .select('id')
        .eq('auftrag_id', auftragIdMeta)
        .eq('zahlungsplan_abschlag_id', zeileId)
        .eq('status', 'storniert')
        .neq('id', rechnungId)
        .order('updated_at', { ascending: false })
        .limit(5)
      for (const st of stornierte ?? []) {
        const origId = String(st.id ?? '')
        if (!origId) continue
        const found = await loadGutschriftAnhang(origId)
        if (found) {
          stornoAnhang = found
          break
        }
      }
    }

    // Korrektur-Kette: neue RE zeigt auf Original
    if (!stornoAnhang) {
      const { data: neuKor } = await supabase
        .from('rechnungen')
        .select('korrektur_von')
        .eq('id', rechnungId)
        .maybeSingle()
      const korVon = String(neuKor?.korrektur_von ?? '').trim()
      if (korVon) {
        const found = await loadGutschriftAnhang(korVon)
        if (found) stornoAnhang = found
      }
    }

    // Fallback: Original mit ersetzt_durch = diese RE (auch wenn korrektur_von fehlt)
    if (!stornoAnhang) {
      const { data: ersetzt } = await supabase
        .from('rechnungen')
        .select('id')
        .eq('ersetzt_durch', rechnungId)
        .eq('status', 'storniert')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const origId = String(ersetzt?.id ?? '').trim()
      if (origId) {
        const found = await loadGutschriftAnhang(origId)
        if (found) stornoAnhang = found
      }
    }

    // Fallback: Original zeigt fälschlich auf die Gutschrift (ersetzt_durch = GS-ID)
    if (!stornoAnhang && kundeIdMeta) {
      const { data: thisRec } = await supabase
        .from('rechnungen')
        .select('created_at')
        .eq('id', rechnungId)
        .maybeSingle()
      const createdMs = thisRec?.created_at ? Date.parse(String(thisRec.created_at)) : NaN

      const { data: openGs } = await supabase
        .from('rechnungen')
        .select('id, rechnungsnummer, bezug_rechnung_id, created_at, auftrag_id')
        .eq('kunde_id', kundeIdMeta)
        .eq('beleg_typ', 'gutschrift')
        .eq('status', 'entwurf')
        .order('created_at', { ascending: false })
        .limit(12)

      for (const gs of openGs ?? []) {
        const bezugId = String(gs.bezug_rechnung_id ?? '').trim()
        if (!bezugId) continue
        const { data: orig } = await supabase
          .from('rechnungen')
          .select('id, status, kunde_id, ersetzt_durch')
          .eq('id', bezugId)
          .maybeSingle()
        if (!orig || String(orig.status) !== 'storniert') continue
        if (String(orig.kunde_id ?? '') !== kundeIdMeta) continue

        // Passend wenn: ersetzt_durch = diese RE, oder ersetzt_durch = diese GS, oder zeitnah erzeugt
        const ersetzt = String(orig.ersetzt_durch ?? '').trim()
        const gsCreated = gs.created_at ? Date.parse(String(gs.created_at)) : NaN
        const zeitnah =
          Number.isFinite(createdMs) &&
          Number.isFinite(gsCreated) &&
          Math.abs(createdMs - gsCreated) <= 15 * 60 * 1000
        const kettePasst =
          ersetzt === rechnungId || ersetzt === String(gs.id) || !ersetzt || zeitnah
        if (!kettePasst) continue

        const found = await loadGutschriftAnhang(bezugId)
        if (found) {
          stornoAnhang = found
          // Kette nachziehen (Prod-Altlast: ersetzt_durch zeigte auf GS statt neue RE)
          if (ersetzt !== rechnungId) {
            await supabase
              .from('rechnungen')
              .update({ ersetzt_durch: rechnungId, updated_at: new Date().toISOString() })
              .eq('id', bezugId)
            await supabase
              .from('rechnungen')
              .update({
                korrektur_von: bezugId,
                korrektur_art: 'gutschrift',
                updated_at: new Date().toISOString(),
              })
              .eq('id', rechnungId)
              .is('korrektur_von', null)
          }
          break
        }
      }
    }
  }

  const kRaw = rec.kunden as Kunde | Kunde[] | null
  const kunde = Array.isArray(kRaw) ? kRaw[0] : kRaw
  const toList = options?.to?.map((v) => v.trim()).filter(Boolean) ?? []
  const empfaenger = kundeRechnungsempfaengerAusStammdaten(kunde as Kunde, null, {
    selectedAnsprechpartnerId: rec.ansprechpartner_id ?? null,
  })
  const email = empfaenger.email?.trim() || kunde?.email?.trim()
  if (!toList.length && !email) return { ok: false, message: 'Kunden-E-Mail fehlt' }

  const branding = await getMailBranding(supabaseAdmin)
  const anrede = 'sie'
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

  /** Optional: Abschlussbericht mit Rechnung versenden. */
  let abschlussAnhang: { filename: string; buffer: Buffer } | null = null
  if (options?.mitAbschlussbericht && rec.auftrag_id) {
    const auftragIdAb = String(rec.auftrag_id)
    const { data: aufMeta } = await supabaseAdmin
      .from('auftraege')
      .select('abschlussdokumentation_url, created_at')
      .eq('id', auftragIdAb)
      .maybeSingle()
    let url = String(aufMeta?.abschlussdokumentation_url ?? '').trim()
    if (!url) {
      const { createAbschlussberichtPdf } = await import(
        '@/app/(dashboard)/auftraege/abschlussdokumentation-actions'
      )
      const created = await createAbschlussberichtPdf(auftragIdAb)
      if (!created.ok) {
        return {
          ok: false,
          message: created.message || 'Abschlussbericht konnte nicht erstellt werden.',
        }
      }
      url = created.publicUrl
    }
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        return { ok: false, message: 'Abschlussbericht-PDF konnte nicht geladen werden.' }
      }
      const { formatAuftragsNr } = await import('@/lib/auftraege/auftrag-liste-helpers')
      const nrHint = formatAuftragsNr({
        id: auftragIdAb,
        created_at: String(aufMeta?.created_at ?? new Date().toISOString()),
      })
      abschlussAnhang = {
        filename: `Abschlussbericht-${nrHint}.pdf`,
        buffer: Buffer.from(await res.arrayBuffer()),
      }
    } catch {
      return { ok: false, message: 'Abschlussbericht-PDF konnte nicht geladen werden.' }
    }
  }

  const abschlussHinweis = abschlussAnhang
    ? 'Zusätzlich im Anhang: der Abschlussbericht zu Ihrem Auftrag.'
    : null
  const mailEinleitungBase = (rec.mail_einleitung as string | null)?.trim() || null

  // Korrektur-Kette auch ohne stornoAnhang erkennen (ersetzt_durch → diese RE)
  let korrekturVonId = String(rec.korrektur_von ?? '').trim()
  if (!korrekturVonId) {
    const { data: ersetzt } = await supabase
      .from('rechnungen')
      .select('id')
      .eq('ersetzt_durch', rechnungId)
      .eq('status', 'storniert')
      .limit(1)
      .maybeSingle()
    korrekturVonId = String(ersetzt?.id ?? '').trim()
  }

  const istKorrekturVersand = Boolean(stornoAnhang) || Boolean(korrekturVonId)

  // Korrektur: nie die kopierte PDF-Einleitung („Hiermit stellen wir…“) — Standard-Korrekturtext
  const mailEinleitung = istKorrekturVersand
    ? null
    : [abschlussHinweis, mailEinleitungBase].filter(Boolean).join('\n\n') || null

  let korrekturOriginalNr =
    stornoAnhang?.bezugRechnungsnummer?.trim() || null
  if (!korrekturOriginalNr && korrekturVonId) {
    const { data: origNrRow } = await supabase
      .from('rechnungen')
      .select('rechnungsnummer')
      .eq('id', korrekturVonId)
      .maybeSingle()
    korrekturOriginalNr = String(origNrRow?.rechnungsnummer ?? '').trim() || null
  }

  const tpl = buildRechnungMail(
    {
      anrede,
      begruessung,
      rechnungsnummer,
      brutto: Number(rec.brutto ?? 0),
      faelligAm: formatDatumDeFromIso(rec.faellig_am as string | null),
      projektTitel: projektTitel || null,
      mailEinleitung,
      // Korrektur: Standard-Betreff erzwingen (Wizard-Kopie der alten RE-Nr. nicht übernehmen)
      mailBetreff: istKorrekturVersand
        ? null
        : (rec.mail_betreff as string | null)?.trim() || null,
      reverseCharge: Boolean(rec.reverse_charge_13b),
      istKorrektur: istKorrekturVersand,
      mitStornoAnhang: Boolean(stornoAnhang),
      stornoGutschriftNummer: stornoAnhang?.nr ?? null,
      stornoBezugRechnungsnummer: korrekturOriginalNr,
      mitAbschlussberichtAnhang: Boolean(abschlussAnhang),
    },
    branding
  )

  const extraPdfAttachments = [
    ...(stornoAnhang
      ? [{ filename: `Storno-${stornoAnhang.nr}.pdf`, content: stornoAnhang.buffer }]
      : []),
    ...(abschlussAnhang
      ? [{ filename: abschlussAnhang.filename, content: abschlussAnhang.buffer }]
      : []),
  ]

  const mail = await sendMail({
    typ: 'rechnung',
    an: toList.length ? toList : (email as string),
    cc: options?.cc?.map((v) => v.trim()).filter(Boolean),
    anName: empfaenger.ansprechpartner || kunde?.name || null,
    betreff: tpl.betreff,
    html: tpl.html,
    pdfBuffer: pdf.buffer,
    pdfName: `Rechnung-${rechnungsnummer}.pdf`,
    extraPdfAttachments: extraPdfAttachments.length ? extraPdfAttachments : undefined,
    kundeId: rec.kunde_id as string | null,
    auftragId: rec.auftrag_id as string | null,
    rechnungId,
  })
  if (!mail.success) return { ok: false, message: mail.error ?? 'Versand fehlgeschlagen' }

  if (stornoAnhang) {
    const nowGs = new Date().toISOString()
    await supabase
      .from('rechnungen')
      .update({
        status: 'gesendet' as RechnungStatus,
        gesendet_at: nowGs,
        updated_at: nowGs,
      })
      .eq('id', stornoAnhang.id)
      .in('status', ['entwurf', 'gesendet'])
    revalidatePath(`/rechnungen/${stornoAnhang.id}`)
  }

  const now = new Date().toISOString()
  const auftragId = (rec.auftrag_id as string | null) ?? null
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (auftragId) {
    await insertAuftragTimelineEvent({
      auftrag_id: auftragId,
      typ: 'rechnung_gesendet',
      titel: istKorrekturVersand
        ? `Korrektur ${rechnungsnummer} versendet`
        : abschlussAnhang
          ? `Rechnung ${rechnungsnummer} + Abschlussbericht versendet`
          : `Rechnung ${rechnungsnummer} versendet`,
      beschreibung: `An ${(toList.length ? toList : [email]).filter(Boolean).join(', ')}`,
      erstellt_von: user?.id ?? null,
      sichtbar_fuer_kunde: true,
      fuer_kunde_freigegeben: true,
      freigegeben_at: now,
      email_log_id: mail.emailLogId ?? null,
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

  if (auftragId) {
    const { completeAuftragNachEndabrechnung } = await import(
      '@/app/(dashboard)/auftraege/actions'
    )
    await completeAuftragNachEndabrechnung({
      auftragId,
      rechnungArt: rec.rechnung_art,
      rechnungsnummer,
      belegTyp: rec.beleg_typ,
    })
  }

  try {
    const { notifyPortalRechnungGesendetFromCrm } = await import(
      '@/lib/portal/notify-portal-rechnung-gesendet'
    )
    await notifyPortalRechnungGesendetFromCrm({
      rechnungId,
      auftragId: auftragId || null,
      kundeId: (rec.kunde_id as string | null) ?? null,
      rechnungsnummer,
      brutto: rec.brutto != null ? Number(rec.brutto) : null,
    })
  } catch (e) {
    console.warn('[sendRechnung] HV-Notify:', e)
  }

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${rechnungId}`)
  revalidatePath('/vorgaenge')
  if (auftragId) revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

/** Echte Kunden-Mail-HTML wie beim Versand (ohne PDF / Statusänderung). */
export async function previewRechnungKundeMail(input: {
  rechnungId?: string | null
  kundeId?: string | null
  betreff?: string
  einleitung?: string | null
  brutto?: number
  faelligAm?: string | null
  projektTitel?: string | null
  rechnungsnummer?: string | null
  istKorrektur?: boolean
  korrekturOriginalNr?: string | null
}): Promise<{ ok: true; html: string; betreff: string } | { ok: false; message: string }> {
  const rechnungId = input.rechnungId?.trim() || ''
  const kundeId = input.kundeId?.trim() || ''

  type KundeSnap = Pick<
    Kunde,
    'name' | 'email' | 'typ' | 'vorname' | 'nachname' | 'ansprechpartner' | 'kunden_ansprechpartner'
  >

  let kunde: KundeSnap | null = null
  let selectedAnsprechpartnerId: string | null = null
  let rechnungsnummer =
    input.rechnungsnummer?.trim() || 'Rechnung'
  let brutto = input.brutto ?? 0
  let faelligRaw: string | null =
    input.faelligAm !== undefined ? input.faelligAm : null
  let projektTitel: string | null =
    input.projektTitel !== undefined ? input.projektTitel : null
  let mailEinleitung: string | null =
    input.einleitung !== undefined ? input.einleitung : null
  let mailBetreff: string | null =
    input.betreff !== undefined ? input.betreff?.trim() || null : null
  let reverseCharge = false
  let istKorrektur = Boolean(input.istKorrektur)
  let korrekturOriginalNr = input.korrekturOriginalNr?.trim() || null

  if (rechnungId) {
    type RechnungPreviewRow = {
      rechnungsnummer: string | null
      status: string | null
      beleg_typ: string | null
      faellig_am: string | null
      brutto: number | null
      mail_einleitung?: string | null
      mail_betreff?: string | null
      reverse_charge_13b?: boolean | null
      ansprechpartner_id?: string | null
      korrektur_von?: string | null
      kunden: Kunde | Kunde[] | null
      angebote: unknown
      auftraege: unknown
    }

    const { data: rec, error: loadErr } = await withCrmReadFallback<RechnungPreviewRow>(async (db) =>
      db
        .from('rechnungen')
        .select(
          `
      rechnungsnummer,
      status,
      beleg_typ,
      faellig_am,
      brutto,
      mail_einleitung,
      mail_betreff,
      reverse_charge_13b,
      ansprechpartner_id,
      korrektur_von,
      kunden(name, email, typ, vorname, nachname, ansprechpartner, kunden_ansprechpartner(id, name, email, telefon, rolle, ist_primaer, sort_order)),
      angebote(leistungsumfang, notizen),
      auftraege(titel, angebote(leistungsumfang, notizen))
    `
        )
        .eq('id', rechnungId)
        .maybeSingle()
    )

    if (loadErr || !rec) {
      // Draft-Vorschau ohne persistierte Rechnung weiter erlauben
      if (!kundeId && input.brutto === undefined) {
        return { ok: false, message: loadErr?.message ?? 'Rechnung nicht gefunden' }
      }
    } else {
      rechnungsnummer =
        input.rechnungsnummer?.trim() ||
        (rec.rechnungsnummer as string | null)?.trim() ||
        'Rechnung'

      const kRaw = rec.kunden as Kunde | Kunde[] | null
      kunde = (Array.isArray(kRaw) ? kRaw[0] : kRaw) as KundeSnap | null
      selectedAnsprechpartnerId = rec.ansprechpartner_id ?? null

      if (input.brutto === undefined) brutto = Number(rec.brutto ?? 0)
      if (input.faelligAm === undefined) faelligRaw = rec.faellig_am as string | null
      if (input.einleitung === undefined) {
        mailEinleitung = (rec.mail_einleitung as string | null)?.trim() || null
      }
      if (input.betreff === undefined) {
        mailBetreff = (rec.mail_betreff as string | null)?.trim() || null
      }
      reverseCharge = Boolean(rec.reverse_charge_13b)

      const korVon = String(rec.korrektur_von ?? '').trim()
      if (korVon) {
        istKorrektur = true
        if (!korrekturOriginalNr) {
          const { data: origNrRow } = await supabaseAdmin
            .from('rechnungen')
            .select('rechnungsnummer')
            .eq('id', korVon)
            .maybeSingle()
          korrekturOriginalNr = String(origNrRow?.rechnungsnummer ?? '').trim() || null
        }
      }

      if (input.projektTitel === undefined) {
        const angRechnung = Array.isArray(rec.angebote) ? rec.angebote[0] : rec.angebote
        const aufRaw = rec.auftraege
        const auftrag = Array.isArray(aufRaw) ? aufRaw[0] : aufRaw
        const angAuftrag = auftrag?.angebote
          ? Array.isArray(auftrag.angebote)
            ? auftrag.angebote[0]
            : auftrag.angebote
          : null
        projektTitel =
          resolveRechnungProjektTitel({
            angebot: angRechnung ?? angAuftrag,
            auftragTitel: (auftrag?.titel as string | null) ?? null,
            fallback: '',
          }) || null
      }
    }
  }

  if (!kunde && kundeId) {
    const { data: k } = await withCrmReadFallback<KundeSnap>(async (db) =>
      db
        .from('kunden')
        .select(
          'name, email, typ, vorname, nachname, ansprechpartner, kunden_ansprechpartner(id, name, email, telefon, rolle, ist_primaer, sort_order)'
        )
        .eq('id', kundeId)
        .maybeSingle()
    )
    kunde = k ?? null
  }

  const branding = await getMailBranding(supabaseAdmin)
  const anrede = 'sie'
  const empfaenger = kundeRechnungsempfaengerAusStammdaten(kunde as Kunde, null, {
    selectedAnsprechpartnerId,
  })
  const begruessung = kundeAngebotBegruessung(anrede, kundeAnredeKontextFromEmpfaenger(empfaenger))

  const faelligAm =
    faelligRaw && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(faelligRaw.trim())
      ? faelligRaw.trim()
      : formatDatumDeFromIso(faelligRaw)

  const tpl = buildRechnungMail(
    {
      anrede,
      begruessung,
      rechnungsnummer,
      brutto,
      faelligAm,
      projektTitel,
      mailEinleitung: mailEinleitung?.trim() || null,
      mailBetreff: istKorrektur ? null : mailBetreff,
      reverseCharge,
      istKorrektur,
      stornoBezugRechnungsnummer: korrekturOriginalNr,
    },
    branding
  )

  return { ok: true, html: tpl.html, betreff: tpl.betreff }
}

type ZahlungserinnerungRechnungRow = {
  id: string
  rechnungsnummer: string | null
  status: string | null
  beleg_typ: string | null
  auftrag_id: string | null
  kunde_id: string | null
  rechnung_art: string | null
  faellig_am: string | null
  brutto: number | null
  erinnerung_7_sent_at: string | null
  erinnerung_21_sent_at: string | null
  kunden: Kunde | Kunde[] | null
}

async function loadRechnungFuerZahlungserinnerung(
  rechnungId: string
): Promise<
  | { ok: true; rec: ZahlungserinnerungRechnungRow; rechnungsnummer: string }
  | { ok: false; message: string }
> {
  const { data: rec, error: loadErr } = await withCrmReadFallback<ZahlungserinnerungRechnungRow>(
    async (db) =>
      db
        .from('rechnungen')
        .select(
          `
      id,
      rechnungsnummer,
      status,
      beleg_typ,
      auftrag_id,
      kunde_id,
      rechnung_art,
      faellig_am,
      brutto,
      erinnerung_7_sent_at,
      erinnerung_21_sent_at,
      kunden(name, email, typ, vorname, nachname)
    `
        )
        .eq('id', rechnungId)
        .maybeSingle()
  )

  if (loadErr || !rec) return { ok: false, message: loadErr?.message ?? 'Rechnung nicht gefunden' }
  if (rec.status !== 'gesendet') {
    return { ok: false, message: 'Zahlungserinnerung nur für versendete Rechnungen möglich.' }
  }
  if (rec.beleg_typ === 'gutschrift') {
    return { ok: false, message: 'Für Gutschriften keine Zahlungserinnerung.' }
  }

  const supabase = createClient()
  const numRes = await ensureRechnungsnummerFuerVersand(
    supabase,
    rechnungId,
    rec.rechnungsnummer as string | null,
    (rec.beleg_typ as 'rechnung' | 'gutschrift') ?? 'rechnung'
  )
  if (!numRes.ok) return numRes
  const rechnungsnummer = numRes.nummer

  return { ok: true, rec: { ...rec, rechnungsnummer }, rechnungsnummer }
}

function buildZahlungserinnerungVorschau(
  rec: ZahlungserinnerungRechnungRow,
  rechnungsnummer: string,
  stufe: ZahlungserinnerungStufe,
  branding: Awaited<ReturnType<typeof getMailBranding>>,
  betragFelder: ReturnType<typeof mahnungBetragMailFelder>
) {
  const kRaw = rec.kunden as Kunde | Kunde[] | null
  const kunde = Array.isArray(kRaw) ? kRaw[0] : kRaw
  const anrede = 'sie'
  const zahlbarBisIso = zahlungserinnerungZahlbarBis(rec.faellig_am)
  const iban = branding.iban || process.env.EMAIL_FIRMEN_IBAN || ''

  const tpl = buildZahlungserinnerungMail(
    {
      name: kunde?.name?.trim() || 'Kundin/Kunde',
      nummer: rechnungsnummer,
      ...betragFelder,
      faelligAm: formatDatumDeFromIso(rec.faellig_am as string | null),
      zahlbarBis: formatDatumDeFromIso(zahlbarBisIso),
      tageUeberfaellig: Math.max(0, tageSeitFaelligkeitRechnung(rec.faellig_am)),
      stufe,
      iban,
      anrede,
      kundeTyp: kunde?.typ ?? null,
    },
    branding
  )

  const email = kunde?.email?.trim() ?? ''
  return {
    tpl,
    zahlbarBisIso,
    defaultTo: email ? [email] : [],
    defaultCc: [] as string[],
    kunde,
    pdfName: `Rechnung-${rechnungsnummer}.pdf`,
  }
}

export async function previewZahlungserinnerungMail(
  rechnungId: string,
  stufe: ZahlungserinnerungStufe
): Promise<
  | {
      ok: true
      betreff: string
      html: string
      defaultTo: string[]
      defaultCc: string[]
      pdfName: string
      zahlbarBis: string
      zahlbarBisLabel: string
      stufe: ZahlungserinnerungStufe
      stufe1Gesendet: boolean
      stufe2Gesendet: boolean
    }
  | { ok: false; message: string }
> {
  const loaded = await loadRechnungFuerZahlungserinnerung(rechnungId)
  if (!loaded.ok) return loaded

  const mahnKontext = await mahnungBetragKontextFuerRechnung(supabaseAdmin, {
    id: rechnungId,
    auftrag_id: loaded.rec.auftrag_id,
    brutto: loaded.rec.brutto,
    rechnung_art: loaded.rec.rechnung_art,
  })
  if (mahnKontext.skipMahnung) {
    return { ok: false, message: 'Für diese Rechnung ist kein offener Betrag mehr — keine Mahnung nötig.' }
  }

  const branding = await getMailBranding(supabaseAdmin)
  const betragFelder = mahnungBetragMailFelder(mahnKontext)
  const preview = buildZahlungserinnerungVorschau(
    loaded.rec,
    loaded.rechnungsnummer,
    stufe,
    branding,
    betragFelder
  )

  return {
    ok: true,
    betreff: preview.tpl.betreff,
    html: preview.tpl.html,
    defaultTo: preview.defaultTo,
    defaultCc: preview.defaultCc,
    pdfName: preview.pdfName,
    zahlbarBis: preview.zahlbarBisIso,
    zahlbarBisLabel: formatDatumDeFromIso(preview.zahlbarBisIso),
    stufe,
    stufe1Gesendet: Boolean(loaded.rec.erinnerung_7_sent_at),
    stufe2Gesendet: Boolean(loaded.rec.erinnerung_21_sent_at),
  }
}

export async function sendZahlungserinnerungMail(
  rechnungId: string,
  options: {
    stufe: ZahlungserinnerungStufe
    to: string[]
    cc?: string[]
    betreff?: string
    html?: string
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }

  const loaded = await loadRechnungFuerZahlungserinnerung(rechnungId)
  if (!loaded.ok) return loaded

  const mahnKontext = await mahnungBetragKontextFuerRechnung(gate.db, {
    id: rechnungId,
    auftrag_id: loaded.rec.auftrag_id,
    brutto: loaded.rec.brutto,
    rechnung_art: loaded.rec.rechnung_art,
  })
  if (mahnKontext.skipMahnung) {
    return { ok: false, message: 'Für diese Rechnung ist kein offener Betrag mehr — keine Mahnung nötig.' }
  }

  const toList = options.to.map((v) => v.trim()).filter(Boolean)
  if (!toList.length) return { ok: false, message: 'Bitte mindestens eine Empfänger-Adresse angeben.' }

  const branding = await getMailBranding(gate.db)
  const betragFelder = mahnungBetragMailFelder(mahnKontext)
  const preview = buildZahlungserinnerungVorschau(
    loaded.rec,
    loaded.rechnungsnummer,
    options.stufe,
    branding,
    betragFelder
  )

  const pdf = await persistPdfForRechnung(rechnungId)
  if (!pdf.ok) return pdf

  const kRaw = loaded.rec.kunden as Kunde | Kunde[] | null
  const kunde = Array.isArray(kRaw) ? kRaw[0] : kRaw

  const mail = await sendMail({
    typ: 'zahlungserinnerung',
    an: toList,
    cc: options.cc?.map((v) => v.trim()).filter(Boolean),
    anName: kunde?.name ?? null,
    betreff: options.betreff?.trim() || preview.tpl.betreff,
    html: options.html?.trim() || preview.tpl.html,
    pdfBuffer: pdf.buffer,
    pdfName: preview.pdfName,
    kundeId: loaded.rec.kunde_id as string | null,
    auftragId: loaded.rec.auftrag_id as string | null,
    rechnungId,
  })
  if (!mail.success) return { ok: false, message: mail.error ?? 'Versand fehlgeschlagen' }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    updated_at: now,
  }
  if (options.stufe === 1) patch.erinnerung_7_sent_at = now
  if (options.stufe === 2) patch.erinnerung_21_sent_at = now

  const { error } = await gate.db.from('rechnungen').update(patch).eq('id', rechnungId)
  if (error) return { ok: false, message: error.message }

  const auftragId = (loaded.rec.auftrag_id as string | null) ?? null
  if (auftragId) {
    await insertAuftragTimelineEvent({
      auftrag_id: auftragId,
      typ: 'rechnung_erinnerung',
      titel: `${options.stufe === 1 ? 'Zahlungserinnerung' : '2. Zahlungserinnerung'} ${loaded.rechnungsnummer}`,
      beschreibung: `An ${toList.join(', ')} · Zahlbar bis ${formatDatumDeFromIso(preview.zahlbarBisIso)}`,
      erstellt_von: gate.user.id,
      sichtbar_fuer_kunde: true,
      fuer_kunde_freigegeben: true,
      freigegeben_at: now,
      email_log_id: mail.emailLogId ?? null,
    })
  }

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${rechnungId}`)
  if (auftragId) revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}
