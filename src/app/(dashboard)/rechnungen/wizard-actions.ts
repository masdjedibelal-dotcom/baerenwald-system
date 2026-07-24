'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  createRechnungEntwurf,
  sendRechnung,
  updateRechnungEntwurf,
} from '@/app/(dashboard)/rechnungen/actions'
import { persistPdfForRechnung } from '@/lib/rechnungen/persist-pdf'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import { formatAuftragsNr } from '@/lib/auftraege/auftrag-liste-helpers'
import { normalizeAngebotPositionen, repairAngebotPositionen } from '@/lib/angebot-positionen'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadGewerkeAusfuehrung, sanitizeAngebotPositionenForExport } from '@/lib/gewerke-ausfuehrung'
import { KUNDE_EMBED_SELECT, KUNDE_EMBED_SELECT_LEGACY, loadKundeFuerRechnung } from '@/lib/rechnungen/kunde-select'
import {
  defaultRechnungWizardMeta,
  defaultZahlungszielTage,
  rechnungDarfImWizardBearbeitetWerden,
  type RechnungWizardBootstrap,
  type RechnungWizardMeta,
  type AbschlagRechnungEntwurf,
} from '@/lib/rechnungen/rechnung-wizard-types'
import { resolveRechnungProjektTitel } from '@/lib/angebote/resolve-angebot-leistungsumfang'
import { resolveVertragsKundeIdForLead } from '@/lib/leads/resolve-vertrags-kunde'
import { mailAnredeFromKundeTyp } from '@/lib/mail/anrede'
import {
  abschlagTextKontextFromWizard,
  defaultAbschlagMailBetreff,
  defaultAbschlagMailEinleitung,
  defaultAbschlagPdfEinleitung,
} from '@/lib/rechnungen/zahlungsplan-texte'
import { berechneRechnungMitFirmeneinstellungen } from '@/lib/rechnungen/rechnung-speichern'
import {
  abschlagBereitsAbgerechnet,
  auftragSummenAusPositionen,
  berechneBereitsGestellt,
  berechneZahlungsplan,
  naechsteOffeneAbschlagZeile,
  parseZahlungsplan,
  abschlagZahlungstextFuerRechnung,
  positionenFuerAbschlagRechnung,
  rechnungArtFuerZeile,
  rechnungBerechnungFuerAbschlagZeile,
  rechnungPositionenMitAuftrag,
  resolveAnredeKey,
  standardRechnungZahlungstext,
  zahlungsplanVorlage50_50,
  type Zahlungsplan,
  type ZahlungsplanZeileBerechnet,
} from '@/lib/rechnungen/zahlungsplan'
import { saveAuftragZahlungsplan } from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
import { maybeUpgradeLegacyRechnungsnummer } from '@/lib/rechnungen/next-rechnungsnummer'
import { syncNeueLeistungenToPreisliste } from '@/app/(dashboard)/preislisten/actions'
import { syncInputsFromAngebotPositionen } from '@/lib/preislisten/sync-neue-leistungen'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'

export type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'

export type SaveRechnungWizardDraftPayload = {
  rechnungId?: string | null
  auftrag_id: string | null
  angebot_id: string | null
  kunde_id: string
  positionen: AngebotPosition[]
  meta: RechnungWizardMeta
  modus?: 'voll' | 'abschlag'
  abschlag?: {
    zeileId: string
    zeileIndex: number
    rechnungArt: 'abschlag' | 'schluss'
  } | null
  zahlungsplan?: Zahlungsplan | null
  zahlungsplanSpeichern?: boolean
  versandZeileId?: string | null
  ist_wiederkehrend?: boolean
  wiederkehr_turnus?: string | null
}

async function positionenAusAuftrag(
  supabase: ReturnType<typeof createClient>,
  auftragId: string
): Promise<{
  positionen: AngebotPosition[]
  angebot_id: string | null
  kunde_id: string
  auftragsReferenz: string
  projektTitel: string | null
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  zahlungsplan: Zahlungsplan | null
  gesamtNetto: number
  gesamtBrutto: number
  ist_wiederkehrend: boolean
  wiederkehr_turnus: string | null
}> {
  const gewerke = await loadGewerkeAusfuehrung(supabase)

  const { data: auf, error } = await supabase
    .from('auftraege')
    .select(
      `
      id,
      created_at,
      kunde_id,
      lead_id,
      angebot_id,
      titel,
      start_datum,
      end_datum,
      zahlungsplan,
      ist_wiederkehrend,
      wiederkehr_turnus,
      angebote(id, positionen, leistungsumfang, notizen, zahlungsbedingungen, zahlungsplan),
      auftrag_positionen(*)
    `
    )
    .eq('id', auftragId)
    .maybeSingle()

  if (error) {
    console.error('[positionenAusAuftrag]', auftragId, error.message)
    throw new Error(error.message || 'Auftrag konnte nicht geladen werden.')
  }
  if (!auf) {
    throw new Error('Auftrag nicht gefunden oder ohne Kunde verknüpft.')
  }
  if (!auf.kunde_id && !(auf as { lead_id?: string | null }).lead_id) {
    throw new Error('Auftrag nicht gefunden oder ohne Kunde verknüpft.')
  }

  const auftragPos = (auf.auftrag_positionen ?? []) as AuftragPosition[]
  let positionen: AngebotPosition[] = []
  if (auftragPos.length > 0) {
    positionen = sanitizeAngebotPositionenForExport(
      auftragPositionenToAngebotPositionen(auftragPos),
      gewerke
    )
  } else {
    const angRaw = auf.angebote as { positionen?: unknown } | unknown[] | null | undefined
    const ang = Array.isArray(angRaw) ? angRaw[0] : angRaw
    const rawPos = (ang as { positionen?: unknown } | null)?.positionen ?? []
    positionen = sanitizeAngebotPositionenForExport(normalizeAngebotPositionen(rawPos), gewerke)
  }

  const auftragsReferenz = formatAuftragsNr({
    id: auf.id as string,
    created_at: (auf.created_at as string) ?? new Date().toISOString(),
  })

  const angRawJoin = auf.angebote as
    | { leistungsumfang?: string | null; notizen?: string | null }
    | { leistungsumfang?: string | null; notizen?: string | null }[]
    | null
    | undefined
  const angJoin = Array.isArray(angRawJoin) ? angRawJoin[0] : angRawJoin
  const projektTitel =
    resolveRechnungProjektTitel({
      angebot: angJoin,
      auftragTitel: (auf.titel as string | null) ?? null,
    }) || null

  const angZahlung = angJoin as { zahlungsbedingungen?: string | null; zahlungsplan?: unknown } | null
  let zahlungsplan = parseZahlungsplan(auf.zahlungsplan) ?? parseZahlungsplan(angZahlung?.zahlungsplan)
  if (!zahlungsplan && angZahlung?.zahlungsbedingungen === 'anzahlung_50') {
    zahlungsplan = zahlungsplanVorlage50_50()
  }

  const summen = auftragSummenAusPositionen(positionen)
  const kontext = zahlungsplan ? berechneZahlungsplan(zahlungsplan, summen.netto) : null

  const kundeId =
    (await resolveVertragsKundeIdForLead(
      supabase,
      (auf as { lead_id?: string | null }).lead_id,
      auf.kunde_id as string | null
    )) ?? (auf.kunde_id as string)

  if (!kundeId) {
    throw new Error('Auftrag nicht gefunden oder ohne Kunde verknüpft.')
  }

  const aufW = auf as { ist_wiederkehrend?: boolean | null; wiederkehr_turnus?: string | null }

  return {
    positionen,
    angebot_id: (auf.angebot_id as string | null) ?? null,
    kunde_id: kundeId,
    auftragsReferenz,
    projektTitel,
    leistungszeitraum_von: (auf.start_datum as string | null) ?? null,
    leistungszeitraum_bis: (auf.end_datum as string | null) ?? null,
    zahlungsplan,
    gesamtNetto: summen.netto,
    gesamtBrutto: kontext?.gesamtBrutto ?? summen.brutto,
    ist_wiederkehrend: aufW.ist_wiederkehrend === true,
    wiederkehr_turnus: aufW.wiederkehr_turnus ?? null,
  }
}

async function rechnungenAbschlagLinks(
  supabase: ReturnType<typeof createClient>,
  auftragId: string
) {
  const { data } = await supabase
    .from('rechnungen')
    .select('id, rechnung_art, abschlag_index, zahlungsplan_abschlag_id, status, brutto')
    .eq('auftrag_id', auftragId)
  return (data ?? []) as import('@/lib/rechnungen/zahlungsplan').RechnungAbschlagLink[]
}

function abschlagMetaDefaults(
  basis: Awaited<ReturnType<typeof positionenAusAuftrag>>,
  zeile: import('@/lib/rechnungen/zahlungsplan').ZahlungsplanZeileBerechnet,
  plan: Zahlungsplan,
  bereitsGestelltBrutto: number,
  zahlungszielTage: number,
  kundeTyp: string | null | undefined,
  firm: import('@/lib/einstellungen-keys').FirmenEinstellungen,
  rechnungsnummerPlaceholder?: string | null
): RechnungWizardMeta {
  const base = defaultRechnungWizardMeta(zahlungszielTage, {
    leistungszeitraum_von: basis.leistungszeitraum_von,
    leistungszeitraum_bis: basis.leistungszeitraum_bis,
    projektTitel: basis.projektTitel,
    kundeTyp,
    firm,
  })
  const anrede = resolveAnredeKey(mailAnredeFromKundeTyp(kundeTyp))
  const ctx = abschlagTextKontextFromWizard({
    anrede,
    zeile,
    projektTitel: basis.projektTitel ?? '',
    auftragsReferenz: basis.auftragsReferenz,
    gesamtNetto: basis.gesamtNetto,
    gesamtBrutto: basis.gesamtBrutto,
    bereitsGestelltBrutto,
  })
  const pdfVorlage = zeile.pdf_einleitung_vorlage?.trim()
  const mailVorlage = zeile.mail_einleitung_vorlage?.trim()
  const betreffVorlage = zeile.mail_betreff_vorlage?.trim()

  return {
    ...base,
    einleitung: pdfVorlage || defaultAbschlagPdfEinleitung(ctx),
    mail_einleitung: mailVorlage || defaultAbschlagMailEinleitung(ctx),
    mail_betreff:
      betreffVorlage ||
      defaultAbschlagMailBetreff(ctx, 'Bärenwald', rechnungsnummerPlaceholder?.trim() || 'Rechnung'),
    zahlungsart: 'abschlaege',
    abschlag_zeile_id: zeile.id,
    zahlungsbedingungen: zeile.istSchluss
      ? standardRechnungZahlungstext(zahlungszielTage)
      : abschlagZahlungstextFuerRechnung(plan, basis.gesamtNetto, zahlungszielTage, zeile),
  }
}

function zahlungstextFuerAbschlagZeile(
  plan: Zahlungsplan,
  gesamtNetto: number,
  zahlungszielTage: number,
  zeile: ZahlungsplanZeileBerechnet | null
): string {
  if (zeile?.istSchluss) return standardRechnungZahlungstext(zahlungszielTage)
  return abschlagZahlungstextFuerRechnung(plan, gesamtNetto, zahlungszielTage, zeile)
}

function revalidateAuftragPfad(auftragId: string | null | undefined) {
  if (auftragId?.trim()) revalidatePath(`/auftraege/${auftragId.trim()}`)
}

export async function loadRechnungWizardKunde(
  kundeId: string
): Promise<
  | {
      ok: true
      kunde: NonNullable<RechnungWizardBootstrap['kunde']>
      zahlungszielTage: number
    }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const { data: kunde, error } = await loadKundeFuerRechnung(supabase, kundeId.trim())
  if (error || !kunde) return { ok: false, message: error?.message ?? 'Kunde nicht gefunden.' }
  const firm = await fetchFirmenEinstellungen(supabase)
  const zahlungszielTage = Math.max(
    1,
    parseInt(firm.zahlungsziel_tage, 10) || defaultZahlungszielTage(kunde.typ)
  )
  return { ok: true, kunde, zahlungszielTage }
}

export async function loadRechnungWizardBootstrapFromAuftrag(
  auftragId: string,
  opts?: {
    naechsterAbschlag?: boolean
    /** Explizite Planzeile (vom Zahlplan-Tab) — Wizard fragt nicht erneut. */
    abschlagZeileId?: string | null
    /** Vollrechnung ohne Abschlagsplan-Vorlage. */
    vollOhnePlan?: boolean
  }
): Promise<{ ok: true; bootstrap: RechnungWizardBootstrap } | { ok: false; message: string }> {
  try {
    const supabase = createClient()
    const basis = await positionenAusAuftrag(supabase, auftragId)

    const { data: kunde, error: kundeErr } = await loadKundeFuerRechnung(supabase, basis.kunde_id)
    if (kundeErr) return { ok: false, message: kundeErr.message }

    const firm = await fetchFirmenEinstellungen(supabase)
    const zt = Math.max(
      1,
      parseInt(firm.zahlungsziel_tage, 10) || defaultZahlungszielTage(kunde?.typ)
    )
    const rechnungen = await rechnungenAbschlagLinks(supabase, auftragId)
    const gespeicherterPlan = basis.zahlungsplan?.zeilen.length ? basis.zahlungsplan : null
    const metaDefaults = defaultRechnungWizardMeta(zt, {
      leistungszeitraum_von: basis.leistungszeitraum_von,
      leistungszeitraum_bis: basis.leistungszeitraum_bis,
      projektTitel: basis.projektTitel,
      kundeTyp: kunde?.typ,
      firm,
    })

    let meta: RechnungWizardMeta = metaDefaults
    let modus: 'voll' | 'abschlag' = 'voll'
    let zahlungsplanBearbeiten = false
    let zahlungsplan: Zahlungsplan | null = gespeicherterPlan
    let abschlag: RechnungWizardBootstrap['abschlag'] = null

    const willAbschlag =
      !opts?.vollOhnePlan &&
      Boolean(opts?.abschlagZeileId?.trim() || opts?.naechsterAbschlag)

    if (willAbschlag) {
      if (!gespeicherterPlan) {
        return {
          ok: false,
          message: 'Kein Abschlagsplan hinterlegt. Bitte zuerst einen Zahlplan anlegen.',
        }
      }
      const kontext = berechneZahlungsplan(gespeicherterPlan, basis.gesamtNetto)
      const zeile = opts?.abschlagZeileId?.trim()
        ? kontext.zeilen.find((z) => z.id === opts.abschlagZeileId!.trim()) ?? null
        : naechsteOffeneAbschlagZeile(gespeicherterPlan, kontext, rechnungen)
      if (!zeile) {
        return {
          ok: false,
          message: opts?.abschlagZeileId?.trim()
            ? 'Abschlag nicht gefunden.'
            : 'Alle Abschläge sind bereits abgerechnet.',
        }
      }
      if (abschlagBereitsAbgerechnet(zeile.id, rechnungen)) {
        return {
          ok: false,
          message: 'Für diesen Abschlag existiert bereits eine Rechnung.',
        }
      }
      meta = {
        ...metaDefaults,
        zahlungsart: 'abschlaege',
        abschlag_zeile_id: zeile.id,
        zahlungsbedingungen: zahlungstextFuerAbschlagZeile(
          gespeicherterPlan,
          basis.gesamtNetto,
          zt,
          zeile
        ),
        faellig_am: zeile.faellig_am?.trim()?.slice(0, 10) || metaDefaults.faellig_am,
      }
      modus = 'abschlag'
      zahlungsplan = gespeicherterPlan
      // Explizite Zeile aus Zahlplan-Tab → Plan nicht erneut editieren; sonst auswählbar
      zahlungsplanBearbeiten = !opts?.abschlagZeileId?.trim()
      abschlag = {
        zeileId: zeile.id,
        zeileIndex: zeile.index,
        zeileTitel: zeile.titel,
        rechnungArt: rechnungArtFuerZeile(zeile),
        istSchluss: zeile.istSchluss,
        gesamtNetto: kontext.gesamtNetto,
        gesamtBrutto: kontext.gesamtBrutto,
        bereitsGestelltBrutto: berechneBereitsGestellt(rechnungen).brutto,
      }
    } else if (opts?.vollOhnePlan) {
      zahlungsplan = null
      modus = 'voll'
    } else if (gespeicherterPlan) {
      // Vorhandenen Abschlagsplan aus dem Auftrag immer übernehmen
      const kontext = berechneZahlungsplan(gespeicherterPlan, basis.gesamtNetto)
      const zeile = naechsteOffeneAbschlagZeile(gespeicherterPlan, kontext, rechnungen)
      zahlungsplan = gespeicherterPlan
      zahlungsplanBearbeiten = true
      if (zeile && !abschlagBereitsAbgerechnet(zeile.id, rechnungen)) {
        meta = {
          ...metaDefaults,
          zahlungsart: 'abschlaege',
          abschlag_zeile_id: zeile.id,
          zahlungsbedingungen: zahlungstextFuerAbschlagZeile(
            gespeicherterPlan,
            basis.gesamtNetto,
            zt,
            zeile
          ),
          faellig_am: zeile.faellig_am?.trim()?.slice(0, 10) || metaDefaults.faellig_am,
        }
        modus = 'abschlag'
        abschlag = {
          zeileId: zeile.id,
          zeileIndex: zeile.index,
          zeileTitel: zeile.titel,
          rechnungArt: rechnungArtFuerZeile(zeile),
          istSchluss: zeile.istSchluss,
          gesamtNetto: kontext.gesamtNetto,
          gesamtBrutto: kontext.gesamtBrutto,
          bereitsGestelltBrutto: berechneBereitsGestellt(rechnungen).brutto,
        }
      }
    }

    return {
      ok: true,
      bootstrap: {
        rechnungId: null,
        rechnungsnummer: null,
        auftragId,
        angebotId: basis.angebot_id,
        kundeId: basis.kunde_id,
        kunde: kunde ?? null,
        positionen: basis.positionen,
        meta,
        auftragsReferenz: basis.auftragsReferenz,
        projektTitel: basis.projektTitel,
        modus,
        abschlag,
        zahlungsplan,
        zahlungsplanBearbeiten,
        gesamtNetto: basis.gesamtNetto,
        rechnungenAbschlag: rechnungen,
        ist_wiederkehrend: basis.ist_wiederkehrend,
        wiederkehr_turnus: basis.wiederkehr_turnus,
      },
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Laden fehlgeschlagen' }
  }
}

export async function loadRechnungWizardBootstrapFromAuftragAbschlag(
  auftragId: string
): Promise<{ ok: true; bootstrap: RechnungWizardBootstrap } | { ok: false; message: string }> {
  return loadRechnungWizardBootstrapFromAuftrag(auftragId, { naechsterAbschlag: true })
}

function addDaysIsoLocal(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function loadRechnungWizardBootstrap(
  rechnungId: string,
  auftragId: string
): Promise<{ ok: true; bootstrap: RechnungWizardBootstrap } | { ok: false; message: string }> {
  const supabase = createClient()
  let rec: Record<string, unknown> | null = null
  let loadErr: { message: string } | null = null

  const full = await supabase
    .from('rechnungen')
    .select(`*, ${KUNDE_EMBED_SELECT}`)
    .eq('id', rechnungId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()

  if (full.error) {
    const legacy = await supabase
      .from('rechnungen')
      .select(`*, ${KUNDE_EMBED_SELECT_LEGACY}`)
      .eq('id', rechnungId)
      .eq('auftrag_id', auftragId)
      .maybeSingle()
    rec = legacy.data as Record<string, unknown> | null
    loadErr = legacy.error
  } else {
    rec = full.data as Record<string, unknown> | null
    loadErr = full.error
  }

  if (loadErr || !rec) return { ok: false, message: 'Rechnung nicht gefunden.' }
  if (!rechnungDarfImWizardBearbeitetWerden(rec.status as string)) {
    return { ok: false, message: 'Diese Rechnung kann im Wizard nicht mehr bearbeitet werden.' }
  }

  const rechnungsnummer = await maybeUpgradeLegacyRechnungsnummer(
    supabase,
    rechnungId,
    rec.rechnungsnummer as string,
    rec.status as string,
    (rec.beleg_typ as 'rechnung' | 'gutschrift') ?? 'rechnung'
  )

  const basis = await positionenAusAuftrag(supabase, auftragId)
  const kRaw = rec.kunden
  const kunde = Array.isArray(kRaw) ? kRaw[0] : kRaw

  const positionen = repairAngebotPositionen(
    rechnungPositionenMitAuftrag(
      (rec.positionen as AngebotPosition[]) ?? [],
      basis.positionen
    )
  )

  const firm = await fetchFirmenEinstellungen(supabase)
  const zt = Math.max(
    1,
    parseInt(firm.zahlungsziel_tage, 10) ||
      defaultZahlungszielTage((kunde as { typ?: string } | null)?.typ)
  )
  const metaDefaults = defaultRechnungWizardMeta(zt, {
    projektTitel: basis.projektTitel,
    leistungszeitraum_von: basis.leistungszeitraum_von,
    leistungszeitraum_bis: basis.leistungszeitraum_bis,
    kundeTyp: (kunde as { typ?: string } | null)?.typ,
    firm,
  })

  const rechnungArt = String(rec.rechnung_art ?? 'voll')
  const modus = rechnungArt === 'abschlag' || rechnungArt === 'schluss' ? 'abschlag' : 'voll'
  const abschlagZeileId = String(rec.zahlungsplan_abschlag_id ?? '').trim() || null

  const meta: RechnungWizardMeta = {
    einleitung: String(rec.einleitung ?? '').trim() || metaDefaults.einleitung,
    hinweise: String(rec.hinweise ?? '').trim() || metaDefaults.hinweise,
    mail_einleitung: String(rec.mail_einleitung ?? '').trim() || metaDefaults.mail_einleitung,
    mail_betreff: String(rec.mail_betreff ?? '').trim() || metaDefaults.mail_betreff,
    reverse_charge_13b: Boolean(rec.reverse_charge_13b),
    hinweis_35a:
      typeof rec.hinweis_35a === 'boolean' ? rec.hinweis_35a : metaDefaults.hinweis_35a,
    rechnungsdatum: String(rec.rechnungsdatum ?? new Date().toISOString().slice(0, 10)),
    leistungszeitraum_von: String(rec.leistungszeitraum_von ?? basis.leistungszeitraum_von ?? ''),
    leistungszeitraum_bis: String(rec.leistungszeitraum_bis ?? basis.leistungszeitraum_bis ?? ''),
    faellig_am: String(rec.faellig_am ?? ''),
    zahlungsart: modus === 'abschlag' ? 'abschlaege' : 'standard',
    zahlungsbedingungen:
      String(rec.zahlungsbedingungen ?? '').trim() || metaDefaults.zahlungsbedingungen,
    abschlag_zeile_id: abschlagZeileId,
  }

  const rechnungen = await rechnungenAbschlagLinks(supabase, auftragId)

  return {
    ok: true,
    bootstrap: {
      rechnungId: rec.id as string,
      rechnungsnummer,
      auftragId,
      angebotId: (rec.angebot_id as string | null) ?? basis.angebot_id,
      kundeId: rec.kunde_id as string,
      kunde: kunde ?? null,
      positionen,
      meta,
      auftragsReferenz: basis.auftragsReferenz,
      projektTitel: basis.projektTitel,
      modus,
      zahlungsplan: basis.zahlungsplan,
      abschlag:
        modus === 'abschlag'
          ? {
              zeileId: String(rec.zahlungsplan_abschlag_id ?? ''),
              zeileIndex: Number(rec.abschlag_index ?? 0),
              zeileTitel: '',
              rechnungArt: rechnungArt as 'abschlag' | 'schluss',
              istSchluss: rechnungArt === 'schluss',
              gesamtNetto: basis.gesamtNetto,
              gesamtBrutto: basis.gesamtBrutto,
              bereitsGestelltBrutto: 0,
            }
          : null,
      gesamtNetto: basis.gesamtNetto,
      rechnungenAbschlag: rechnungen,
      ist_wiederkehrend:
        rec.ist_wiederkehrend === true || basis.ist_wiederkehrend,
      wiederkehr_turnus:
        (rec.wiederkehr_turnus as string | null) ?? basis.wiederkehr_turnus,
    },
  }
}

/** Standalone / Direktrechnung ohne Auftrag — Positionen nur aus der Rechnung. */
export async function loadRechnungWizardBootstrapStandalone(
  rechnungId: string
): Promise<{ ok: true; bootstrap: RechnungWizardBootstrap } | { ok: false; message: string }> {
  const supabase = createClient()
  let rec: Record<string, unknown> | null = null
  let loadErr: { message: string } | null = null

  const full = await supabase
    .from('rechnungen')
    .select(`*, ${KUNDE_EMBED_SELECT}`)
    .eq('id', rechnungId)
    .maybeSingle()

  if (full.error) {
    const legacy = await supabase
      .from('rechnungen')
      .select(`*, ${KUNDE_EMBED_SELECT_LEGACY}`)
      .eq('id', rechnungId)
      .maybeSingle()
    rec = legacy.data as Record<string, unknown> | null
    loadErr = legacy.error
  } else {
    rec = full.data as Record<string, unknown> | null
    loadErr = full.error
  }

  if (loadErr || !rec) return { ok: false, message: 'Rechnung nicht gefunden.' }
  if (!rechnungDarfImWizardBearbeitetWerden(rec.status as string)) {
    return { ok: false, message: 'Diese Rechnung kann im Wizard nicht mehr bearbeitet werden.' }
  }

  const auftragId = (rec.auftrag_id as string | null)?.trim() || null
  if (auftragId) {
    return loadRechnungWizardBootstrap(rechnungId, auftragId)
  }

  const rechnungsnummer = await maybeUpgradeLegacyRechnungsnummer(
    supabase,
    rechnungId,
    rec.rechnungsnummer as string,
    rec.status as string,
    (rec.beleg_typ as 'rechnung' | 'gutschrift') ?? 'rechnung'
  )

  const kRaw = rec.kunden
  const kunde = Array.isArray(kRaw) ? kRaw[0] : kRaw
  const positionen = repairAngebotPositionen(
    normalizeAngebotPositionen((rec.positionen as AngebotPosition[]) ?? [])
  )
  const firm = await fetchFirmenEinstellungen(supabase)
  const zt = Math.max(
    1,
    parseInt(firm.zahlungsziel_tage, 10) ||
      defaultZahlungszielTage((kunde as { typ?: string } | null)?.typ)
  )
  const metaDefaults = defaultRechnungWizardMeta(zt, {
    kundeTyp: (kunde as { typ?: string } | null)?.typ,
    firm,
  })

  const meta: RechnungWizardMeta = {
    einleitung: String(rec.einleitung ?? '').trim() || metaDefaults.einleitung,
    hinweise: String(rec.hinweise ?? '').trim() || metaDefaults.hinweise,
    mail_einleitung: String(rec.mail_einleitung ?? '').trim() || metaDefaults.mail_einleitung,
    mail_betreff: String(rec.mail_betreff ?? '').trim() || metaDefaults.mail_betreff,
    reverse_charge_13b: Boolean(rec.reverse_charge_13b),
    hinweis_35a:
      typeof rec.hinweis_35a === 'boolean' ? rec.hinweis_35a : metaDefaults.hinweis_35a,
    rechnungsdatum: String(rec.rechnungsdatum ?? new Date().toISOString().slice(0, 10)),
    leistungszeitraum_von: String(rec.leistungszeitraum_von ?? ''),
    leistungszeitraum_bis: String(rec.leistungszeitraum_bis ?? ''),
    faellig_am: String(rec.faellig_am ?? ''),
    zahlungsart: 'standard',
    zahlungsbedingungen:
      String(rec.zahlungsbedingungen ?? '').trim() || metaDefaults.zahlungsbedingungen,
    abschlag_zeile_id: null,
  }

  const { berechnung } = await berechneRechnungMitFirmeneinstellungen(supabase, {
    positionen,
    reverse_charge_13b: meta.reverse_charge_13b,
  })

  return {
    ok: true,
    bootstrap: {
      rechnungId: rec.id as string,
      rechnungsnummer,
      auftragId: null,
      angebotId: (rec.angebot_id as string | null) ?? null,
      kundeId: (rec.kunde_id as string) ?? '',
      kunde: kunde ?? null,
      positionen,
      meta,
      auftragsReferenz: '',
      projektTitel: null,
      modus: 'voll',
      standalone: true,
      zahlungsplan: null,
      abschlag: null,
      gesamtNetto: berechnung.netto,
    },
  }
}

export async function saveRechnungWizardDraft(
  input: SaveRechnungWizardDraftPayload
): Promise<
  { ok: true; rechnungId: string; rechnungsnummer: string } | { ok: false; message: string }
> {
  const positionen = repairAngebotPositionen(normalizeAngebotPositionen(input.positionen))
  if (!positionen.length) {
    return { ok: false, message: 'Mindestens eine Position erforderlich.' }
  }

  const abschlagAktiv = input.meta.zahlungsart === 'abschlaege'
  if (abschlagAktiv && input.zahlungsplan?.zeilen.length) {
    if (!input.auftrag_id?.trim()) {
      return { ok: false, message: 'Abschlagsrechnungen erfordern einen Auftrag.' }
    }
    const planSave = await saveAuftragZahlungsplan(input.auftrag_id, input.zahlungsplan)
    if (!planSave.ok) return planSave
  }

  await syncNeueLeistungenToPreisliste(syncInputsFromAngebotPositionen(positionen))

  const rechnungArt: 'voll' | 'abschlag' | 'schluss' =
    abschlagAktiv || input.modus === 'abschlag'
      ? (input.abschlag?.rechnungArt ?? 'abschlag')
      : 'voll'

  const abschlagZeileId = input.meta.abschlag_zeile_id?.trim() || null

  const supabaseForBerechnung = createClient()
  const { berechnung: berechnungVoll } = await berechneRechnungMitFirmeneinstellungen(
    supabaseForBerechnung,
    {
      positionen,
      reverse_charge_13b: input.meta.reverse_charge_13b,
    }
  )

  let liste_berechnung = berechnungVoll
  if (abschlagAktiv && input.zahlungsplan?.zeilen.length && abschlagZeileId) {
    const gesamtNetto = auftragSummenAusPositionen(positionen).netto
    const kontext = berechneZahlungsplan(input.zahlungsplan, gesamtNetto)
    const zeile = kontext.zeilen.find((z) => z.id === abschlagZeileId) ?? null
    if (
      zeile &&
      input.auftrag_id?.trim() &&
      abschlagBereitsAbgerechnet(
        zeile.id,
        await rechnungenAbschlagLinks(supabaseForBerechnung, input.auftrag_id),
        input.rechnungId ?? null
      )
    ) {
      return {
        ok: false,
        message: 'Für diesen Abschlag existiert bereits eine Rechnung. Bitte andere Rate wählen.',
      }
    }
    const zeilenPos = zeile
      ? positionenFuerAbschlagRechnung({
          zeile,
          allePositionen: positionen,
          plan: input.zahlungsplan,
          gesamtNetto,
          auftragsReferenz: '',
          projektTitel: '',
          bereitsGestelltBrutto: berechneBereitsGestellt(
            await rechnungenAbschlagLinks(
              supabaseForBerechnung,
              input.auftrag_id as string
            )
          ).brutto,
        })
      : positionen
    liste_berechnung = rechnungBerechnungFuerAbschlagZeile(
      berechnungVoll,
      zeile,
      rechnungArt,
      zeilenPos,
      { reverseCharge13b: input.meta.reverse_charge_13b }
    )
  }

  const payload = {
    positionen,
    leistungszeitraum_von: input.meta.leistungszeitraum_von || null,
    leistungszeitraum_bis: input.meta.leistungszeitraum_bis || null,
    faellig_am: input.meta.faellig_am || null,
    rechnungsdatum: input.meta.rechnungsdatum || null,
    reverse_charge_13b: input.meta.reverse_charge_13b,
    hinweis_35a: input.meta.hinweis_35a,
    einleitung: input.meta.einleitung || null,
    hinweise: input.meta.hinweise || null,
    mail_einleitung: input.meta.mail_einleitung || null,
    mail_betreff: input.meta.mail_betreff || null,
    zahlungsbedingungen: input.meta.zahlungsbedingungen?.trim() || null,
    rechnung_art: rechnungArt,
    abschlag_index:
      input.abschlag?.zeileIndex ??
      (abschlagAktiv && input.zahlungsplan?.zeilen.length && abschlagZeileId
        ? berechneZahlungsplan(
            input.zahlungsplan,
            auftragSummenAusPositionen(positionen).netto
          ).zeilen.find((z) => z.id === abschlagZeileId)?.index ?? null
        : null),
    zahlungsplan_abschlag_id: input.abschlag?.zeileId ?? abschlagZeileId,
    liste_berechnung,
  }

  if (input.rechnungId) {
    const upd = await updateRechnungEntwurf(input.rechnungId, {
      kunde_id: input.kunde_id,
      ...payload,
    })
    if (!upd.ok) return upd

    const supabase = createClient()
    const { data: nr } = await supabase
      .from('rechnungen')
      .select('rechnungsnummer')
      .eq('id', input.rechnungId)
      .maybeSingle()

    revalidatePath('/rechnungen')
    revalidatePath(`/rechnungen/${input.rechnungId}`)
    revalidateAuftragPfad(input.auftrag_id)
    return {
      ok: true,
      rechnungId: input.rechnungId,
      rechnungsnummer: String(nr?.rechnungsnummer ?? ''),
    }
  }

  if (!input.kunde_id?.trim()) {
    return { ok: false, message: 'Bitte einen Kunden wählen.' }
  }

  const created = await createRechnungEntwurf({
    angebot_id: input.angebot_id,
    auftrag_id: input.auftrag_id,
    kunde_id: input.kunde_id,
    ...payload,
  })
  if (!created.ok) return created

  const supabase = createClient()
  const { data: nr } = await supabase
    .from('rechnungen')
    .select('rechnungsnummer')
    .eq('id', created.id)
    .maybeSingle()

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${created.id}`)
  revalidateAuftragPfad(input.auftrag_id)
  return {
    ok: true,
    rechnungId: created.id,
    rechnungsnummer: String(nr?.rechnungsnummer ?? ''),
  }
}

function entwurfPayloadAusWizardMeta(
  input: SaveRechnungWizardDraftPayload,
  positionen: AngebotPosition[],
  liste_berechnung: import('@/lib/rechnung-berechnung').RechnungBerechnung,
  rechnungArt: 'voll' | 'abschlag' | 'schluss',
  zeile: ZahlungsplanZeileBerechnet | null,
  zeileId: string | null
) {
  return {
    positionen,
    leistungszeitraum_von: input.meta.leistungszeitraum_von || null,
    leistungszeitraum_bis: input.meta.leistungszeitraum_bis || null,
    faellig_am: input.meta.faellig_am || null,
    rechnungsdatum: input.meta.rechnungsdatum || null,
    reverse_charge_13b: input.meta.reverse_charge_13b,
    hinweis_35a: input.meta.hinweis_35a,
    einleitung: input.meta.einleitung || null,
    hinweise: input.meta.hinweise || null,
    mail_einleitung: input.meta.mail_einleitung || null,
    mail_betreff: input.meta.mail_betreff || null,
    zahlungsbedingungen: input.meta.zahlungsbedingungen?.trim() || null,
    rechnung_art: rechnungArt,
    abschlag_index: zeile?.index ?? null,
    zahlungsplan_abschlag_id: zeileId,
    liste_berechnung,
    ist_wiederkehrend: input.ist_wiederkehrend,
    wiederkehr_turnus: input.wiederkehr_turnus,
  }
}

/** Alle Abschlags- und Schlussrechnungen als Entwürfe anlegen (Schritt 2 → 3). */
export async function createAllAbschlagRechnungenFromWizard(
  input: SaveRechnungWizardDraftPayload
): Promise<
  | { ok: true; rechnungen: AbschlagRechnungEntwurf[]; versandRechnungId: string }
  | { ok: false; message: string }
> {
  if (input.meta.zahlungsart !== 'abschlaege' || !input.zahlungsplan?.zeilen.length) {
    return { ok: false, message: 'Kein Abschlagsplan konfiguriert.' }
  }
  if (!input.auftrag_id?.trim()) {
    return { ok: false, message: 'Abschlagsrechnungen erfordern einen Auftrag.' }
  }

  const planSave = await saveAuftragZahlungsplan(input.auftrag_id, input.zahlungsplan)
  if (!planSave.ok) return planSave

  const allePositionen = repairAngebotPositionen(normalizeAngebotPositionen(input.positionen))
  await syncNeueLeistungenToPreisliste(syncInputsFromAngebotPositionen(allePositionen))

  const supabase = createClient()
  const { berechnung: berechnungVoll } = await berechneRechnungMitFirmeneinstellungen(supabase, {
    positionen: allePositionen,
    reverse_charge_13b: input.meta.reverse_charge_13b,
  })

  const gesamtNetto = auftragSummenAusPositionen(allePositionen).netto
  const kontext = berechneZahlungsplan(input.zahlungsplan, gesamtNetto)
  const bestehend = await rechnungenAbschlagLinks(supabase, input.auftrag_id)

  const erstellt: AbschlagRechnungEntwurf[] = []

  for (const zeile of kontext.zeilen) {
    const rechnungArt = rechnungArtFuerZeile(zeile) as 'abschlag' | 'schluss'
    const bereits = berechneBereitsGestellt(
      bestehend.filter((r) => r.zahlungsplan_abschlag_id !== zeile.id)
    )
    const zeilenPos = positionenFuerAbschlagRechnung({
      zeile,
      allePositionen,
      plan: input.zahlungsplan!,
      gesamtNetto,
      auftragsReferenz: '',
      projektTitel: '',
      bereitsGestelltBrutto: bereits.brutto,
    })
    const liste_berechnung = rechnungBerechnungFuerAbschlagZeile(
      berechnungVoll,
      zeile,
      rechnungArt,
      zeilenPos,
      { reverseCharge13b: input.meta.reverse_charge_13b }
    )

    const existing = bestehend.find((r) => r.zahlungsplan_abschlag_id === zeile.id)
    if (existing && existing.status !== 'entwurf') {
      const { data: nrRec } = await supabase
        .from('rechnungen')
        .select('rechnungsnummer')
        .eq('id', existing.id)
        .maybeSingle()
      erstellt.push({
        id: existing.id,
        rechnungsnummer: String(nrRec?.rechnungsnummer ?? ''),
        zeileId: zeile.id,
        index: zeile.index,
        titel: zeile.titel,
        rechnungArt,
        brutto: Number(existing.brutto ?? liste_berechnung.brutto),
        status: String(existing.status ?? 'entwurf'),
      })
      continue
    }

    const payload = entwurfPayloadAusWizardMeta(
      input,
      zeilenPos,
      liste_berechnung,
      rechnungArt,
      zeile,
      zeile.id
    )

    let rechnungId = existing?.id ?? null
    let rechnungsnummer = ''

    if (rechnungId) {
      const upd = await updateRechnungEntwurf(rechnungId, {
        kunde_id: input.kunde_id,
        ...payload,
      })
      if (!upd.ok) return upd
      const { data: nr } = await supabase
        .from('rechnungen')
        .select('rechnungsnummer')
        .eq('id', rechnungId)
        .maybeSingle()
      rechnungsnummer = String(nr?.rechnungsnummer ?? '')
    } else {
      const created = await createRechnungEntwurf({
        angebot_id: input.angebot_id,
        auftrag_id: input.auftrag_id,
        kunde_id: input.kunde_id,
        ...payload,
      })
      if (!created.ok) return created
      rechnungId = created.id
      const { data: nr } = await supabase
        .from('rechnungen')
        .select('rechnungsnummer')
        .eq('id', rechnungId)
        .maybeSingle()
      rechnungsnummer = String(nr?.rechnungsnummer ?? '')
    }

    erstellt.push({
      id: rechnungId!,
      rechnungsnummer,
      zeileId: zeile.id,
      index: zeile.index,
      titel: zeile.titel,
      rechnungArt,
      brutto: liste_berechnung.brutto,
      status: 'entwurf',
    })
  }

  const versandZeileId = input.versandZeileId?.trim() || null
  const versand =
    erstellt.find((r) => r.zeileId === versandZeileId && r.status === 'entwurf') ??
    erstellt.find((r) => r.status === 'entwurf') ??
    erstellt[0]

  if (!versand) {
    return { ok: false, message: 'Keine Rechnung zum Versand verfügbar.' }
  }

  revalidatePath('/rechnungen')
  revalidateAuftragPfad(input.auftrag_id)

  return { ok: true, rechnungen: erstellt, versandRechnungId: versand.id }
}

export async function syncRechnungWizardMetaToEntwurf(
  rechnungId: string,
  input: Pick<SaveRechnungWizardDraftPayload, 'kunde_id' | 'meta'>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('rechnungen')
    .update({
      kunde_id: input.kunde_id,
      leistungszeitraum_von: input.meta.leistungszeitraum_von || null,
      leistungszeitraum_bis: input.meta.leistungszeitraum_bis || null,
      faellig_am: input.meta.faellig_am || null,
      rechnungsdatum: input.meta.rechnungsdatum || null,
      reverse_charge_13b: input.meta.reverse_charge_13b,
      hinweis_35a: input.meta.hinweis_35a,
      einleitung: input.meta.einleitung || null,
      hinweise: input.meta.hinweise || null,
      mail_einleitung: input.meta.mail_einleitung || null,
      mail_betreff: input.meta.mail_betreff || null,
      zahlungsbedingungen: input.meta.zahlungsbedingungen?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rechnungId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/rechnungen/${rechnungId}`)
  return { ok: true }
}

export async function sendRechnungWizard(input: {
  rechnungId: string
  mailTo: string[]
  mailCc?: string[]
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await sendRechnung(input.rechnungId, {
    to: input.mailTo,
    cc: input.mailCc,
  })
  if (!res.ok) return res
  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${input.rechnungId}`)
  return { ok: true }
}

/** PDF erzeugen und speichern — ohne E-Mail (Versand gesammelt in Abschlussdokumentation). */
export async function finalizeRechnungWizardWithoutMail(
  rechnungId: string
): Promise<{ ok: true; rechnungsnummer: string } | { ok: false; message: string }> {
  const pdf = await persistPdfForRechnung(rechnungId)
  if (!pdf.ok) return pdf

  const { data: rec } = await supabaseAdmin
    .from('rechnungen')
    .select('rechnungsnummer, auftrag_id')
    .eq('id', rechnungId)
    .maybeSingle()

  if (rec?.auftrag_id) revalidatePath(`/auftraege/${rec.auftrag_id as string}`)
  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${rechnungId}`)

  return {
    ok: true,
    rechnungsnummer: String(rec?.rechnungsnummer ?? ''),
  }
}

export async function deleteRechnungEntwurf(
  rechnungId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: rec } = await supabase
    .from('rechnungen')
    .select('status, auftrag_id')
    .eq('id', rechnungId)
    .maybeSingle()

  if (!rec) return { ok: false, message: 'Rechnung nicht gefunden.' }
  if (rec.status !== 'entwurf') {
    return { ok: false, message: 'Nur Entwürfe können gelöscht werden.' }
  }

  const { error } = await supabase.from('rechnungen').delete().eq('id', rechnungId)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/rechnungen')
  revalidatePath('/vorgaenge')
  if (rec.auftrag_id) revalidatePath(`/auftraege/${rec.auftrag_id}`)
  return { ok: true }
}
