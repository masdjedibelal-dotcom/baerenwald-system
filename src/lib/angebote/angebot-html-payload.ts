import { formatKundennr } from '@/lib/angebot-utils'
import {
  angebotWizardZahlungLabel,
  parseZahlungsbedingungenKey,
  resolveAngebotKundeTyp,
  type AngebotVariantenPersistJson,
} from '@/lib/angebote/angebot-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  normalizeAngebotPositionen,
  summenAusPositionen,
  summenKostenaufstellungAusPositionen,
} from '@/lib/angebot-positionen'
import {
  firmenBankverbindungZeilen,
  firmenSteuerFooterZeilen,
  parseRechtshinweiseFromWizardMeta,
} from '@/lib/angebote/angebot-rechtshinweise'
import { buildAngebotHtml, type AngebotHtmlInput, type AngebotTemplatePosition } from '@/lib/templates/angebot-template'
import {
  angebotPdfBegruessung,
  parseAngebotAnrede,
  parseWizardMetaFromNotizen,
  resolveAngebotPdfEinleitung,
} from '@/lib/templates/angebot-mail'
import { mapAngebotPositionenToTemplateRows } from '@/lib/angebote/angebot-projekt-pdf-blocks'
import { buildProjektPdfBloecke } from '@/lib/angebote/angebot-projekt-pdf-blocks'
import { istFreitextPosition } from '@/lib/dokument-zeilen'
import { parseProjektFotos } from '@/lib/angebote/angebot-projekt-fotos'
import { formatKundeEmpfaengerFuerDokument, kundeAnredeKontextFromEmpfaenger, kundeRechnungsempfaengerAusStammdaten } from '@/lib/kunde-rechnungsempfaenger'
import { resolveAngebotDurchfuehrungIn } from '@/lib/kunden-objekte'
import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import { resolveAngebotLeistungsumfang } from '@/lib/angebote/resolve-angebot-leistungsumfang'
import type { AngebotDetail, AngebotPosition, Gewerk } from '@/lib/types'
import type { KiVizPdfPage } from '@/lib/visualize/pdf-data'

function parseVariantenPersist(raw: unknown): AngebotVariantenPersistJson | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as AngebotVariantenPersistJson
  if (!v.b || !Array.isArray(v.b.positionen)) return null
  return v
}

function wizardMetaAusNotizen(notizen: string | null | undefined): Record<string, unknown> | null {
  try {
    const j = JSON.parse(notizen ?? '{}') as { wizard_meta?: Record<string, unknown> }
    return j.wizard_meta ?? null
  } catch {
    return null
  }
}

function schlussAusNotizen(notizen: string | null | undefined): string | null {
  const wm = wizardMetaAusNotizen(notizen)
  const s = typeof wm?.schluss === 'string' ? wm.schluss : ''
  return s.trim().length ? s.trim() : null
}

function firmenFusszeilen(firm: FirmenEinstellungen): {
  steuer_footer: string | null
  bankverbindung: string | null
  impressum: string | null
} {
  const steuer = firmenSteuerFooterZeilen(firm)
  const bank = firmenBankverbindungZeilen(firm)
  const impressum = firm.pdf_fusszeile?.trim() || null
  return {
    steuer_footer: steuer.length ? steuer.join('\n') : null,
    bankverbindung: bank.length ? bank.join('\n') : null,
    impressum,
  }
}

function firmZeileAdresse(f: FirmenEinstellungen): string {
  const parts = [[f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')]
  return parts.filter(Boolean).join('\n')
}

function firmKontaktZeile(f: FirmenEinstellungen): string {
  const t = [f.telefon ? `Tel. ${f.telefon}` : '', f.email ?? '', f.website ?? ''].filter(Boolean)
  return t.join(' · ')
}

function resolveLeistungsumfang(detail: AngebotDetail): string {
  return resolveAngebotLeistungsumfang(
    { leistungsumfang: detail.leistungsumfang, notizen: detail.notizen },
    { leadSituation: detail.leads?.situation }
  )
}

function parseGueltigDe(detail: AngebotDetail, firm: FirmenEinstellungen): string {
  if (detail.gueltig_bis) {
    try {
      return new Date(detail.gueltig_bis as string).toLocaleDateString('de-DE')
    } catch {
      /* noop */
    }
  }
  const tage = Math.max(1, parseInt(String(firm.angebot_gueltig_tage ?? '30'), 10) || 30)
  const d = new Date()
  d.setDate(d.getDate() + tage)
  return d.toLocaleDateString('de-DE')
}

function mapZuTemplateZeilen(anPos: AngebotPosition[], gewerke: Gewerk[]): AngebotTemplatePosition[] {
  return mapAngebotPositionenToTemplateRows(anPos.filter((p) => !istFreitextPosition(p)), gewerke)
}

/** Payload für Angebots-HTML/PDF (Footer-Template, Vorschau). */
export function buildAngebotHtmlInputAusDetail(
  detail: AngebotDetail,
  firm: FirmenEinstellungen,
  gewerke: Gewerk[] = [],
  extras?: { ki_visualisierungen?: KiVizPdfPage[] }
): AngebotHtmlInput {
  const kunde = detail.kunden
  if (!kunde) {
    const fuss = firmenFusszeilen(firm)
    const anrede = parseAngebotAnrede(
      detail.notizen,
      resolveAngebotKundeTyp(detail.kunden?.typ, detail.leads?.kundentyp)
    )
    const wm = parseWizardMetaFromNotizen(detail.notizen)
    const lu = resolveLeistungsumfang(detail)
    return {
      firmen_logo_url: resolveAngebotPdfLogoSrc(firm.logo_url),
      mail_anrede: anrede,
      firmenname: firm.firmenname?.trim() || 'Bärenwald München',
      firmen_rechtsform: firm.rechtsform?.trim() || null,
      geschaeftsfuehrer: firm.geschaeftsfuehrer?.trim() || null,
      firmen_adresse: firmZeileAdresse(firm),
      firmen_kontakt: firmKontaktZeile(firm),
      firmen_steuer_footer: fuss.steuer_footer,
      firmen_bankverbindung: fuss.bankverbindung,
      firmen_impressum: fuss.impressum,
      angebotsnr: detail.angebotsnr?.trim() || `AG${detail.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
      kundennr: '—',
      datum: new Date(detail.created_at).toLocaleDateString('de-DE'),
      gueltig_bis: parseGueltigDe(detail, firm),
      kunde_name: '',
      kunde_adresse: '',
      leistungsumfang: lu,
      begruessung: angebotPdfBegruessung(anrede, { name: '' }),
      einleitung: resolveAngebotPdfEinleitung(detail.einleitung ?? wm?.einleitung, anrede),
      zahlungsbedingungen: angebotWizardZahlungLabel(parseZahlungsbedingungenKey(null, 'privat')),
      hinweise: detail.hinweise?.trim() || null,
      positionen: [],
      summen: { netto: 0, mwst_prozent: 19, mwst_betrag: 0, brutto: 0 },
      schlusstext: schlussAusNotizen(detail.notizen),
    }
  }

  const pos = normalizeAngebotPositionen(detail.positionen)
  const summen = summenAusPositionen(pos, 19)

  const istProjekt = detail.dokument_typ === 'projekt'
  const varianten = parseVariantenPersist(detail.varianten)
  const posB = varianten?.b?.positionen?.length
    ? normalizeAngebotPositionen(varianten.b.positionen)
    : []
  const hatZweiVarianten = istProjekt && posB.length > 0

  const positionen = mapZuTemplateZeilen(pos, gewerke)
  const posBTemplate = posB.length ? mapZuTemplateZeilen(posB, gewerke) : []
  const hatFachbetriebPositionen =
    positionen.some((p) => p.ist_fachbetrieb) || posBTemplate.some((p) => p.ist_fachbetrieb)

  const netto = summen.nettoMin
  const mwst = summen.mwstBetragMin
  const brutto = summen.bruttoMin

  const zKey = parseZahlungsbedingungenKey(
    detail.zahlungsbedingungen,
    kunde.typ ?? detail.leads?.kundentyp
  )

  const anrede = parseAngebotAnrede(
    detail.notizen,
    resolveAngebotKundeTyp(detail.kunden?.typ, detail.leads?.kundentyp)
  )
  const wmParsed = parseWizardMetaFromNotizen(detail.notizen)
  const empfaenger = formatKundeEmpfaengerFuerDokument(kunde, detail.leads?.plz ?? null)
  const empfaengerStamm = kundeRechnungsempfaengerAusStammdaten(kunde, {
    plz: detail.leads?.plz ?? null,
    kontakt_name: detail.leads?.kontakt_name ?? null,
  })
  const leistungsumfang = resolveLeistungsumfang(detail)
  const begruessung = angebotPdfBegruessung(anrede, kundeAnredeKontextFromEmpfaenger(empfaengerStamm))
  const einleitung = resolveAngebotPdfEinleitung(
    detail.einleitung?.trim() || wmParsed?.einleitung,
    anrede
  )

  let variant_block: AngebotHtmlInput['variant_block'] = null
  if (hatZweiVarianten) {
    const summenB = summenAusPositionen(posB, 19)
    variant_block = {
      titel: varianten!.b.name?.trim() || 'Variante B',
      positionen: posBTemplate,
      summen: {
        netto: Math.round(summenB.nettoMin * 100) / 100,
        mwst_prozent: 19,
        mwst_betrag: Math.round(summenB.mwstBetragMin * 100) / 100,
        brutto: Math.round(summenB.bruttoMin * 100) / 100,
      },
    }
  }

  const hinweiseAnzeige = istProjekt
    ? detail.wichtige_hinweise?.trim() ||
      (typeof wmParsed?.hinweise === 'string' ? wmParsed.hinweise.trim() : '') ||
      null
    : detail.hinweise?.trim() || null

  const fuss = firmenFusszeilen(firm)
  const wm = wizardMetaAusNotizen(detail.notizen)
  const rechtshinweise = parseRechtshinweiseFromWizardMeta(wm, kunde.typ, firm)
  const mwstSatz = Math.max(0, parseInt(String(firm.mwst_satz ?? '19'), 10) || 19)
  const projekt_bloecke = istProjekt
    ? buildProjektPdfBloecke(pos, varianten, gewerke, mwstSatz)
    : null

  const verwaltersObjekt = detail.kunden_objekte ?? null
  const durchfuehrungIn = resolveAngebotDurchfuehrungIn(verwaltersObjekt)

  const payload: AngebotHtmlInput = {
    firmen_logo_url: resolveAngebotPdfLogoSrc(firm.logo_url),
    mail_anrede: anrede,
    firmenname: firm.firmenname?.trim() || 'Bärenwald München',
    firmen_rechtsform: firm.rechtsform?.trim() || null,
    geschaeftsfuehrer: firm.geschaeftsfuehrer?.trim() || null,
    firmen_adresse: firmZeileAdresse(firm),
    firmen_kontakt: firmKontaktZeile(firm),
    firmen_steuer_footer: fuss.steuer_footer,
    firmen_bankverbindung: fuss.bankverbindung,
    firmen_impressum: fuss.impressum,
    angebotsnr: detail.angebotsnr?.trim() || `AG${detail.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    kundennr: kunde.id ? formatKundennr(kunde.id) : '—',
    datum: new Date(detail.created_at).toLocaleDateString('de-DE'),
    gueltig_bis: parseGueltigDe(detail, firm),
    kunde_name: empfaenger.name,
    kunde_adresse: empfaenger.adresse,
    kunde_typ: kunde.typ ?? null,
    kunde_ort:
      verwaltersObjekt?.ort?.trim() ||
      kunde.ort?.trim() ||
      detail.leads?.plz?.trim() ||
      null,
    durchfuehrung_in: durchfuehrungIn,
    leistungsumfang,
    begruessung,
    einleitung,
    zahlungsbedingungen: angebotWizardZahlungLabel(zKey),
    hinweise: hinweiseAnzeige,
    positionen,
    summen: {
      netto: Math.round(netto * 100) / 100,
      mwst_prozent: mwstSatz,
      mwst_betrag: Math.round(mwst * 100) / 100,
      brutto: Math.round(brutto * 100) / 100,
    },
    kostenaufstellung: summenKostenaufstellungAusPositionen(pos),
    rechtshinweise,
    schlusstext: schlussAusNotizen(detail.notizen),
    dokument_typ: istProjekt ? 'projekt' : 'einfach',
    projektbeschreibung: detail.projektbeschreibung?.trim() ?? null,
    dokumentation_bilder: (() => {
      const fotos = parseProjektFotos(detail.fotos_urls)
      return fotos.length > 0 ? fotos : undefined
    })(),
    variant_block: istProjekt ? null : variant_block,
    variant_erste_ueberschrift: istProjekt
      ? undefined
      : hatZweiVarianten && varianten?.a?.name?.trim()
        ? varianten.a.name.trim()
        : undefined,
    hat_fachbetrieb_positionen: hatFachbetriebPositionen,
    projekt_bloecke,
    projekt_hat_varianten: hatZweiVarianten,
    pdf_gewerke: gewerke,
    pdf_roh_positionen: pos,
    ki_visualisierungen: extras?.ki_visualisierungen?.length
      ? extras.ki_visualisierungen
      : undefined,
  }

  return payload
}

export type BuildAngebotHtmlOptions = {
  /** Statische Fußzeile im HTML (Browser-Vorschau); PDF nutzt Puppeteer footerTemplate. */
  previewFooter?: boolean
}

/** Erzeugt HTML für das Angebots-PDF aus Detail + Firmeneinstellungen. */
export function buildAngebotHtmlAusDetail(
  detail: AngebotDetail,
  firm: FirmenEinstellungen,
  gewerke: Gewerk[] = [],
  options?: BuildAngebotHtmlOptions
): string {
  return buildAngebotHtml(buildAngebotHtmlInputAusDetail(detail, firm, gewerke), {
    includeBodyFooter: options?.previewFooter ?? false,
  })
}

/** Wie buildAngebotHtmlAusDetail, inkl. KI-Visualisierungen aus der DB. */
export async function buildAngebotHtmlAusDetailAsync(
  detail: AngebotDetail,
  firm: FirmenEinstellungen,
  gewerke: Gewerk[] = [],
  options?: BuildAngebotHtmlOptions
): Promise<string> {
  const { loadKiVizPdfPagesForAngebot } = await import('@/lib/visualize/pdf-data')
  const kiViz = await loadKiVizPdfPagesForAngebot(detail.id)
  return buildAngebotHtml(
    buildAngebotHtmlInputAusDetail(detail, firm, gewerke, { ki_visualisierungen: kiViz }),
    { includeBodyFooter: options?.previewFooter ?? false }
  )
}
