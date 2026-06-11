import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import type { ZahlungsplanZeileBerechnet } from '@/lib/rechnungen/zahlungsplan'

function formatEur(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

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
  const betrag = formatEur(zeile.netto)
  const gesamt = formatEur(gesamtNetto)

  if (zeile.istSchluss) {
    const bereits = bereitsGestelltBrutto > 0 ? formatEur(bereitsGestelltBrutto) : null
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
  firmenname: string,
  rechnungsnummerPlaceholder = 'Rechnung'
): string {
  const nr = rechnungsnummerPlaceholder.trim() || 'Rechnung'
  const titel = ctx.zeile.titel.trim()
  if (ctx.zeile.istSchluss) {
    return ctx.anrede === 'du'
      ? `Schlussrechnung — ${titel} · ${nr} · ${firmenname}`
      : `Schlussrechnung — ${titel} · ${nr} · ${firmenname}`
  }
  return ctx.anrede === 'du'
    ? `Abschlag ${ctx.zeile.index} (${titel}) · ${nr} · ${firmenname}`
    : `Abschlag ${ctx.zeile.index} (${titel}) · ${nr} · ${firmenname}`
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
