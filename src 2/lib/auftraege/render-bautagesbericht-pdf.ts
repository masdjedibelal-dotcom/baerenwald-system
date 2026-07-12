import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import { firmenSteuerFooterZeilen } from '@/lib/angebote/angebot-rechtshinweise'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import type { AuftragBautagesbericht } from '@/lib/auftraege/bautagesbericht-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  buildBautagesberichtHtml,
  buildBautagesberichtPdfFooterTemplate,
  type BautagesberichtHtmlInput,
} from '@/lib/templates/bautagesbericht-template'
import type { Kunde } from '@/lib/types'
import { formatDatum } from '@/lib/utils'

function firmZeileAdresse(f: FirmenEinstellungen): string {
  return [[f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')].join('\n')
}

function firmKontaktZeile(f: FirmenEinstellungen): string {
  return [f.telefon ? `Tel. ${f.telefon}` : '', f.email ?? '', f.website ?? ''].filter(Boolean).join(' · ')
}

export type BautagesberichtPdfKontext = {
  auftragTitel: string
  kunde: Kunde | null
  handwerkerName?: string | null
  handwerkerFirma?: string | null
  fotoUrls: Array<{ url: string; caption?: string | null }>
}

function kundeAdresseZeile(k: Kunde | null): string {
  if (!k) return '—'
  const str = [k.strasse, k.hausnummer].filter(Boolean).join(' ').trim()
  const ort = [k.plz, k.ort].filter(Boolean).join(' ').trim()
  return [str, ort].filter(Boolean).join(', ') || k.adresse?.trim() || '—'
}

function kundeName(k: Kunde | null): string {
  if (!k) return '—'
  return k.name?.trim() || [k.vorname, k.nachname].filter(Boolean).join(' ').trim() || '—'
}

export function buildBautagesberichtHtmlInput(
  bericht: AuftragBautagesbericht,
  firm: FirmenEinstellungen,
  kontext: BautagesberichtPdfKontext
): BautagesberichtHtmlInput {
  const arbeitszeit = [bericht.arbeitszeit_von, bericht.arbeitszeit_bis]
    .filter((x) => x?.trim())
    .join(' – ')
  const arbeitszeitSuffix = arbeitszeit ? `${arbeitszeit} Uhr` : ''

  const nuParts = [bericht.nachunternehmer_firma, bericht.nachunternehmer_name]
    .map((x) => x?.trim())
    .filter(Boolean)
  const nachunternehmerZeile = nuParts.join(' – ')

  const kontakt = firmKontaktZeile(firm)

  return {
    firmen_logo_url: resolveAngebotPdfLogoSrc(firm.logo_url),
    firmenname: firm.firmenname,
    firmen_rechtsform: firm.rechtsform?.trim() || null,
    firmen_adresse: firmZeileAdresse(firm),
    firmen_kontakt: kontakt,
    firmen_steuer_footer: firmenSteuerFooterZeilen(firm).join('\n'),
    projektTitel: kontext.auftragTitel,
    projektAdresse: kundeAdresseZeile(kontext.kunde),
    tagNummer: bericht.tag_nummer,
    datumLabel: formatDatum(bericht.datum),
    arbeitszeit: arbeitszeitSuffix,
    wetter: bericht.wetter?.trim() ?? '',
    auftraggeberName: bericht.auftraggeber_name?.trim() || kundeName(kontext.kunde),
    auftragnehmerName: firm.firmenname,
    nachunternehmerZeile,
    leistungen: bericht.leistungen,
    behinderungen: bericht.behinderungen?.trim() ?? '',
    qualitaetssicherung: bericht.qualitaetssicherung?.trim() ?? '',
    risiken: bericht.risiken,
    zusammenfassung: bericht.zusammenfassung?.trim() ?? '',
    personalNamen: bericht.personal_namen,
    fotos: kontext.fotoUrls.map((f) => ({ url: f.url, caption: f.caption })),
  }
}

export async function renderBautagesberichtPdfBuffer(
  bericht: AuftragBautagesbericht,
  firm: FirmenEinstellungen,
  kontext: BautagesberichtPdfKontext
): Promise<Buffer> {
  const htmlInput = buildBautagesberichtHtmlInput(bericht, firm, kontext)
  const html = buildBautagesberichtHtml(htmlInput)
  const footerTemplate = buildBautagesberichtPdfFooterTemplate(htmlInput)
  return renderHtmlToPdfBuffer(html, { footerTemplate })
}
