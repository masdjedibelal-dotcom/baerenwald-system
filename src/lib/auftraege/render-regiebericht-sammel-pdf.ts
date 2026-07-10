import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import { firmenSteuerFooterZeilen } from '@/lib/angebote/angebot-rechtshinweise'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import type { AuftragBaustelleTeam, AuftragRegiearbeit } from '@/lib/auftraege/baustelle-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  buildRegieberichtSammelHtml,
  buildRegieberichtSammelPdfFooterTemplate,
  type RegieberichtSammelHtmlInput,
} from '@/lib/templates/regiebericht-sammel-template'
import type { Kunde } from '@/lib/types'

function firmZeileAdresse(f: FirmenEinstellungen): string {
  return [[f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')].join('\n')
}

function firmKontaktZeile(f: FirmenEinstellungen): string {
  return [f.telefon ? `Tel. ${f.telefon}` : '', f.email ?? '', f.website ?? ''].filter(Boolean).join(' · ')
}

function kundeAdresseZeile(k: Kunde | null): string {
  if (!k) return '—'
  const str = [k.strasse, k.hausnummer].filter(Boolean).join(' ').trim()
  const ort = [k.plz, k.ort].filter(Boolean).join(' ').trim()
  return [str, ort].filter(Boolean).join(', ') || k.adresse?.trim() || '—'
}

type RegieSammelPdfLoaded = {
  regiearbeiten: AuftragRegiearbeit[]
  team: AuftragBaustelleTeam
  auftragTitel: string
  kunde: Kunde | null
  auftraggeberName: string
  kalenderwoche: number
  jahr: number
  vonDatum: string
  bisDatum: string
}

export function buildRegieberichtSammelHtmlInput(
  firm: FirmenEinstellungen,
  loaded: RegieSammelPdfLoaded
): RegieberichtSammelHtmlInput {
  return {
    firmen_logo_url: resolveAngebotPdfLogoSrc(firm.logo_url),
    firmenname: firm.firmenname,
    firmen_rechtsform: firm.rechtsform?.trim() || null,
    firmen_adresse: firmZeileAdresse(firm),
    firmen_kontakt: firmKontaktZeile(firm),
    firmen_steuer_footer: firmenSteuerFooterZeilen(firm).join('\n'),
    projektTitel: loaded.auftragTitel,
    projektAdresse: kundeAdresseZeile(loaded.kunde),
    auftraggeberName: loaded.auftraggeberName,
    kalenderwoche: loaded.kalenderwoche,
    jahr: loaded.jahr,
    vonDatum: loaded.vonDatum,
    bisDatum: loaded.bisDatum,
    regiearbeiten: loaded.regiearbeiten,
    bauleiterName: loaded.team.bauleiter_name?.trim() ?? '',
  }
}

export async function renderRegieberichtSammelPdfBuffer(
  firm: FirmenEinstellungen,
  loaded: RegieSammelPdfLoaded
): Promise<Buffer> {
  const htmlInput = buildRegieberichtSammelHtmlInput(firm, loaded)
  const html = buildRegieberichtSammelHtml(htmlInput)
  const footerTemplate = buildRegieberichtSammelPdfFooterTemplate(htmlInput)
  return renderHtmlToPdfBuffer(html, { footerTemplate })
}
