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
import { zeilenNettoMinMax } from '@/lib/angebot-positionen'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  h1: { fontSize: 16, marginBottom: 2 },
  h2: { fontSize: 11, marginTop: 10, marginBottom: 4 },
  muted: { color: '#444', marginBottom: 2, fontSize: 9 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 3 },
  cell: { flex: 1, paddingRight: 4, fontSize: 8 },
  cellNarrow: { width: 36, paddingRight: 2, fontSize: 8 },
  total: { marginTop: 8, fontSize: 10, fontWeight: 'bold' },
  footer: { marginTop: 16, fontSize: 8, color: '#555' },
  box35a: { marginTop: 10, padding: 8, backgroundColor: '#f5f5f5', fontSize: 8 },
})

function formatEuro(n: number) {
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €`
}

function firmenName(f: FirmenEinstellungen) {
  return f.firmenname?.trim() || 'Bärenwald München'
}

export function AngebotPdfDocument({
  kunde,
  positionen,
  summen,
  angebotDatum,
  gueltigBis,
  firm,
}: {
  kunde: Kunde
  positionen: AngebotPosition[]
  summen: AngebotSummen
  angebotDatum: string
  gueltigBis: string
  firm: FirmenEinstellungen
}) {
  const fn = firmenName(firm)
  const adr = [firm.strasse, [firm.plz, firm.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const ust = firm.ust_id?.trim() || firm.steuernummer?.trim() || ''

  const lohnNetto = summen.lohnZeileMin
  const lohnNettoMax = summen.lohnZeileMax
  const matNetto = summen.materialZeileMin
  const matNettoMax = summen.materialZeileMax

  const abschlag20 = Math.round(lohnNetto * 0.2 * 100) / 100

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{fn}</Text>
        {adr ? <Text style={styles.muted}>{adr}</Text> : null}
        {firm.telefon ? <Text style={styles.muted}>Tel. {firm.telefon}</Text> : null}
        {firm.email ? <Text style={styles.muted}>{firm.email}</Text> : null}
        {firm.website ? <Text style={styles.muted}>{firm.website}</Text> : null}
        {ust ? <Text style={styles.muted}>USt-IdNr. / St.-Nr.: {ust}</Text> : null}

        <Text style={[styles.h2, { marginTop: 14 }]}>Angebot</Text>
        <Text style={styles.muted}>Datum: {angebotDatum}</Text>

        <Text style={styles.h2}>Kundendaten</Text>
        <Text>{kunde.name}</Text>
        {kunde.email ? <Text>{kunde.email}</Text> : null}
        {kunde.telefon ? <Text>{kunde.telefon}</Text> : null}
        {kunde.adresse ? <Text>{kunde.adresse}</Text> : null}
        {kunde.plz || kunde.ort ? (
          <Text>
            {kunde.plz ?? ''} {kunde.ort ?? ''}
          </Text>
        ) : null}

        <Text style={styles.h2}>Leistungen</Text>
        <View style={styles.row}>
          <Text style={[styles.cell, { fontWeight: 'bold', flex: 2 }]}>Beschreibung</Text>
          <Text style={[styles.cellNarrow, { fontWeight: 'bold' }]}>Menge</Text>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Lohn</Text>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Material</Text>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Summe</Text>
        </View>
        {positionen.map((p) => {
          const z = zeilenNettoMinMax(p)
          const lmin = p.lohn_min * p.menge
          const lmax = p.lohn_max * p.menge
          const mmin = p.material_min * p.menge
          const mmax = p.material_max * p.menge
          return (
            <View key={p.id} style={styles.row} wrap={false}>
              <Text style={[styles.cell, { flex: 2 }]}>
                {(p.beschreibung || p.leistung).trim()}
                {p.notiz_extern ? `\n${p.notiz_extern}` : ''}
              </Text>
              <Text style={styles.cellNarrow}>
                {p.menge} {p.einheit}
              </Text>
              <Text style={styles.cell}>
                {formatEuro(lmin)} – {formatEuro(lmax)}
              </Text>
              <Text style={styles.cell}>
                {formatEuro(mmin)} – {formatEuro(mmax)}
              </Text>
              <Text style={styles.cell}>
                {formatEuro(z.min)} – {formatEuro(z.max)}
              </Text>
            </View>
          )
        })}

        <Text style={styles.total}>
          Arbeitskosten (netto): {formatEuro(lohnNetto)} – {formatEuro(lohnNettoMax)}
        </Text>
        <Text style={styles.total}>
          Materialkosten (netto): {formatEuro(matNetto)} – {formatEuro(matNettoMax)}
        </Text>
        <Text style={styles.total}>
          Netto gesamt: {formatEuro(summen.nettoMin)} – {formatEuro(summen.nettoMax)}
        </Text>
        <Text style={styles.total}>
          MwSt {summen.mwstSatz}%: {formatEuro(summen.mwstBetragMin)} –{' '}
          {formatEuro(summen.mwstBetragMax)}
        </Text>
        <Text style={styles.total}>
          Brutto gesamt: {formatEuro(summen.bruttoMin)} – {formatEuro(summen.bruttoMax)}
        </Text>

        {kunde.typ === 'privat' || !kunde.typ ? (
          <View style={styles.box35a}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Hinweis § 35a EStG</Text>
            <Text>
              Für Privatkunden: Der Lohnkostenanteil von {formatEuro(lohnNetto)} –{' '}
              {formatEuro(lohnNettoMax)} kann nach § 35a EStG steuerlich geltend gemacht werden (20 %
              = ca. {formatEuro(abschlag20)} € vom unteren Lohnwert).
            </Text>
          </View>
        ) : null}

        {firm.pdf_fusszeile ? (
          <Text style={[styles.footer, { marginTop: 12 }]}>{firm.pdf_fusszeile}</Text>
        ) : null}
        <Text style={styles.footer}>Zahlungsbedingungen nach Vereinbarung</Text>
        <Text style={styles.footer}>Gültig bis: {gueltigBis}</Text>
        <Text style={[styles.footer, { marginTop: 16 }]}>
          Unterschrift Kunde: _________________________
        </Text>
      </Page>
    </Document>
  )
}

export async function renderAngebotPdfBuffer(props: {
  kunde: Kunde
  positionen: AngebotPosition[]
  summen: AngebotSummen
  angebotDatum: string
  gueltigBis: string
  firm: FirmenEinstellungen
}) {
  return renderToBuffer(
    <AngebotPdfDocument
      kunde={props.kunde}
      positionen={props.positionen}
      summen={props.summen}
      angebotDatum={props.angebotDatum}
      gueltigBis={props.gueltigBis}
      firm={props.firm}
    />
  )
}
