import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import { firmenSteuerFooterZeilen } from '@/lib/angebote/angebot-rechtshinweise'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import { aggregiereBaustellenPersonal } from '@/lib/auftraege/baustelle-helpers'
import type { AuftragBaustelleTeam, AuftragRegiearbeit, AuftragWochenbericht } from '@/lib/auftraege/baustelle-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  buildWochenberichtHtml,
  buildWochenberichtPdfFooterTemplate,
  type WochenberichtHtmlInput,
  type WochenberichtTagesZeile,
} from '@/lib/templates/wochenbericht-template'
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

type WochenberichtPdfLoaded = {
  woche: AuftragWochenbericht
  tagesberichte: Array<{
    tag_nummer: number
    datum: string
    wetter?: string | null
    zusammenfassung?: string | null
    leistungen: string[]
    behinderungen?: string | null
    personal_namen: string[]
  }>
  regiearbeiten: AuftragRegiearbeit[]
  team: AuftragBaustelleTeam
  auftragTitel: string
  kunde: Kunde | null
  auftraggeberName: string
}

export function buildWochenberichtHtmlInput(
  firm: FirmenEinstellungen,
  loaded: WochenberichtPdfLoaded
): WochenberichtHtmlInput {
  const tagesZeilen: WochenberichtTagesZeile[] = loaded.tagesberichte.map((t) => ({
    tag_nummer: t.tag_nummer,
    datum: t.datum,
    wetter: t.wetter,
    zusammenfassung: t.zusammenfassung,
    leistungen: t.leistungen,
    behinderungen: t.behinderungen,
  }))

  const alleLeistungen = Array.from(
    new Set(loaded.tagesberichte.flatMap((t) => t.leistungen.map((l) => l.trim()).filter(Boolean)))
  )

  const behinderungen = Array.from(
    new Set(
      loaded.tagesberichte
        .map((t) => t.behinderungen?.trim())
        .filter((x): x is string => Boolean(x))
    )
  )

  const personalNamen = aggregiereBaustellenPersonal(loaded.team, loaded.tagesberichte)

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
    wochenNummer: loaded.woche.wochen_nummer,
    kalenderwoche: loaded.woche.kalenderwoche,
    jahr: loaded.woche.jahr,
    vonDatum: loaded.woche.von_datum,
    bisDatum: loaded.woche.bis_datum,
    tagesberichte: tagesZeilen,
    alleLeistungen,
    regiearbeiten: loaded.regiearbeiten,
    personalNamen,
    behinderungen,
    fazit: loaded.woche.fazit?.trim() ?? '',
    ausblick: loaded.woche.ausblick?.trim() ?? '',
    bauleiterName: loaded.team.bauleiter_name?.trim() ?? '',
  }
}

export async function renderWochenberichtPdfBuffer(
  firm: FirmenEinstellungen,
  loaded: WochenberichtPdfLoaded
): Promise<Buffer> {
  const htmlInput = buildWochenberichtHtmlInput(firm, loaded)
  const html = buildWochenberichtHtml(htmlInput)
  const footerTemplate = buildWochenberichtPdfFooterTemplate(htmlInput)
  return renderHtmlToPdfBuffer(html, { footerTemplate })
}
