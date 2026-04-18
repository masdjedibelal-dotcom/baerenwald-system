import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { AngebotPosition, Kunde } from '@/lib/types'
import type { AngebotSummen } from '@/lib/angebot-positionen'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { formatDatum } from '@/lib/utils'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  h1: { fontSize: 14, marginBottom: 4 },
  h2: { fontSize: 11, marginTop: 10, marginBottom: 4 },
  muted: { color: '#444', marginBottom: 2 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 3 },
  cell: { flex: 1, paddingRight: 3, fontSize: 8 },
  box: { marginTop: 10, padding: 8, backgroundColor: '#f4f4f5', fontSize: 8 },
})

function eur(n: number) {
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €`
}

function firmenName(f: FirmenEinstellungen) {
  return f.firmenname?.trim() || 'Bärenwald München'
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
  summen,
  betraegeDb,
}: {
  firm: FirmenEinstellungen
  kunde: Kunde
  rechnungsnummer: string
  rechnungsdatum: string
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  faellig_am: string | null
  positionen: AngebotPosition[]
  summen: AngebotSummen
  betraegeDb: {
    lohn_netto: number | null
    material_netto: number | null
    netto: number | null
    mwst_betrag: number | null
    brutto: number | null
    mwst_satz: number | null
  }
}) {
  const fn = firmenName(firm)
  const adr = [firm.strasse, [firm.plz, firm.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const ust = firm.ust_id?.trim() || firm.steuernummer?.trim() || ''
  const lohnAnzeige = betraegeDb.lohn_netto ?? summen.lohnZeileMin
  const abschlag20 = Math.round(lohnAnzeige * 0.2 * 100) / 100
  const netto = betraegeDb.netto ?? summen.nettoMin
  const mwstBetrag = betraegeDb.mwst_betrag ?? summen.mwstBetragMin
  const brutto = betraegeDb.brutto ?? summen.bruttoMin
  const matDb = betraegeDb.material_netto ?? summen.materialZeileMin
  const mwstLabel = betraegeDb.mwst_satz ?? summen.mwstSatz

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{fn}</Text>
        {adr ? <Text style={styles.muted}>{adr}</Text> : null}
        {firm.telefon ? <Text style={styles.muted}>Tel. {firm.telefon}</Text> : null}
        {firm.email ? <Text style={styles.muted}>{firm.email}</Text> : null}
        {ust ? <Text style={styles.muted}>USt-IdNr.: {ust}</Text> : null}

        <Text style={[styles.h2, { marginTop: 14 }]}>RECHNUNG</Text>
        <Text style={styles.muted}>Nr: {rechnungsnummer}</Text>
        <Text style={styles.muted}>Datum: {formatDatum(rechnungsdatum)}</Text>

        <Text style={styles.h2}>Kunde</Text>
        <Text>{kunde.name}</Text>
        {kunde.adresse ? <Text>{kunde.adresse}</Text> : null}
        {kunde.plz || kunde.ort ? (
          <Text>
            {kunde.plz ?? ''} {kunde.ort ?? ''}
          </Text>
        ) : null}

        <Text style={styles.h2}>Leistungszeitraum</Text>
        <Text style={styles.muted}>
          {leistungszeitraum_von && leistungszeitraum_bis
            ? `${formatDatum(leistungszeitraum_von)} – ${formatDatum(leistungszeitraum_bis)}`
            : '—'}
        </Text>

        <Text style={styles.h2}>Positionen</Text>
        <View style={styles.row}>
          <Text style={[styles.cell, { fontWeight: 'bold', flex: 2 }]}>Pos. / Beschreibung</Text>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Lohn netto</Text>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Material netto</Text>
        </View>
        {positionen.map((p, i) => {
          const m = p.menge || 1
          const l = p.lohn_min * m
          const mat = p.material_min * m
          return (
            <View key={p.id} style={styles.row} wrap={false}>
              <Text style={[styles.cell, { flex: 2 }]}>
                {i + 1}. {(p.beschreibung || p.leistung).trim()}
              </Text>
              <Text style={styles.cell}>{eur(l)}</Text>
              <Text style={styles.cell}>{eur(mat)}</Text>
            </View>
          )
        })}

        <Text style={{ marginTop: 8, fontSize: 10, fontWeight: 'bold' }}>
          Arbeitskosten (netto): {eur(betraegeDb.lohn_netto ?? summen.lohnZeileMin)}
        </Text>
        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
          Materialkosten (netto): {eur(matDb)}
        </Text>
        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Netto: {eur(netto)}</Text>
        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
          MwSt {mwstLabel}%: {eur(mwstBetrag)}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>Brutto: {eur(brutto)}</Text>

        {kunde.typ === 'privat' || !kunde.typ ? (
          <View style={styles.box}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Hinweis § 35a EStG</Text>
            <Text>
              Für Privatkunden: Der Lohnkostenanteil von {eur(lohnAnzeige)} kann nach § 35a EStG
              steuerlich geltend gemacht werden (20 % = ca. {eur(abschlag20)}).
            </Text>
          </View>
        ) : null}

        <Text style={[styles.h2]}>Zahlung</Text>
        {faellig_am ? (
          <Text style={styles.muted}>Fällig am: {formatDatum(faellig_am)}</Text>
        ) : null}
        {firm.iban ? <Text style={styles.muted}>IBAN: {firm.iban}</Text> : null}
        {firm.bic ? <Text style={styles.muted}>BIC: {firm.bic}</Text> : null}
        {firm.bank_name ? <Text style={styles.muted}>{firm.bank_name}</Text> : null}

        {firm.pdf_fusszeile ? (
          <Text style={{ marginTop: 16, fontSize: 8, color: '#555' }}>{firm.pdf_fusszeile}</Text>
        ) : null}
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
  summen: AngebotSummen
  betraegeDb: {
    lohn_netto: number | null
    material_netto: number | null
    netto: number | null
    mwst_betrag: number | null
    brutto: number | null
    mwst_satz: number | null
  }
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
      summen={props.summen}
      betraegeDb={props.betraegeDb}
    />
  )
}
