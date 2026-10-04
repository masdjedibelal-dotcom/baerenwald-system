/**
 * Alte Einzelgewerke / frei geschriebene Gewerk-Namen → eines der 11 Obergewerke
 * (gleiche Gruppen wie Migration 20261218140000_gewerke_obergruppen).
 */
const GRUPPEN: { name: string; muster: RegExp }[] = [
  { name: 'Schadensanierung & Trocknung', muster: /schaden|trockn|wasserschaden|schimmel/ },
  { name: 'Abbruch, Rohbau & Entsorgung', muster: /abbruch|abriss|rohbau|entsorg|räum|raeum|entrümpel|entruempel|maurer|kanal|erdarbeit|entkern/ },
  { name: 'Maler & Trockenbau', muster: /maler|trockenbau|wände|waende|wand|spachtel|tapez|anstrich|lackier/ },
  { name: 'Boden & Fliesen', muster: /boden|fliese|parkett|laminat|estrich|mikrozement/ },
  { name: 'Sanitär, Heizung & Klima', muster: /sanit|bad|heiz|klima|lüft|lueft|installat/ },
  { name: 'Elektro & Photovoltaik', muster: /elektr|photovolt|pv\b/ },
  { name: 'Fenster, Türen & Schreiner', muster: /fenster|tür|tuer|schrein|tischler|metall|schlosser/ },
  { name: 'Dach, Fassade & Gerüst', muster: /dach|fassade|gerüst|geruest|abdicht|spengler|zimmer/ },
  { name: 'Garten & Außenanlagen', muster: /garten|außen|aussen|pflaster|pool|terrasse|winterdienst|baum|zaun|rasen|fahrrad/ },
  { name: 'Reinigung & Hausmeister', muster: /reinig|hausmeister/ },
]

export function obergewerkFuer(roh: string | null | undefined): string {
  const s = String(roh ?? '').trim().toLowerCase()
  if (!s) return 'Allgemein'
  return GRUPPEN.find((g) => g.muster.test(s))?.name ?? 'Allgemein'
}
