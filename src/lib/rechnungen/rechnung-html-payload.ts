import { formatKundennr } from '@/lib/angebot-utils'
import { normalizeAngebotPositionen, summenKostenaufstellungAusPositionen } from '@/lib/angebot-positionen'
import {
  firmenBankverbindungZeilen,
  firmenSteuerFooterZeilen,
} from '@/lib/angebote/angebot-rechtshinweise'
import { mapAngebotPositionenToTemplateRows } from '@/lib/angebote/angebot-projekt-pdf-blocks'
import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import {
  resolveRechnungProjektTitel,
  type AngebotLeistungsumfangQuelle,
} from '@/lib/angebote/resolve-angebot-leistungsumfang'
import { buildAngebotHtml, type AngebotHtmlInput } from '@/lib/templates/angebot-template'
import { istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { resolveRechnungEinleitung } from '@/lib/rechnungen/rechnung-texte'
import { angebotPdfBegruessung } from '@/lib/templates/angebot-mail'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  formatKundeEmpfaengerFuerDokument,
  kundeAnredeKontextFromEmpfaenger,
  kundeRechnungsempfaengerAusStammdaten,
} from '@/lib/kunde-rechnungsempfaenger'
import {
  berechneHinweis35aAnteil,
  berechneRechnung,
  parseKleinunternehmerSetting,
  resolveRechnungHinweis35a,
} from '@/lib/rechnung-berechnung'
import {
  DEFAULT_MWST_SATZ,
  HINWEIS_KLEINUNTERNEHMER,
  HINWEIS_REVERSE_CHARGE_13B,
} from '@/lib/rechnung-config'
import { loadGewerkeAusfuehrung, sanitizeAngebotPositionenForExport } from '@/lib/gewerke-ausfuehrung'
import {
  berechneSchlussAbrechnung,
  istAbschlagPauschalPosition,
  type RechnungAbschlagLink,
} from '@/lib/rechnungen/zahlungsplan'
import type { AngebotPosition, Auftrag, Gewerk, Kunde, Rechnung } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

function formatDatumDe(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  try {
    const ymd = iso.trim().slice(0, 10)
    return new Date(`${ymd}T12:00:00`).toLocaleDateString('de-DE')
  } catch {
    return iso
  }
}

function formatLeistungszeitraum(von: string | null, bis: string | null): string {
  const a = formatDatumDe(von)
  const b = formatDatumDe(bis)
  if (a === '—' && b === '—') return '—'
  if (a === b) return a
  return `${a} – ${b}`
}

function firmZeileAdresse(f: FirmenEinstellungen): string {
  return [[f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join('\n')
}

function firmKontaktZeile(f: FirmenEinstellungen): string {
  return [f.telefon ? `Tel. ${f.telefon}` : '', f.email ?? '', f.website ?? '']
    .filter(Boolean)
    .join(' · ')
}

function zahlungstext(firm: FirmenEinstellungen): string {
  const tage = Math.max(1, parseInt(firm.zahlungsziel_tage, 10) || 14)
  return `Zahlbar innerhalb von ${tage} Tagen nach Rechnungserhalt ohne Abzug.`
}

/** Kaputte Mehrfach-„ohne Abzug“-Fragmente aus älteren Daten bereinigen. */
function sanitizeZahlungsbedingungen(raw: string | null | undefined, firm: FirmenEinstellungen): string {
  const cur = (raw ?? '').trim()
  if (!cur) return zahlungstext(firm)
  return cur
    .replace(/(?:\s*ohne Abzug\.?)+/gi, ' ohne Abzug.')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

type AngebotJoin = AngebotLeistungsumfangQuelle | AngebotLeistungsumfangQuelle[] | null | undefined

export type RechnungDetailForPdf = Omit<Rechnung, 'kunden' | 'angebote' | 'auftraege'> & {
  kunden: Kunde | null
  angebote?: AngebotJoin
  auftraege?:
    | (Pick<Auftrag, 'id' | 'titel'> & { angebote?: AngebotJoin })
    | null
}

function firstJoin<T>(raw: T | T[] | null | undefined): T | null {
  if (raw == null) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

function projektTitelAusRechnungDetail(row: RechnungDetailForPdf): string {
  const angebot =
    firstJoin(row.angebote) ?? firstJoin(firstJoin(row.auftraege)?.angebote) ?? null
  return resolveRechnungProjektTitel({
    angebot,
    auftragTitel: firstJoin(row.auftraege)?.titel ?? null,
    fallback: 'Rechnung',
  })
}

function istAbzugZeile(p: AngebotPosition): boolean {
  const slug = (p.gewerk_slug ?? '').toLowerCase()
  if (slug === 'abschlag_abzug') return true
  if (istAbschlagPauschalPosition(p) && (p.leistung ?? '').toLowerCase().startsWith('abzüglich')) {
    return true
  }
  return (p.leistung ?? '').toLowerCase().startsWith('abzüglich')
}

export async function loadVorherigeAbschlaegeFuerSchluss(
  supabase: SupabaseClient,
  auftragId: string,
  ausserRechnungId?: string | null
): Promise<RechnungAbschlagLink[]> {
  const { data } = await supabase
    .from('rechnungen')
    .select(
      'id, rechnung_art, abschlag_index, zahlungsplan_abschlag_id, status, brutto, netto, mwst_satz, mwst_betrag, rechnungsnummer'
    )
    .eq('auftrag_id', auftragId)
  return ((data ?? []) as RechnungAbschlagLink[]).filter(
    (r) => r.id !== ausserRechnungId && r.status !== 'storniert'
  )
}

export function buildRechnungHtmlInput(
  row: RechnungDetailForPdf,
  firm: FirmenEinstellungen,
  gewerke: Gewerk[] = [],
  opts?: { vorherigeAbschlaege?: RechnungAbschlagLink[] | null }
): AngebotHtmlInput {
  if (!row.kunden) throw new Error('Kunde fehlt')

  const allePositionen = sanitizeAngebotPositionenForExport(
    normalizeAngebotPositionen(row.positionen),
    gewerke
  )
  const rechnungArt = String((row as { rechnung_art?: string }).rechnung_art ?? 'voll')
  const istSchluss = rechnungArt === 'schluss'
  const positionen = istSchluss ? allePositionen.filter((p) => !istAbzugZeile(p)) : allePositionen

  const kleinunternehmer = parseKleinunternehmerSetting(firm.kleinunternehmer)
  const defaultMwst = Math.max(0, parseInt(firm.mwst_satz, 10) || DEFAULT_MWST_SATZ)
  const berechnungOpts = {
    kleinunternehmer,
    reverseCharge13b: Boolean(row.reverse_charge_13b),
    defaultMwstSatz: defaultMwst,
  }
  const berechnung = berechneRechnung(positionen, berechnungOpts)

  const privat = istPrivatKundeTyp(row.kunden.typ)
  // Privat / Schluss: kein Arbeitskosten-Block — nur klare Gesamtabrechnung
  const kostenaufstellung =
    istSchluss && privat ? null : summenKostenaufstellungAusPositionen(positionen)

  let schluss_abrechnung: AngebotHtmlInput['schluss_abrechnung'] = null
  let schlussRestNetto: number | null = null
  let schlussRestBrutto: number | null = null
  let schlussVollNetto: number | null = null
  if (istSchluss) {
    const schluss = berechneSchlussAbrechnung(positionen, opts?.vorherigeAbschlaege ?? [], {
      ...berechnungOpts,
      ausserRechnungId: row.id,
    })
    schlussVollNetto = schluss.netto
    if (schluss.bereits_gezahlt_brutto > 0) {
      schlussRestNetto = schluss.rest_netto
      schlussRestBrutto = schluss.rest_brutto
    }
    if (schluss.bereits_gezahlt_brutto > 0 || privat) {
      schluss_abrechnung = {
        netto: schluss.netto,
        mwst_prozent: schluss.mwst_prozent || defaultMwst,
        mwst_betrag: schluss.mwst_betrag,
        brutto: schluss.brutto,
        bereits_gezahlt: schluss.bereits_gezahlt.map((z) => ({
          label: z.label,
          brutto: z.brutto,
        })),
        bereits_gezahlt_brutto: schluss.bereits_gezahlt_brutto,
        rest_brutto: schluss.rest_brutto,
      }
    }
  }

  // §35a: Allgemein = Brutto dieser Rechnung; bei Materialsplit = Netto abzgl. Material
  const anteil35a = berechneHinweis35aAnteil(
    positionen,
    schlussRestNetto ?? berechnung.netto,
    {
      ...(schlussRestNetto != null && schlussVollNetto != null
        ? { vollNetto: schlussVollNetto }
        : {}),
      rechnungBrutto: schlussRestBrutto ?? berechnung.brutto,
    }
  )

  const empfaengerStamm = kundeRechnungsempfaengerAusStammdaten(row.kunden)
  const empfaenger = formatKundeEmpfaengerFuerDokument(row.kunden)
  const anrede: AngebotMailAnrede = privat ? 'du' : 'sie'
  const anredeCtx = kundeAnredeKontextFromEmpfaenger(empfaengerStamm)
  const rechnungsdatumDe = formatDatumDe(String(row.rechnungsdatum))
  const leistungsdatumDe =
    formatDatumDe(row.leistungszeitraum_bis) !== '—'
      ? formatDatumDe(row.leistungszeitraum_bis)
      : formatDatumDe(row.leistungszeitraum_von) !== '—'
        ? formatDatumDe(row.leistungszeitraum_von)
        : rechnungsdatumDe

  const projektTitel = projektTitelAusRechnungDetail(row)
  const abschlagIndex = Number((row as { abschlag_index?: number }).abschlag_index ?? 0) || null

  const einleitung = resolveRechnungEinleitung(row.einleitung, anrede)

  const hinweiseParts: string[] = []
  const freitextHinweise = row.hinweise?.trim()
  if (freitextHinweise) hinweiseParts.push(freitextHinweise)
  if (kleinunternehmer) hinweiseParts.push(HINWEIS_KLEINUNTERNEHMER)
  if (row.reverse_charge_13b) hinweiseParts.push(HINWEIS_REVERSE_CHARGE_13B)

  const auftragJoin = firstJoin(row.auftraege) as
    | (Pick<Auftrag, 'id' | 'titel'> & {
        kostentraeger?: string | null
        versicherungs_nr?: string | null
        versicherungsakte_pdf_url?: string | null
        angebote?: AngebotJoin
      })
    | null
  if (auftragJoin?.kostentraeger === 'versicherung') {
    const versLines = [
      'Versicherungsfall — Hinweise für die Abrechnung:',
      `Policen- / Versicherungs-Nr.: ${auftragJoin.versicherungs_nr?.trim() || '—'}`,
      auftragJoin.versicherungsakte_pdf_url
        ? 'Schadenakte: siehe Vorgangs-Dokumente (Schadenakte Versicherung).'
        : 'Schadenakte: wird im Vorgang bereitgestellt.',
    ]
    hinweiseParts.push(versLines.join('\n'))
  }

  const hinweis35a = resolveRechnungHinweis35a(
    row.hinweis_35a,
    row.kunden.typ,
    anteil35a.lohn_netto,
    kleinunternehmer
  )

  const steuer = firmenSteuerFooterZeilen(firm)
  const bank = firmenBankverbindungZeilen(firm)

  return {
    dokument_art: 'rechnung',
    leistungszeitraum_text: formatLeistungszeitraum(
      row.leistungszeitraum_von,
      row.leistungszeitraum_bis
    ),
    leistungsdatum_text: leistungsdatumDe,
    projekt_titel: projektTitel || null,
    firmen_logo_url: resolveAngebotPdfLogoSrc(firm.logo_url),
    mail_anrede: anrede,
    firmenname: firm.firmenname?.trim() || 'Bärenwald München',
    firmen_rechtsform: firm.rechtsform?.trim() || null,
    geschaeftsfuehrer: firm.geschaeftsfuehrer?.trim() || null,
    firmen_adresse: firmZeileAdresse(firm),
    firmen_kontakt: firmKontaktZeile(firm),
    firmen_steuer_footer: steuer.length ? steuer.join('\n') : null,
    firmen_bankverbindung: bank.length ? bank.join('\n') : null,
    firmen_impressum: firm.pdf_fusszeile?.trim() || null,
    angebotsnr: row.rechnungsnummer,
    kundennr: row.kunden.id ? formatKundennr(row.kunden.id) : '—',
    datum: rechnungsdatumDe,
    gueltig_bis: formatDatumDe(row.faellig_am),
    kunde_name: empfaenger.name,
    kunde_adresse: empfaenger.adresse,
    kunde_typ: row.kunden.typ ?? null,
    leistungsumfang: projektTitel,
    variant_erste_ueberschrift:
      projektTitel && projektTitel !== 'Rechnung' ? projektTitel : undefined,
    begruessung: angebotPdfBegruessung(anrede, anredeCtx),
    einleitung,
    zahlungsbedingungen: sanitizeZahlungsbedingungen(row.zahlungsbedingungen, firm),
    hinweise: hinweiseParts.length ? hinweiseParts.join('\n\n') : null,
    positionen: mapAngebotPositionenToTemplateRows(positionen, gewerke),
    summen: {
      netto: berechnung.netto,
      mwst_prozent: berechnung.mwst_satz,
      mwst_betrag: berechnung.mwst_betrag,
      brutto: berechnung.brutto,
    },
    kostenaufstellung,
    rechtshinweise: {
      hinweis_35a: hinweis35a,
      hinweis_19: kleinunternehmer,
      hinweis_13b: Boolean(row.reverse_charge_13b),
      lohn_netto_35a: anteil35a.lohn_netto,
      material_netto_35a: anteil35a.hat_materialausweis ? anteil35a.material_netto : 0,
    },
    dokument_typ: 'einfach',
    rechnung_typ:
      rechnungArt === 'schluss' ? 'schluss' : rechnungArt === 'abschlag' ? 'abschlag' : 'voll',
    rechnung_abschlag_index: abschlagIndex,
    schluss_abrechnung,
  }
}

export async function buildRechnungHtmlAusDetail(
  row: RechnungDetailForPdf,
  firm: FirmenEinstellungen,
  gewerke: Gewerk[] = [],
  options?: {
    previewFooter?: boolean
    supabase?: SupabaseClient
    vorherigeAbschlaege?: RechnungAbschlagLink[] | null
  }
): Promise<string> {
  let vorherige = options?.vorherigeAbschlaege ?? null
  const art = String((row as { rechnung_art?: string }).rechnung_art ?? '')
  if (!vorherige && art === 'schluss' && row.auftrag_id && options?.supabase) {
    vorherige = await loadVorherigeAbschlaegeFuerSchluss(
      options.supabase,
      row.auftrag_id,
      row.id
    )
  }
  const input = buildRechnungHtmlInput(row, firm, gewerke, {
    vorherigeAbschlaege: vorherige,
  })
  return buildAngebotHtml(input, { includeBodyFooter: options?.previewFooter })
}

export async function loadRechnungDetailForPdf(
  supabase: Parameters<typeof loadGewerkeAusfuehrung>[0],
  rechnungId: string
): Promise<RechnungDetailForPdf | null> {
  const { data, error } = await supabase
    .from('rechnungen')
    .select(
      '*, kunden(*), angebote(leistungsumfang, notizen), auftraege(id, titel, kostentraeger, versicherungs_nr, versicherungsakte_pdf_url, angebote(leistungsumfang, notizen))'
    )
    .eq('id', rechnungId)
    .maybeSingle()
  if (error || !data) return null
  const kRaw = data.kunden
  const kunde = Array.isArray(kRaw) ? kRaw[0] : kRaw
  const aRaw = data.auftraege
  const auftrag = Array.isArray(aRaw) ? aRaw[0] : aRaw
  const angRaw = data.angebote
  const angebot = Array.isArray(angRaw) ? angRaw[0] : angRaw
  return {
    ...(data as Rechnung),
    kunden: (kunde as Kunde) ?? null,
    angebote: (angebot as AngebotLeistungsumfangQuelle | null) ?? null,
    auftraege: (auftrag as RechnungDetailForPdf['auftraege']) ?? null,
  }
}
