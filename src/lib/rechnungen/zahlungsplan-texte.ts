import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import type { ZahlungsplanZeileBerechnet } from '@/lib/rechnungen/zahlungsplan'
import { buildSubject } from '@/lib/mail/build-subject'
import { formatEuro } from '@/lib/format/geld-datum'

export type AbschlagTextKontext = {
  anrede: AngebotMailAnrede
  zeile: ZahlungsplanZeileBerechnet
  projektTitel: string
  auftragsReferenz: string
  gesamtNetto: number
  gesamtBrutto: number
  bereitsGestelltBrutto: number
  angebotsnr?: string | null
}

export function defaultAbschlagPdfEinleitung(ctx: AbschlagTextKontext): string {
  const { anrede, zeile, projektTitel, auftragsReferenz, gesamtNetto, bereitsGestelltBrutto } = ctx
  const projekt = projektTitel.trim() || auftragsReferenz
  const betrag = formatEuro(zeile.netto, { suffix: false })
  const gesamt = formatEuro(gesamtNetto, { suffix: false })

  if (zeile.istSchluss) {
    const bereits = bereitsGestelltBrutto > 0 ? formatEuro(bereitsGestelltBrutto, { suffix: false }) : null
    if (anrede === 'du') {
      return bereits
        ? `Hiermit stellen wir dir die Schlussrechnung für „${projekt}“ (${auftragsReferenz}) in Rechnung. Bereits abgerechnet: ${bereits} brutto. Restbetrag dieser Rechnung: ${betrag} netto.`
        : `Hiermit stellen wir dir die Schlussrechnung für „${projekt}“ (${auftragsReferenz}) in Rechnung — Restbetrag ${betrag} netto (Auftragssumme ${gesamt} netto).`
    }
    return bereits
      ? `Hiermit stellen wir Ihnen die Schlussrechnung für „${projekt}“ (${auftragsReferenz}) in Rechnung. Bereits abgerechnet: ${bereits} brutto. Restbetrag dieser Rechnung: ${betrag} netto.`
      : `Hiermit stellen wir Ihnen die Schlussrechnung für „${projekt}“ (${auftragsReferenz}) in Rechnung — Restbetrag ${betrag} netto (Auftragssumme ${gesamt} netto).`
  }

  const prozentTeil =
    zeile.typ === 'prozent' ? `${zeile.wert} % der vereinbarten Auftragssumme von ${gesamt} netto` : `${betrag} netto`

  if (anrede === 'du') {
    return `Hiermit stellen wir dir ${zeile.index === 1 ? 'Abschlag 1' : `Abschlag ${zeile.index}`} (${zeile.titel}) in Höhe von ${prozentTeil} für „${projekt}“ (${auftragsReferenz}) in Rechnung.`
  }
  return `Hiermit stellen wir Ihnen ${zeile.index === 1 ? 'Abschlag 1' : `Abschlag ${zeile.index}`} (${zeile.titel}) in Höhe von ${prozentTeil} für „${projekt}“ (${auftragsReferenz}) in Rechnung.`
}

export function defaultAbschlagMailEinleitung(ctx: AbschlagTextKontext): string {
  const pdf = defaultAbschlagPdfEinleitung(ctx)
  if (ctx.anrede === 'du') {
    return pdf.replace(/^Hiermit stellen wir dir /, 'anbei findest du ').replace(/ in Rechnung\./, ' — Details im PDF-Anhang:')
  }
  return pdf.replace(/^Hiermit stellen wir Ihnen /, 'anbei erhalten Sie ').replace(/ in Rechnung\./, ' — Details im PDF-Anhang:')
}

export function defaultAbschlagMailBetreff(
  ctx: AbschlagTextKontext,
  rechnungsnummerPlaceholder = 'Rechnung'
): string {
  const nr = rechnungsnummerPlaceholder.trim() || undefined
  const titel = ctx.zeile.titel.trim()
  if (ctx.zeile.istSchluss) {
    return buildSubject({
      objekt: ctx.projektTitel || titel,
      ereignis: 'Schlussrechnung',
      nummer: nr,
    })
  }
  return buildSubject({
    objekt: ctx.projektTitel || titel,
    ereignis: `Abschlag ${ctx.zeile.index}`,
    nummer: nr,
  })
}

export function abschlagTextKontextFromWizard(input: {
  anrede: AngebotMailAnrede
  zeile: ZahlungsplanZeileBerechnet
  projektTitel: string
  auftragsReferenz: string
  gesamtNetto: number
  gesamtBrutto: number
  bereitsGestelltBrutto: number
  angebotsnr?: string | null
}): AbschlagTextKontext {
  return input
}
