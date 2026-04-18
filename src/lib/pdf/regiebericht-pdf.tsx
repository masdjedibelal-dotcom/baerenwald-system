/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image ohne alt */
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { Kunde } from '@/lib/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  h1: { fontSize: 16, marginBottom: 4 },
  h2: { fontSize: 12, marginTop: 10, marginBottom: 4 },
  muted: { color: '#444', marginBottom: 2 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 4,
  },
  cell: { flex: 1, paddingRight: 4 },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  signBox: { width: '42%' },
  signLine: { borderBottomWidth: 1, borderBottomColor: '#333', minHeight: 28, marginBottom: 4 },
  imgRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  img: { width: 200, height: 120, objectFit: 'cover', margin: 4 },
  hint: { fontSize: 8, color: '#333', marginTop: 16, lineHeight: 1.4 },
})

export type RegieberichtPdfInput = {
  auftragIdShort: string
  datumFormular: string
  kundeBaustelle: Kunde
  auftraggeberName: string
  auftraggeberAdresse: string
  handwerkerName: string
  handwerkerFirma: string | null
  gewerkName: string | null
  beschreibung: string
  grund: string
  stunden: number
  stundensatz: number
  lohnNetto: number
  materialBezeichnung: string
  materialNetto: number
  netto: number
  mwst: number
  brutto: number
  fotoUrls: string[]
  unterschriftKunde: string | null
  unterschriftAt: string | null
}

function isDataUrl(s: string) {
  return s.startsWith('data:image/')
}

export function RegieberichtPdfDocument(props: RegieberichtPdfInput) {
  const {
    auftragIdShort,
    datumFormular,
    kundeBaustelle,
    auftraggeberName,
    auftraggeberAdresse,
    handwerkerName,
    handwerkerFirma,
    gewerkName,
    beschreibung,
    grund,
    stunden,
    stundensatz,
    lohnNetto,
    materialBezeichnung,
    materialNetto,
    netto,
    mwst,
    brutto,
    fotoUrls,
    unterschriftKunde,
    unterschriftAt,
  } = props

  const betragZeile = stunden * stundensatz
  const fmt = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Bärenwald München</Text>
        <Text style={styles.muted}>REGIEBERICHT</Text>
        <Text style={styles.muted}>Datum: {datumFormular}</Text>
        <Text style={styles.muted}>Auftragsnummer: {auftragIdShort}</Text>

        <Text style={styles.h2}>Auftraggeber</Text>
        <Text>{auftraggeberName}</Text>
        <Text style={styles.muted}>{auftraggeberAdresse}</Text>

        <Text style={styles.h2}>Ausführender Handwerker</Text>
        <Text>
          {handwerkerName}
          {handwerkerFirma ? ` · ${handwerkerFirma}` : ''}
        </Text>
        {gewerkName ? <Text style={styles.muted}>Gewerk: {gewerkName}</Text> : null}

        <Text style={styles.h2}>Baustelle</Text>
        <Text>{kundeBaustelle.name}</Text>
        {kundeBaustelle.adresse ? <Text>{kundeBaustelle.adresse}</Text> : null}
        {kundeBaustelle.plz || kundeBaustelle.ort ? (
          <Text>
            {kundeBaustelle.plz ?? ''} {kundeBaustelle.ort ?? ''}
          </Text>
        ) : null}

        <Text style={styles.h2}>Zusatzarbeiten</Text>
        <Text style={styles.muted}>Beschreibung</Text>
        <Text>{beschreibung || '—'}</Text>
        <Text style={{ marginTop: 6 }} />
        <Text style={styles.muted}>Grund</Text>
        <Text>{grund || '—'}</Text>

        <Text style={styles.h2}>Stundennachweis</Text>
        <View style={styles.row}>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Datum</Text>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Stunden</Text>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Satz (€)</Text>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Betrag (€)</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>{datumFormular}</Text>
          <Text style={styles.cell}>{fmt(stunden)}</Text>
          <Text style={styles.cell}>{fmt(stundensatz)}</Text>
          <Text style={styles.cell}>{fmt(betragZeile)}</Text>
        </View>
        <Text style={{ marginTop: 4 }}>Gesamt Lohn (netto): {fmt(lohnNetto)} €</Text>

        <Text style={styles.h2}>Material</Text>
        {materialNetto > 0 || materialBezeichnung ? (
          <View>
            <View style={styles.row}>
              <Text style={[styles.cell, { fontWeight: 'bold' }]}>Bezeichnung</Text>
              <Text style={[styles.cell, { fontWeight: 'bold' }]}>Kosten (€)</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>{materialBezeichnung || '—'}</Text>
              <Text style={styles.cell}>{fmt(materialNetto)}</Text>
            </View>
            <Text style={{ marginTop: 4 }}>Gesamt Material (netto): {fmt(materialNetto)} €</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Keine Materialkosten erfasst.</Text>
        )}

        <Text style={styles.h2}>Gesamtkosten</Text>
        <Text>Lohn (netto): {fmt(lohnNetto)} €</Text>
        <Text>Material (netto): {fmt(materialNetto)} €</Text>
        <Text>Netto: {fmt(netto)} €</Text>
        <Text>MwSt 19 %: {fmt(mwst)} €</Text>
        <Text style={{ fontWeight: 'bold' }}>Brutto: {fmt(brutto)} €</Text>

        <Text style={styles.hint}>
          Mit der Unterschrift des Auftraggebers werden die aufgeführten Zusatzleistungen anerkannt und
          werden Bestandteil des Auftrags.
        </Text>

        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <Text style={styles.muted}>Ausführender</Text>
            <View style={styles.signLine} />
            <Text style={{ fontSize: 9 }}>{handwerkerName}</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.muted}>Auftraggeber</Text>
            <View style={styles.signLine}>
              {unterschriftKunde && isDataUrl(unterschriftKunde) ? (
                <Image style={{ width: 120, height: 40, objectFit: 'contain' }} src={unterschriftKunde} />
              ) : unterschriftKunde ? (
                <Text style={{ fontSize: 9 }}>{unterschriftKunde}</Text>
              ) : null}
            </View>
            <Text style={{ fontSize: 9 }}>Datum: {unterschriftAt ?? '____________'}</Text>
          </View>
        </View>
      </Page>

      {fotoUrls.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Fotos</Text>
          <View style={styles.imgRow}>
            {fotoUrls.slice(0, 8).map((url, i) => (
              <View key={i}>
                <Image style={styles.img} src={url} />
                <Text style={{ fontSize: 8, marginLeft: 4 }}>Foto {i + 1}</Text>
              </View>
            ))}
          </View>
        </Page>
      ) : null}
    </Document>
  )
}

export async function renderRegieberichtPdfBuffer(props: RegieberichtPdfInput) {
  return renderToBuffer(<RegieberichtPdfDocument {...props} />)
}
