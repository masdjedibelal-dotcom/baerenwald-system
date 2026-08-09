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
import type { Auftrag, Gewerk, Kunde, Rechnung } from '@/lib/types'

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

export function buildRechnungHtmlInput(
  row: RechnungDetailForPdf,
  firm: FirmenEinstellungen,
  gewerke: Gewerk[] = []
): AngebotHtmlInput {
  if (!row.kunden) throw new Error('Kunde fehlt')

  const positionen = sanitizeAngebotPositionenForExport(
    normalizeAngebotPositionen(row.positionen),
    gewerke
  )
  const kleinunternehmer = parseKleinunternehmerSetting(firm.kleinunternehmer)
  const defaultMwst = Math.max(0, parseInt(firm.mwst_satz, 10) || DEFAULT_MWST_SATZ)
  const berechnung = berechneRechnung(positionen, {
    kleinunternehmer,
    reverseCharge13b: Boolean(row.reverse_charge_13b),
    defaultMwstSatz: defaultMwst,
  })
  const kostenaufstellung = summenKostenaufstellungAusPositionen(positionen)

  const empfaengerStamm = kundeRechnungsempfaengerAusStammdaten(row.kunden)
  const empfaenger = formatKundeEmpfaengerFuerDokument(row.kunden)
  const anrede: AngebotMailAnrede = istPrivatKundeTyp(row.kunden.typ) ? 'du' : 'sie'
  const anredeCtx = kundeAnredeKontextFromEmpfaenger(empfaengerStamm)
  const rechnungsdatumDe = formatDatumDe(String(row.rechnungsdatum))
  const leistungsdatumDe =
    formatDatumDe(row.leistungszeitraum_bis) !== '—'
      ? formatDatumDe(row.leistungszeitraum_bis)
      : formatDatumDe(row.leistungszeitraum_von) !== '—'
        ? formatDatumDe(row.leistungszeitraum_von)
        : rechnungsdatumDe

  const projektTitel = projektTitelAusRechnungDetail(row)
  const rechnungArt = String((row as { rechnung_art?: string }).rechnung_art ?? 'voll')
  const abschlagIndex = Number((row as { abschlag_index?: number }).abschlag_index ?? 0) || null

  const einleitung = resolveRechnungEinleitung(row.einleitung, anrede)

  const hinweiseParts: string[] = []
  const freitextHinweise = row.hinweise?.trim()
  if (freitextHinweise) hinweiseParts.push(freitextHinweise)
  if (kleinunternehmer) hinweiseParts.push(HINWEIS_KLEINUNTERNEHMER)
  if (row.reverse_charge_13b) hinweiseParts.push(HINWEIS_REVERSE_CHARGE_13B)

  const hinweis35a = resolveRechnungHinweis35a(
    row.hinweis_35a,
    row.kunden.typ,
    kostenaufstellung?.lohn_netto ?? 0,
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
    /** Optional: Projektzeile im Fließtext (Meta bleibt im Briefkopf) */
    variant_erste_ueberschrift:
      projektTitel && projektTitel !== 'Rechnung' ? projektTitel : undefined,
    begruessung: angebotPdfBegruessung(anrede, anredeCtx),
    einleitung,
    zahlungsbedingungen: row.zahlungsbedingungen?.trim() || zahlungstext(firm),
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
    },
    dokument_typ: 'einfach',
    rechnung_typ:
      rechnungArt === 'schluss' ? 'schluss' : rechnungArt === 'abschlag' ? 'abschlag' : 'voll',
    rechnung_abschlag_index: abschlagIndex,
  }
}

export function buildRechnungHtmlAusDetail(
  row: RechnungDetailForPdf,
  firm: FirmenEinstellungen,
  gewerke: Gewerk[] = [],
  options?: { previewFooter?: boolean }
): string {
  const input = buildRechnungHtmlInput(row, firm, gewerke)
  return buildAngebotHtml(input, { includeBodyFooter: options?.previewFooter })
}

export async function loadRechnungDetailForPdf(
  supabase: Parameters<typeof loadGewerkeAusfuehrung>[0],
  rechnungId: string
): Promise<RechnungDetailForPdf | null> {
  const { data, error } = await supabase
    .from('rechnungen')
    .select(
      '*, kunden(*), angebote(leistungsumfang, notizen), auftraege(id, titel, angebote(leistungsumfang, notizen))'
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
