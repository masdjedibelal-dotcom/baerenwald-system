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
} from '@/lib/rechnungen/rechnung-wizard-types'
import { resolveRechnungProjektTitel } from '@/lib/angebote/resolve-angebot-leistungsumfang'
import { mailAnredeFromKundeTyp } from '@/lib/mail/anrede'
import {
  abschlagTextKontextFromWizard,
  defaultAbschlagMailBetreff,
  defaultAbschlagMailEinleitung,
  defaultAbschlagPdfEinleitung,
} from '@/lib/rechnungen/zahlungsplan-texte'
import {
  auftragSummenAusPositionen,
  berechneBereitsGestellt,
  berechneZahlungsplan,
  buildAbschlagPauschalPosition,
  naechsteOffeneAbschlagZeile,
  parseZahlungsplan,
  rechnungArtFuerZeile,
  resolveAnredeKey,
  zahlungsplanVorlage50_50,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import { saveAuftragZahlungsplan } from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
import { maybeUpgradeLegacyRechnungsnummer } from '@/lib/rechnungen/next-rechnungsnummer'
import { syncNeueLeistungenToPreisliste } from '@/app/(dashboard)/preislisten/actions'
import { syncInputsFromAngebotPositionen } from '@/lib/preislisten/sync-neue-leistungen'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'

export type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'

export type SaveRechnungWizardDraftPayload = {
  rechnungId?: string | null
  auftrag_id: string
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
}> {
  const gewerke = await loadGewerkeAusfuehrung(supabase)

  const { data: auf, error } = await supabase
    .from('auftraege')
    .select(
      `
      id,
      created_at,
      kunde_id,
      angebot_id,
      titel,
      start_datum,
      end_datum,
      zahlungsplan,
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
  if (!auf?.kunde_id) {
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

  return {
    positionen,
    angebot_id: (auf.angebot_id as string | null) ?? null,
    kunde_id: auf.kunde_id as string,
    auftragsReferenz,
    projektTitel,
    leistungszeitraum_von: (auf.start_datum as string | null) ?? null,
    leistungszeitraum_bis: (auf.end_datum as string | null) ?? null,
    zahlungsplan,
    gesamtNetto: summen.netto,
    gesamtBrutto: kontext?.gesamtBrutto ?? summen.brutto,
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
  bereitsGestelltBrutto: number,
  kundeTyp?: string | null,
  rechnungsnummerPlaceholder?: string | null
): RechnungWizardMeta {
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
    einleitung: pdfVorlage || defaultAbschlagPdfEinleitung(ctx),
    hinweise: '',
    mail_einleitung: mailVorlage || defaultAbschlagMailEinleitung(ctx),
    mail_betreff:
      betreffVorlage ||
      defaultAbschlagMailBetreff(ctx, 'Bärenwald', rechnungsnummerPlaceholder?.trim() || 'Rechnung'),
    reverse_charge_13b: false,
    rechnungsdatum: new Date().toISOString().slice(0, 10),
    leistungszeitraum_von: basis.leistungszeitraum_von?.trim() || new Date().toISOString().slice(0, 10),
    leistungszeitraum_bis: basis.leistungszeitraum_bis?.trim() || new Date().toISOString().slice(0, 10),
    faellig_am: '',
  }
}

export async function loadRechnungWizardBootstrapFromAuftrag(
  auftragId: string
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
        meta: defaultRechnungWizardMeta(zt, {
          leistungszeitraum_von: basis.leistungszeitraum_von,
          leistungszeitraum_bis: basis.leistungszeitraum_bis,
          projektTitel: basis.projektTitel,
          kundeTyp: kunde?.typ,
        }),
        auftragsReferenz: basis.auftragsReferenz,
        projektTitel: basis.projektTitel,
        modus: 'voll',
      },
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Laden fehlgeschlagen' }
  }
}

export async function loadRechnungWizardBootstrapFromAuftragAbschlag(
  auftragId: string
): Promise<{ ok: true; bootstrap: RechnungWizardBootstrap } | { ok: false; message: string }> {
  try {
    const supabase = createClient()
    const basis = await positionenAusAuftrag(supabase, auftragId)
    const rechnungen = await rechnungenAbschlagLinks(supabase, auftragId)
    const { data: kunde, error: kundeErr } = await loadKundeFuerRechnung(supabase, basis.kunde_id)
    if (kundeErr) return { ok: false, message: kundeErr.message }

    const firm = await fetchFirmenEinstellungen(supabase)
    const zt = Math.max(
      1,
      parseInt(firm.zahlungsziel_tage, 10) || defaultZahlungszielTage(kunde?.typ)
    )

    const plan = basis.zahlungsplan
    const zahlungsplanBearbeiten = !plan?.zeilen.length

    if (!plan?.zeilen.length) {
      const metaDefaults = defaultRechnungWizardMeta(zt, {
        leistungszeitraum_von: basis.leistungszeitraum_von,
        leistungszeitraum_bis: basis.leistungszeitraum_bis,
        projektTitel: basis.projektTitel,
        kundeTyp: kunde?.typ,
      })
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
          meta: metaDefaults,
          auftragsReferenz: basis.auftragsReferenz,
          projektTitel: basis.projektTitel,
          modus: 'abschlag',
          abschlag: {
            zeileId: '',
            zeileIndex: 0,
            zeileTitel: '',
            rechnungArt: 'abschlag',
            istSchluss: false,
            gesamtNetto: basis.gesamtNetto,
            gesamtBrutto: basis.gesamtBrutto,
            bereitsGestelltBrutto: 0,
          },
          zahlungsplan: zahlungsplanVorlage50_50(),
          zahlungsplanBearbeiten: true,
        },
      }
    }

    const kontext = berechneZahlungsplan(plan, basis.gesamtNetto)
    const naechste = naechsteOffeneAbschlagZeile(plan, kontext, rechnungen)
    if (!naechste) {
      return { ok: false, message: 'Alle Abschläge sind bereits abgerechnet.' }
    }

    const bereits = berechneBereitsGestellt(rechnungen)
    const abschlagPosition = buildAbschlagPauschalPosition({
      zeile: naechste,
      gesamtNetto: basis.gesamtNetto,
      auftragsReferenz: basis.auftragsReferenz,
      projektTitel: basis.projektTitel ?? '',
      bereitsGestelltBrutto: bereits.brutto,
    })

    const metaPartial = abschlagMetaDefaults(basis, naechste, bereits.brutto, kunde?.typ)
    const heute = new Date().toISOString().slice(0, 10)
    const meta: RechnungWizardMeta = {
      ...metaPartial,
      rechnungsdatum: heute,
      faellig_am: metaPartial.faellig_am || addDaysIsoLocal(heute, zt),
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
        positionen: [abschlagPosition],
        meta,
        auftragsReferenz: basis.auftragsReferenz,
        projektTitel: basis.projektTitel,
        modus: 'abschlag',
        abschlag: {
          zeileId: naechste.id,
          zeileIndex: naechste.index,
          zeileTitel: naechste.titel,
          rechnungArt: rechnungArtFuerZeile(naechste),
          istSchluss: naechste.istSchluss,
          gesamtNetto: basis.gesamtNetto,
          gesamtBrutto: basis.gesamtBrutto,
          bereitsGestelltBrutto: bereits.brutto,
        },
        zahlungsplan: plan,
        zahlungsplanBearbeiten: false,
      },
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Laden fehlgeschlagen' }
  }
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
    normalizeAngebotPositionen((rec.positionen as AngebotPosition[]) ?? basis.positionen)
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
  })

  const meta: RechnungWizardMeta = {
    einleitung: String(rec.einleitung ?? '').trim() || metaDefaults.einleitung,
    hinweise: String(rec.hinweise ?? '').trim() || metaDefaults.hinweise,
    mail_einleitung: String(rec.mail_einleitung ?? '').trim() || metaDefaults.mail_einleitung,
    mail_betreff: String(rec.mail_betreff ?? '').trim() || metaDefaults.mail_betreff,
    reverse_charge_13b: Boolean(rec.reverse_charge_13b),
    rechnungsdatum: String(rec.rechnungsdatum ?? new Date().toISOString().slice(0, 10)),
    leistungszeitraum_von: String(rec.leistungszeitraum_von ?? basis.leistungszeitraum_von ?? ''),
    leistungszeitraum_bis: String(rec.leistungszeitraum_bis ?? basis.leistungszeitraum_bis ?? ''),
    faellig_am: String(rec.faellig_am ?? ''),
  }

  const rechnungArt = String(rec.rechnung_art ?? 'voll')
  const modus = rechnungArt === 'abschlag' || rechnungArt === 'schluss' ? 'abschlag' : 'voll'

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

  if (input.zahlungsplanSpeichern && input.zahlungsplan?.zeilen.length) {
    const planSave = await saveAuftragZahlungsplan(input.auftrag_id, input.zahlungsplan)
    if (!planSave.ok) return planSave
  }

  await syncNeueLeistungenToPreisliste(syncInputsFromAngebotPositionen(positionen))

  const payload = {
    positionen,
    leistungszeitraum_von: input.meta.leistungszeitraum_von || null,
    leistungszeitraum_bis: input.meta.leistungszeitraum_bis || null,
    faellig_am: input.meta.faellig_am || null,
    rechnungsdatum: input.meta.rechnungsdatum || null,
    reverse_charge_13b: input.meta.reverse_charge_13b,
    einleitung: input.meta.einleitung || null,
    hinweise: input.meta.hinweise || null,
    mail_einleitung: input.meta.mail_einleitung || null,
    mail_betreff: input.meta.mail_betreff || null,
    rechnung_art:
      input.modus === 'abschlag'
        ? (input.abschlag?.rechnungArt ?? 'abschlag')
        : ('voll' as const),
    abschlag_index: input.abschlag?.zeileIndex ?? null,
    zahlungsplan_abschlag_id: input.abschlag?.zeileId ?? null,
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
    revalidatePath(`/auftraege/${input.auftrag_id}`)
    return {
      ok: true,
      rechnungId: input.rechnungId,
      rechnungsnummer: String(nr?.rechnungsnummer ?? ''),
    }
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
  revalidatePath(`/auftraege/${input.auftrag_id}`)
  return {
    ok: true,
    rechnungId: created.id,
    rechnungsnummer: String(nr?.rechnungsnummer ?? ''),
  }
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
  if (rec.auftrag_id) revalidatePath(`/auftraege/${rec.auftrag_id}`)
  return { ok: true }
}
