import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import {
  ZEILE_SLUG_FREITEXT,
  ZEILE_SLUG_GESAMTRABATT,
} from '@/lib/dokument-zeilen'
import type { AngebotPosition, Kunde, RechnungBelegTyp } from '@/lib/types'
import type { RechnungBerechnung } from '@/lib/rechnung-berechnung'
import {
  rechnungZeigtHinweis35a,
  positionNettoZeile,
} from '@/lib/rechnung-berechnung'
import { summenKostenaufstellungAusPositionen } from '@/lib/angebot-positionen'
import {
  HINWEIS_KLEINUNTERNEHMER,
  HINWEIS_REVERSE_CHARGE_13B,
} from '@/lib/rechnung-config'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { kundeDisplayName, kundeStrasseHausnummerZeile } from '@/lib/kunde-stammdaten'
import { formatDatum } from '@/lib/utils'

const GRUEN = '#1A3D2B'
const GRUEN_TINT = '#F3F7F4'

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 72, fontSize: 9, fontFamily: 'Helvetica' },
  h1: { fontSize: 14, marginBottom: 4, color: GRUEN },
  h2: { fontSize: 11, marginTop: 10, marginBottom: 4, color: GRUEN },
  muted: { color: '#444', marginBottom: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  metaLabel: { color: '#6B7280', fontSize: 8.5 },
  metaValue: { fontWeight: 'bold', fontSize: 8.5, textAlign: 'right' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 3 },
  cell: { flex: 1, paddingRight: 3, fontSize: 8 },
  box: { marginTop: 8, padding: 8, backgroundColor: '#f4f4f5', fontSize: 8 },
  summenGruen: {
    marginTop: 10,
    padding: 10,
    backgroundColor: GRUEN_TINT,
    borderWidth: 1,
    borderColor: GRUEN,
    borderRadius: 3,
  },
  summenGruenZeile: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  summenGruenLabel: { fontSize: 9, color: GRUEN },
  summenGruenWert: { fontSize: 9, fontWeight: 'bold', color: GRUEN, textAlign: 'right' },
  summenGruenNettoBold: { fontSize: 11, fontWeight: 'bold', color: GRUEN },
  summenGruenBrutto: { fontSize: 9, color: GRUEN },
  right: { textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: '#555',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
})

function eur(n: number) {
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €`
}

function firmenName(f: FirmenEinstellungen) {
  return f.firmenname?.trim() || 'Bärenwald München'
}

function bankZeilen(firm: FirmenEinstellungen): string[] {
  const lines: string[] = []
  if (firm.bank_name?.trim()) lines.push(firm.bank_name.trim())
  lines.push(`IBAN: ${firm.iban?.trim() || '[wird in Einstellungen ergänzt]'}`)
  lines.push(`BIC: ${firm.bic?.trim() || '[wird in Einstellungen ergänzt]'}`)
  if (!firm.bank_name?.trim()) {
    lines.unshift('Bank: [wird in Einstellungen ergänzt]')
  }
  return lines
}

function metaZeile(label: string, value: string) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
}

function renderPositionRow(p: AngebotPosition, index: number) {
  const slug = p.gewerk_slug ?? ''
  if (slug === ZEILE_SLUG_FREITEXT) {
    return (
      <View key={p.id} style={styles.row} wrap={false}>
        <Text style={[styles.cell, { flex: 3 }]}>
          {p.leistung?.trim() ? `${p.leistung}\n` : ''}
          {p.beschreibung?.trim() || '—'}
        </Text>
      </View>
    )
  }
  const netto = positionNettoZeile(p)
  const m = p.menge || 1
  const leistung = (p.leistung || '').trim() || 'Position'
  const besch = (p.beschreibung || '').trim()
  const titel =
    p.ist_fachbetrieb === false || !besch || besch === leistung
      ? leistung
      : `${leistung}\n${besch}`
  const mengeTxt = `${m} ${p.einheit || 'Stk.'}`
  return (
    <View key={p.id} style={styles.row} wrap={false}>
      <Text style={[styles.cell, { flex: 2.2 }]}>
        {index + 1}. {titel}
        {slug === ZEILE_SLUG_GESAMTRABATT ? ' (Rabatt)' : ''}
      </Text>
      <Text style={[styles.cell, styles.right]}>{mengeTxt}</Text>
      <Text style={[styles.cell, styles.right]}>{eur(netto)}</Text>
      <Text style={[styles.cell, styles.right, { width: 36 }]}>
        {p.mwst_satz === 0 || p.mwst_satz === 7 || p.mwst_satz === 19 ? `${p.mwst_satz} %` : '—'}
      </Text>
    </View>
  )
}

export function RechnungPdfDocument({
  firm,
  kunde,
  rechnungsnummer,
  rechnungsdatum,
  leistungszeitraum_von,
  leistungszeitraum_bis,
  faellig_am,
  positionen,
  berechnung,
  beleg_typ = 'rechnung',
  bezug_rechnungsnummer,
}: {
  firm: FirmenEinstellungen
  kunde: Kunde
  rechnungsnummer: string
  rechnungsdatum: string
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  faellig_am: string | null
  positionen: AngebotPosition[]
  berechnung: RechnungBerechnung
  beleg_typ?: RechnungBelegTyp
  bezug_rechnungsnummer?: string | null
}) {
  const fn = firmenName(firm)
  const adr = [firm.strasse, [firm.plz, firm.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const ustFirma = firm.ust_id?.trim() || firm.steuernummer?.trim() || ''
  const titel = beleg_typ === 'gutschrift' ? 'GUTSCHRIFT' : 'RECHNUNG'
  const kostenaufstellung = summenKostenaufstellungAusPositionen(positionen)
  const lohnAnzeige = kostenaufstellung?.lohn_netto ?? 0
  const materialAnzeige = kostenaufstellung?.material_netto ?? 0
  const zeigtKostenaufstellung = Boolean(kostenaufstellung)

  let posIndex = 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{fn}</Text>
        {firm.rechtsform?.trim() ? <Text style={styles.muted}>{firm.rechtsform}</Text> : null}
        {adr ? <Text style={styles.muted}>{adr}</Text> : null}
        {firm.telefon ? <Text style={styles.muted}>Tel. {firm.telefon}</Text> : null}
        {firm.email ? <Text style={styles.muted}>{firm.email}</Text> : null}
        {ustFirma ? (
          <Text style={styles.muted}>
            {firm.ust_id?.trim() ? `USt-IdNr.: ${firm.ust_id.trim()}` : `Steuernr.: ${firm.steuernummer?.trim()}`}
          </Text>
        ) : null}

        <Text style={[styles.h2, { marginTop: 14 }]}>{titel}</Text>
        <View style={{ marginTop: 4, marginBottom: 6, alignItems: 'flex-end' }}>
          <View style={{ width: 200 }}>
            {metaZeile('Rechnungsnr.:', rechnungsnummer)}
            {metaZeile('Datum:', formatDatum(rechnungsdatum))}
            {beleg_typ === 'gutschrift' && bezug_rechnungsnummer
              ? metaZeile('Bezug Rechnung Nr.:', bezug_rechnungsnummer)
              : null}
          </View>
        </View>

        <Text style={styles.h2}>Rechnungsempfänger</Text>
        <Text>{kundeDisplayName(kunde)}</Text>
        {kundeStrasseHausnummerZeile(kunde) ? (
          <Text>{kundeStrasseHausnummerZeile(kunde)}</Text>
        ) : null}
        {kunde.plz || kunde.ort ? (
          <Text>
            {kunde.plz ?? ''} {kunde.ort ?? ''}
          </Text>
        ) : null}
        {kunde.ust_id?.trim() ? <Text style={styles.muted}>USt-IdNr.: {kunde.ust_id.trim()}</Text> : null}

        <Text style={styles.h2}>Leistungszeitraum</Text>
        <Text style={styles.muted}>
          {leistungszeitraum_von && leistungszeitraum_bis
            ? `${formatDatum(leistungszeitraum_von)} – ${formatDatum(leistungszeitraum_bis)}`
            : '—'}
        </Text>

        <Text style={styles.h2}>Positionen</Text>
        <View style={styles.row}>
          <Text style={[styles.cell, { fontWeight: 'bold', flex: 2.2 }]}>Beschreibung</Text>
          <Text style={[styles.cell, styles.right, { fontWeight: 'bold' }]}>Menge</Text>
          <Text style={[styles.cell, styles.right, { fontWeight: 'bold' }]}>Netto</Text>
          <Text style={[styles.cell, styles.right, { fontWeight: 'bold', width: 36 }]}>USt</Text>
        </View>
        {positionen.map((p) => {
          const slug = p.gewerk_slug ?? ''
          if (slug === ZEILE_SLUG_FREITEXT) {
            return renderPositionRow(p, posIndex)
          }
          const row = renderPositionRow(p, posIndex)
          if (slug !== ZEILE_SLUG_FREITEXT) posIndex += 1
          return row
        })}

        <View style={styles.summenGruen} wrap={false}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: GRUEN, marginBottom: 6 }}>
            Gesamtübersicht
          </Text>
          {zeigtKostenaufstellung && lohnAnzeige > 0 ? (
            <View style={styles.summenGruenZeile}>
              <Text style={styles.summenGruenLabel}>Arbeitskosten (netto)</Text>
              <Text style={styles.summenGruenWert}>{eur(lohnAnzeige)}</Text>
            </View>
          ) : null}
          {zeigtKostenaufstellung && materialAnzeige > 0 ? (
            <View style={styles.summenGruenZeile}>
              <Text style={styles.summenGruenLabel}>Materialkosten (netto)</Text>
              <Text style={styles.summenGruenWert}>{eur(materialAnzeige)}</Text>
            </View>
          ) : null}
          <View style={styles.summenGruenZeile}>
            <Text style={styles.summenGruenLabel}>Netto gesamt</Text>
            <Text style={styles.summenGruenWert}>{eur(berechnung.netto)}</Text>
          </View>
          {berechnung.kleinunternehmer ? (
            <Text style={{ fontSize: 8, marginTop: 4, color: '#374151' }}>{HINWEIS_KLEINUNTERNEHMER}</Text>
          ) : berechnung.reverse_charge_13b ? (
            <Text style={{ fontSize: 8, marginTop: 4, color: '#374151' }}>{HINWEIS_REVERSE_CHARGE_13B}</Text>
          ) : (
            berechnung.mwst_aufschluesselung.map((z) => (
              <View key={z.satz} style={styles.summenGruenZeile}>
                <Text style={styles.summenGruenLabel}>USt. {z.satz} %</Text>
                <Text style={styles.summenGruenWert}>{eur(z.mwst)}</Text>
              </View>
            ))
          )}
          <View
            style={[
              styles.summenGruenZeile,
              { marginTop: 6, borderTopWidth: 1, borderTopColor: GRUEN, paddingTop: 6 },
            ]}
          >
            <Text style={styles.summenGruenNettoBold}>Netto gesamt</Text>
            <Text style={styles.summenGruenNettoBold}>{eur(berechnung.netto)}</Text>
          </View>

          <View style={[styles.summenGruenZeile, { marginTop: 2 }]}>
            <Text style={styles.summenGruenBrutto}>Brutto gesamt</Text>
            <Text style={styles.summenGruenBrutto}>{eur(berechnung.brutto)}</Text>
          </View>
        </View>

        {beleg_typ === 'rechnung' &&
        rechnungZeigtHinweis35a(kunde.typ, lohnAnzeige, berechnung.kleinunternehmer) ? (
          <View style={styles.box}>
            <Text style={{ marginBottom: 4 }}>
              Steuerlicher Hinweis gemäß § 35a Abs. 3 EStG: Der ausgewiesene Lohnkostenanteil in Höhe
              von {eur(lohnAnzeige)} kann bei der Einkommensteuer geltend gemacht werden.
            </Text>
          </View>
        ) : null}

        <Text style={styles.h2}>Zahlung</Text>
        {faellig_am ? <Text style={styles.muted}>Fällig am: {formatDatum(faellig_am)}</Text> : null}
        <Text style={[styles.muted, { marginTop: 6, fontWeight: 'bold' }]}>Bankverbindung (Überweisung)</Text>
        {bankZeilen(firm).map((z) => (
          <Text key={z} style={styles.muted}>
            {z}
          </Text>
        ))}
        {!firm.iban?.trim() ? (
          <Text style={{ fontSize: 7.5, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 }}>
            Platzhalter — Bankdaten bitte unter Einstellungen pflegen.
          </Text>
        ) : null}
        {beleg_typ === 'rechnung' ? (
          <Text style={[styles.muted, { marginTop: 4 }]}>
            Verwendungszweck: {rechnungsnummer}
          </Text>
        ) : null}

        <View style={styles.footer} fixed>
          {firm.pdf_fusszeile ? <Text>{firm.pdf_fusszeile}</Text> : null}
          {ustFirma ? (
            <Text style={{ marginTop: 2 }}>
              {firm.ust_id?.trim()
                ? `USt-IdNr.: ${firm.ust_id.trim()}`
                : `Steuernr.: ${firm.steuernummer?.trim()}`}
            </Text>
          ) : null}
        </View>
      </Page>
    </Document>
  )
}

export async function renderRechnungPdfBuffer(props: {
  firm: FirmenEinstellungen
  kunde: Kunde
  rechnungsnummer: string
  rechnungsdatum: string
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  faellig_am: string | null
  positionen: AngebotPosition[]
  berechnung: RechnungBerechnung
  beleg_typ?: RechnungBelegTyp
  bezug_rechnungsnummer?: string | null
}) {
  return renderToBuffer(
    <RechnungPdfDocument
      firm={props.firm}
      kunde={props.kunde}
      rechnungsnummer={props.rechnungsnummer}
      rechnungsdatum={props.rechnungsdatum}
      leistungszeitraum_von={props.leistungszeitraum_von}
      leistungszeitraum_bis={props.leistungszeitraum_bis}
      faellig_am={props.faellig_am}
      positionen={props.positionen}
      berechnung={props.berechnung}
      beleg_typ={props.beleg_typ}
      bezug_rechnungsnummer={props.bezug_rechnungsnummer}
    />
  )
}
