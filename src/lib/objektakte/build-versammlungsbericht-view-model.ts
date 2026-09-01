import type { VersammlungsberichtPayload } from '@/lib/objektakte/load-versammlungsbericht-data'
import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import { formatDatum } from '@/lib/utils'

/** Identisch zu Angebot/Abnahme — Bericht ist Bärenwald-Service-Dokument */
export const VERSAMMLUNG_ACCENT = '#1A3D2B'
export const VERSAMMLUNG_TINT = '#F3F7F4'
const TEXT = '#111111'
const TEXT_MUTED = '#6B7280'
const LINE = '#D1D5DB'
const ZEBRA = '#F3F7F4'

export type VersammlungsberichtViewModel = {
  primary: string
  orgName: string
  orgLogoHtml: string
  orgKontakt: string | null
  objektTitel: string
  objektAdresse: string
  zeitraumLabel: string
  erstelltAmLabel: string
  zeigeEinzelpreise: boolean
  kennzahlen: {
    massnahmenGesamt: number
    gesamtKostenLabel: string
    abgeschlossen: number
    offenLaufend: number
    ohneKostenAngabe: number
  }
  kategorieZeilen: Array<{
    art: string
    anzahl: number
    kostenLabel: string
    anteilLabel: string
  }>
  hinweise: string[]
  gewerkBalken: Array<{
    gewerk: string
    betragLabel: string
    barWidthPct: number
    isMax: boolean
  }>
  gewerkSummeLabel: string
  gewerkLeer: boolean
  massnahmenZeilen: Array<{
    datumLabel: string
    einheit: string
    anlage: string
    titel: string
    gewerk: string
    statusLabel: string
    statusDone: boolean
    kostenLabel: string
    kostenOffen: boolean
    gewaehrleistungHinweis: string | null
  }>
  massnahmenLeer: boolean
  massnahmenSummeLabel: string
  anlagenHighlights: Array<{
    titel: string
    meta: string
    summary: string
    zeilen: Array<{ datum: string; titel: string; kosten: string }>
    fusszeile: string | null
    kostenUeberNeuwert: boolean
  }>
  anlagenBestand: Array<{
    bezeichnung: string
    gewerk: string
    standortEinheit: string
    einbau: string
    garantie: string
    massnahmenImZeitraum: number | string
  }>
  hatAnlagen: boolean
  offeneZeilen: Array<{
    datumLabel: string
    einheit: string
    anlage: string
    titel: string
    gewerk: string
    statusLabel: string
    statusDone: boolean
    standLabel: string
    kostenLabel: string | null
  }>
  offeneLeer: boolean
  laufenderHeader: string
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtEuro(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '—'
  if (n === 0) return '0,00 €'
  return (
    n.toLocaleString('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + ' €'
  )
}

function fmtEuroRounded(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return '—'
  return `${Math.round(n).toLocaleString('de-DE')} €`
}

function cell(v: string | null | undefined): string {
  return v?.trim() || '—'
}

function fmtRange(von: string, bis: string): string {
  const a = von?.trim()
  const b = bis?.trim()
  if (!a && !b) return '—'
  if (a && b) return `${formatDatum(a)} – ${formatDatum(b)}`
  return formatDatum(a || b)
}

function fmtDatumKurz(iso: string): string {
  const d = iso?.trim()?.slice(0, 10)
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return '—'
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y.slice(2)}`
}

function fmtMonatJahr(iso: string | null | undefined): string | null {
  const d = iso?.trim()?.slice(0, 10)
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' })
}

function istAbgeschlossen(unterstatus: string): boolean {
  const u = unterstatus.toLowerCase()
  return (
    u === 'bezahlt' ||
    u === 'abgeschlossen' ||
    u === 'angenommen' ||
    u === 'erledigt'
  )
}

function standLabelOffen(phase: string, unterstatus: string): string {
  const p = phase.toLowerCase()
  const u = unterstatus.toLowerCase()
  if (p === 'angebot' || u.includes('angebot') || u === 'gesendet') return 'Angebot liegt vor'
  if (p === 'auftrag' || u.includes('ausführ') || u.includes('ausfuehr')) return 'In Ausführung'
  if (p === 'rechnung') return 'Rechnung ausstehend'
  if (u.includes('abnahme')) return 'Abnahme ausstehend'
  if (u.includes('termin')) return 'Termin geplant'
  return 'In Bearbeitung'
}

function statusDruckLabel(label: string, done: boolean): string {
  if (done) return 'Abgeschlossen'
  const l = label.toLowerCase()
  if (l.includes('storn') || l.includes('abgebrochen')) return label
  if (l.includes('offen') || l.includes('arbeit') || l.includes('lauf')) return 'Offen / in Arbeit'
  return label
}

function slugFilename(objektTitel: string, von: string, bis: string): string {
  const slug = objektTitel
    .replace(/[^\wäöüÄÖÜß\-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const year =
    bis?.slice(0, 4) ||
    von?.slice(0, 4) ||
    String(new Date().getFullYear())
  return `Objektbericht_${slug || 'Objekt'}_${year}.pdf`
}

export function buildVersammlungsberichtFilename(p: VersammlungsberichtPayload): string {
  return slugFilename(p.objektTitel, p.zeitraumVon, p.zeitraumBis)
}

export function buildVersammlungsberichtViewModel(
  p: VersammlungsberichtPayload
): VersammlungsberichtViewModel {
  const primary = VERSAMMLUNG_ACCENT
  const bwLogo = resolveAngebotPdfLogoSrc(null)
  const logoHtml =
    bwLogo && (bwLogo.startsWith('data:') || /^https?:\/\//i.test(bwLogo))
      ? `<img src="${bwLogo.replace(/"/g, '&quot;')}" alt="Bärenwald" class="cover-logo" />`
      : `<div class="cover-logo-fallback">Bärenwald</div>`

  const zeitraumLabel = fmtRange(p.zeitraumVon, p.zeitraumBis)
  const erstelltAmLabel = formatDatum(p.erstelltAm)

  const abgeschlossen = p.vorgaengeImZeitraum.filter((r) =>
    istAbgeschlossen(r.unterstatus)
  ).length
  const offenLaufend = p.vorgaengeOffen.length

  const katSummen = p.nachKategorieSummen
  const katGesamt =
    katSummen.reparatur + katSummen.instandhaltung + katSummen.wartung
  const kategorieZeilen = [
    { key: 'reparatur' as const, art: 'Reparatur' },
    { key: 'instandhaltung' as const, art: 'Instandhaltung' },
    { key: 'wartung' as const, art: 'Wartung & Pflege' },
  ].map(({ key, art }) => {
    const anzahl = p.nachKategorie[key]
    const summe = katSummen[key]
    const anteil =
      katGesamt > 0 && summe > 0 ? Math.round((summe / katGesamt) * 100) : 0
    return {
      art,
      anzahl,
      kostenLabel: fmtEuroRounded(summe),
      anteilLabel: katGesamt > 0 && summe > 0 ? `${anteil} %` : '—',
    }
  })

  const hinweise: string[] = []
  for (const h of p.anlagenHighlights.slice(0, 3)) {
    if (h.vorgangCount >= 2) {
      hinweise.push(
        `Die Anlage „${h.bezeichnung}" wurde im Zeitraum ${h.vorgangCount}× bearbeitet (Details Abschnitt 5).`
      )
    }
  }
  if (p.gesamtKosten > 0 && p.vorgaengeImZeitraum.length >= 3) {
    const top = p.nachGewerk[0]
    if (top && top.summe > 0) {
      hinweise.push(
        `Schwerpunkt nach Gewerk: ${top.gewerk} mit ${fmtEuroRounded(top.summe)} (${top.count} Maßnahme${top.count === 1 ? '' : 'n'}).`
      )
    }
  }

  const gewerkMitKosten = p.nachGewerk.filter((g) => g.summe > 0)
  const maxSumme = gewerkMitKosten[0]?.summe ?? 0
  const gewerkBalken = gewerkMitKosten.map((g, i) => ({
    gewerk: g.gewerk,
    betragLabel: fmtEuro(g.summe),
    barWidthPct: maxSumme > 0 ? Math.max(8, Math.round((g.summe / maxSumme) * 100)) : 0,
    isMax: i === 0,
  }))
  const gewerkSumme = gewerkMitKosten.reduce((s, g) => s + g.summe, 0)

  const anlageGewById = new Map(
    (p.anlagenBestand ?? []).map((a) => [a.id, a.gewaehrleistung_bis ?? a.garantie_bis])
  )

  const massnahmenZeilen = [...p.vorgaengeImZeitraum]
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map((r) => {
      const done = istAbgeschlossen(r.unterstatus)
      const gw = r.anlageId ? anlageGewById.get(r.anlageId) : null
      const gwHint =
        done && gw ? `Gewährl. bis ${fmtMonatJahr(gw) ?? '—'}` : null
      const kostenOffen = r.kostenEuro == null
      return {
        datumLabel: fmtDatumKurz(r.datum),
        einheit: cell(r.einheitLabel),
        anlage: cell(r.anlageLabel),
        titel: r.titel.trim() || '—',
        gewerk: cell(r.gewerkLabel),
        statusLabel: statusDruckLabel(r.unterstatusLabel, done),
        statusDone: done,
        kostenLabel: kostenOffen ? 'offen' : fmtEuro(r.kostenEuro),
        kostenOffen,
        gewaehrleistungHinweis: gwHint,
      }
    })

  const anlagenHighlights = p.anlagenHighlightsDetail.map((h) => {
    const fussParts: string[] = []
    if (h.garantieLabel) fussParts.push(`Garantie: ${h.garantieLabel}`)
    if (h.neuwertEuro != null && h.neuwertEuro > 0) {
      fussParts.push(`Neuwert: ca. ${fmtEuroRounded(h.neuwertEuro)}`)
    }
    const kostenUeberNeuwert =
      h.neuwertEuro != null &&
      h.neuwertEuro > 0 &&
      h.kostenSumme > h.neuwertEuro
    if (kostenUeberNeuwert) {
      fussParts.push('Reparaturkosten übersteigen den Neuwert.')
    }
    return {
      titel: h.bezeichnung,
      meta: [h.gewerk, h.standort].filter(Boolean).join(' · ') || '—',
      summary: `${h.vorgangCount} Maßnahme${h.vorgangCount === 1 ? '' : 'n'} im Zeitraum · kumulierte Kosten: ${fmtEuroRounded(h.kostenSumme)}`,
      zeilen: h.zeilen.map((z) => ({
        datum: fmtDatumKurz(z.datum),
        titel: z.titel,
        kosten: z.kostenEuro != null ? fmtEuro(z.kostenEuro) : 'offen',
      })),
      fusszeile: fussParts.length ? fussParts.join(' · ') : null,
      kostenUeberNeuwert,
    }
  })

  const anlagenBestand = (p.anlagenBestand ?? []).map((a) => ({
    bezeichnung: cell(a.bezeichnung),
    gewerk: cell(a.gewerkName),
    standortEinheit: cell(a.standortEinheit),
    einbau: a.einbau_datum ? formatDatum(a.einbau_datum) : '—',
    garantie: a.garantie_bis ? formatDatum(a.garantie_bis) : '—',
    massnahmenImZeitraum: a.massnahmenImZeitraum,
  }))

  const offeneZeilen = p.vorgaengeOffen
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map((r) => {
      const done = istAbgeschlossen(r.unterstatus)
      return {
        datumLabel: fmtDatumKurz(r.datum),
        einheit: cell(r.einheitLabel),
        anlage: cell(r.anlageLabel),
        titel: r.titel.trim() || '—',
        gewerk: cell(r.gewerkLabel),
        statusLabel: statusDruckLabel(r.unterstatusLabel, done),
        statusDone: done,
        standLabel: standLabelOffen(r.phase, r.unterstatus),
        kostenLabel: p.einzelpreise
          ? r.kostenEuro != null
            ? fmtEuro(r.kostenEuro)
            : 'offen'
          : null,
      }
    })

  return {
    primary,
    orgName: p.orgName,
    orgLogoHtml: logoHtml,
    orgKontakt: p.orgKontakt,
    objektTitel: p.objektTitel,
    objektAdresse: p.objektAdresse,
    zeitraumLabel,
    erstelltAmLabel,
    zeigeEinzelpreise: p.einzelpreise,
    kennzahlen: {
      massnahmenGesamt: p.vorgaengeImZeitraum.length,
      gesamtKostenLabel: fmtEuroRounded(p.gesamtKosten),
      abgeschlossen,
      offenLaufend,
      ohneKostenAngabe: p.ohneKostenAngabe,
    },
    kategorieZeilen,
    hinweise,
    gewerkBalken,
    gewerkSummeLabel: fmtEuro(gewerkSumme),
    gewerkLeer: gewerkMitKosten.length === 0,
    massnahmenZeilen,
    massnahmenLeer: massnahmenZeilen.length === 0,
    massnahmenSummeLabel: fmtEuroRounded(p.gesamtKosten),
    anlagenHighlights,
    anlagenBestand,
    hatAnlagen: (p.anlagenBestand ?? []).length > 0,
    offeneZeilen,
    offeneLeer: offeneZeilen.length === 0,
    laufenderHeader: `${p.objektTitel} · ${zeitraumLabel}`,
  }
}

export { esc, TEXT, TEXT_MUTED, LINE, ZEBRA, VERSAMMLUNG_ACCENT, VERSAMMLUNG_TINT }
