import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { firmenSteuerFooterZeilen } from '@/lib/angebote/angebot-rechtshinweise'
import { istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import { resolveRechnungProjektTitel } from '@/lib/angebote/resolve-angebot-leistungsumfang'
import { auftragTitel, auftragWertNum } from '@/lib/auftraege/auftrag-liste-helpers'
import type { AbschlussdokuPdfInput } from '@/lib/pdf/abschlussdokumentation-pdf'
import type {
  AbschlussdokuHtmlInput,
  AbschlussdokuSummen,
} from '@/lib/templates/abschlussdokumentation-template'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  kundeAnredeKontextFromEmpfaenger,
  kundeRechnungsempfaengerAusStammdaten,
} from '@/lib/kunde-rechnungsempfaenger'
import { parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
import { angebotPdfBegruessung } from '@/lib/templates/angebot-mail'
import type { AngebotPosition, AuftragDetail } from '@/lib/types'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function buildAbschlussSummen(
  pdf: AbschlussdokuPdfInput,
  firm: FirmenEinstellungen,
  detail?: AuftragDetail
): AbschlussdokuSummen | null {
  const kleinunternehmer = parseKleinunternehmerSetting(firm.kleinunternehmer)
  const mwstProzent = kleinunternehmer ? 0 : Math.max(0, parseInt(firm.mwst_satz, 10) || 19)

  const rohAngPos = detail?.angebote?.positionen
  const angebotPositionen: AngebotPosition[] = rohAngPos
    ? normalizeAngebotPositionen(rohAngPos)
    : []

  let netto = 0
  if (angebotPositionen.length > 0) {
    const s = summenAusPositionen(angebotPositionen, mwstProzent)
    netto = round2(s.nettoMax > 0 ? s.nettoMax : s.nettoMin)
  } else {
    const summeAuftrag = pdf.positionen.reduce((acc, p) => acc + (p.preis_fix ?? 0), 0)
    if (summeAuftrag > 0) netto = round2(summeAuftrag)
    else if (detail) {
      const ausAngebot = auftragWertNum(detail)
      if (ausAngebot > 0) netto = round2(ausAngebot)
    }
  }

  if (netto <= 0) return null

  const mwst_betrag = kleinunternehmer ? 0 : round2(netto * (mwstProzent / 100))
  const brutto = round2(netto + mwst_betrag)

  return { netto, mwst_prozent: mwstProzent, mwst_betrag, brutto }
}

function formatDe(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  try {
    return new Date(`${iso.trim().slice(0, 10)}T12:00:00`).toLocaleDateString('de-DE')
  } catch {
    return iso ?? '—'
  }
}

export function formatLeistungszeitraumText(
  von: string | null | undefined,
  bis: string | null | undefined
): string {
  const a = formatDe(von)
  const b = formatDe(bis)
  if (a === '—' && b === '—') return '—'
  if (a === b) return a
  return `${a} – ${b}`
}

function firmZeileAdresse(f: FirmenEinstellungen): string {
  return [[f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')].join('\n')
}

function firmKontaktZeile(f: FirmenEinstellungen): string {
  return [f.telefon ? `Tel. ${f.telefon}` : '', f.email ?? '', f.website ?? ''].filter(Boolean).join(' · ')
}

function kundeAdresseZeilen(k: NonNullable<AuftragDetail['kunden']>): string {
  const lines = [k.adresse?.trim(), [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean) as string[]
  return lines.join('\n') || '—'
}

function durchfuehrungOrt(detail: AuftragDetail): string | null {
  const k = detail.kunden
  if (!k) return null
  const parts = [k.adresse?.trim(), [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

export function buildAbschlussdokuHtmlInput(
  pdf: AbschlussdokuPdfInput,
  firm: FirmenEinstellungen,
  detail?: AuftragDetail,
  leistungszeitraum?: { von: string | null; bis: string | null }
): AbschlussdokuHtmlInput {
  const steuer = firmenSteuerFooterZeilen(firm)

  const dokumentTitel = detail
    ? resolveRechnungProjektTitel({
        angebot: detail.angebote ?? null,
        auftragTitel: detail.titel,
        fallback: auftragTitel(detail),
      })
    : pdf.projektTitel

  const summen = buildAbschlussSummen(pdf, firm, detail)

  const bautagebuch = [...pdf.bautagebuch]
    .sort((a, b) => {
      const d = (a.datum ?? '').localeCompare(b.datum ?? '')
      if (d !== 0) return d
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
    .map((e) => ({
      datumSort: (e.datum ?? '').slice(0, 10),
      datumLabel: formatDe(e.datum),
      titel: e.titel?.trim() || 'Eintrag',
      beschreibung: e.beschreibung?.trim() || null,
    }))

  const fotoUrls = pdf.fotoUrls.map((url, i) => ({
    url,
    caption: `Dokumentation ${i + 1}`,
  }))

  const mailAnrede = istPrivatKundeTyp(pdf.kunde.typ) ? 'du' : 'sie'
  const empfaengerStamm = kundeRechnungsempfaengerAusStammdaten(pdf.kunde)
  const begruessung = angebotPdfBegruessung(
    mailAnrede,
    kundeAnredeKontextFromEmpfaenger(empfaengerStamm)
  )

  return {
    firmen_logo_url: resolveAngebotPdfLogoSrc(firm.logo_url),
    mail_anrede: mailAnrede,
    begruessung,
    firmenname: firm.firmenname,
    firmen_rechtsform: firm.rechtsform?.trim() || null,
    firmen_adresse: firmZeileAdresse(firm),
    firmen_kontakt: firmKontaktZeile(firm),
    firmen_steuer_footer: steuer.length ? steuer.join('\n') : null,
    dokumentTitel,
    erstelltAm: new Date().toLocaleDateString('de-DE'),
    leistungszeitraum_text: formatLeistungszeitraumText(
      leistungszeitraum?.von ?? null,
      leistungszeitraum?.bis ?? null
    ),
    summen,
    kunde_name: pdf.kunde.name?.trim() || '—',
    kunde_adresse: kundeAdresseZeilen(pdf.kunde),
    durchfuehrung_in: detail ? durchfuehrungOrt(detail) : null,
    positionen: pdf.positionen.map((p) => ({
      gewerk: p.gewerk_name?.trim() || '—',
      leistung: p.leistung_name?.trim() || 'Leistung',
      beschreibung: p.beschreibung,
      menge: p.menge,
      einheit: p.einheit,
      preis_netto: p.preis_fix,
    })),
    abnahmePunkte: pdf.abnahmePunkte,
    bautagebuch,
    fotoUrls,
    mitBautagebuch: pdf.mitBautagebuch,
    mitFotos: pdf.mitFotos,
  }
}
