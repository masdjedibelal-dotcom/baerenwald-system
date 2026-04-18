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
import type { AbnahmePdfZusatz } from '@/lib/auftraege/abnahme-protokoll-zusatz'
import type { AngebotPosition, FormularEintrag, FormularFeld, Kunde } from '@/lib/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  h1: { fontSize: 16, marginBottom: 6 },
  h2: { fontSize: 12, marginTop: 10, marginBottom: 4 },
  muted: { color: '#444', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 4,
  },
  cell: { flex: 1, paddingRight: 4 },
  imgRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  img: { width: 220, height: 140, objectFit: 'cover', margin: 4 },
  footer: { marginTop: 20, fontSize: 9, color: '#555' },
})

function formatVal(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'boolean') return v ? 'Ja' : 'Nein'
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

function fmtEuro(n: number) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AbnahmeProtokollPdfDocument({
  kunde,
  auftragIdShort,
  abnahmeDatum,
  positionen,
  handwerkerZeilen,
  abnahmeEintraege,
  fotoUrls,
  zusatz,
}: {
  kunde: Kunde
  auftragIdShort: string
  abnahmeDatum: string
  positionen: AngebotPosition[]
  handwerkerZeilen: string[]
  abnahmeEintraege: FormularEintrag[]
  fotoUrls: string[]
  zusatz: AbnahmePdfZusatz | null
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Bärenwald München</Text>
        <Text style={styles.muted}>Abnahmeprotokoll</Text>
        <Text style={styles.muted}>Datum der Abnahme: {abnahmeDatum}</Text>
        <Text style={styles.muted}>Auftrag: {auftragIdShort}</Text>

        <Text style={styles.h2}>Kundendaten</Text>
        <Text>{kunde.name}</Text>
        {kunde.adresse ? <Text>{kunde.adresse}</Text> : null}
        {kunde.plz || kunde.ort ? (
          <Text>
            {kunde.plz ?? ''} {kunde.ort ?? ''}
          </Text>
        ) : null}
        {kunde.telefon ? <Text>Tel. {kunde.telefon}</Text> : null}
        {kunde.email ? <Text>{kunde.email}</Text> : null}

        <Text style={styles.h2}>Durchgeführte Arbeiten</Text>
        <View style={styles.row}>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Gewerk</Text>
          <Text style={[styles.cell, { fontWeight: 'bold' }]}>Beschreibung</Text>
          <Text style={[styles.cell, { maxWidth: 44, fontWeight: 'bold' }]}>Menge</Text>
          <Text style={[styles.cell, { maxWidth: 50, fontWeight: 'bold' }]}>Einheit</Text>
        </View>
        {positionen.map((p) => (
          <View key={p.id} style={styles.row} wrap={false}>
            <Text style={styles.cell}>{p.gewerk_name}</Text>
            <Text style={styles.cell}>{(p.beschreibung || p.leistung).trim()}</Text>
            <Text style={[styles.cell, { maxWidth: 44 }]}>{p.menge}</Text>
            <Text style={[styles.cell, { maxWidth: 50 }]}>{p.einheit}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Handwerker</Text>
        {handwerkerZeilen.map((line, i) => (
          <Text key={i} style={styles.muted}>
            {line}
          </Text>
        ))}

        <Text style={styles.footer}>
          Abgenommen am: _________________ {'\n'}
          Unterschrift Kunde: _________________ {'\n'}
          Unterschrift Bärenwald: _________________
        </Text>
      </Page>

      {abnahmeEintraege.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Formularangaben (Abnahme)</Text>
          {abnahmeEintraege.map((e, ei) => {
            const tpl = e.formular_templates
            const felder = (tpl?.felder ?? []) as FormularFeld[]
            const daten = (e.daten ?? {}) as Record<string, unknown>
            return (
              <View key={e.id} wrap={false}>
                <Text style={styles.h2}>
                  {tpl?.name ?? 'Formular'} ({ei + 1})
                </Text>
                {felder.map((f) => (
                  <View key={f.id} style={styles.row}>
                    <Text style={[styles.cell, { fontWeight: 'bold' }]}>{f.label}</Text>
                    <Text style={styles.cell}>{formatVal(daten[f.id])}</Text>
                  </View>
                ))}
              </View>
            )
          })}
        </Page>
      ) : null}

      {zusatz ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Dokumentation &amp; Bauzeit</Text>

          <Text style={styles.h2}>Bauzeit</Text>
          <Text>Geplanter Start: {zusatz.planStart ?? '—'}</Text>
          <Text>Tatsächlicher Start (Bautagebuch): {zusatz.tatsStart ?? '—'}</Text>
          <Text>Geplantes Ende: {zusatz.planEnde ?? '—'}</Text>
          <Text>Tatsächliches Ende / Abnahme: {zusatz.tatsEnde ?? abnahmeDatum}</Text>
          <Text>Verzögerungen (Summe Behinderungsanzeigen): {zusatz.behinderungVerzugSumme} Arbeitstage</Text>

          <Text style={styles.h2}>Bautagebuch (Kurz)</Text>
          <Text>
            Einträge: {zusatz.bautagebuchAnzahl} · Gesamtstunden: {fmtEuro(zusatz.bautagebuchStundenSumme)} h
          </Text>
          <Text>
            Erster / letzter Eintrag: {zusatz.bautagebuchErste ?? '—'} — {zusatz.bautagebuchLetzte ?? '—'}
          </Text>

          <Text style={styles.h2}>Prüfprotokolle</Text>
          {zusatz.pruefprotokolle.length === 0 ? (
            <Text style={styles.muted}>Keine Prüfprotokolle erfasst.</Text>
          ) : (
            zusatz.pruefprotokolle.map((p, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={styles.cell}>{p.gewerk}</Text>
                <Text style={styles.cell}>{p.datum}</Text>
                <Text style={styles.cell}>{p.pruefer}</Text>
                <Text style={styles.cell}>
                  {p.ergebnis} {p.ok ? '✓' : '✗'}
                </Text>
              </View>
            ))
          )}

          <Text style={styles.h2}>Zusatzleistungen (Regieberichte)</Text>
          {zusatz.regieberichte.length === 0 ? (
            <Text style={styles.muted}>Keine Regieberichte.</Text>
          ) : (
            <>
              {zusatz.regieberichte.map((r, i) => (
                <View key={i} style={styles.row} wrap={false}>
                  <Text style={styles.cell}>{r.datum}</Text>
                  <Text style={styles.cell}>{r.grund}</Text>
                  <Text style={styles.cell}>{fmtEuro(r.stunden)} h</Text>
                  <Text style={styles.cell}>{fmtEuro(r.brutto)} €</Text>
                </View>
              ))}
              <Text style={{ marginTop: 6 }}>
                Summe Zusatzstunden: {fmtEuro(zusatz.regieSummeStunden)} h · Summe Zusatzkosten (brutto):{' '}
                {fmtEuro(zusatz.regieSummeBrutto)} €
              </Text>
            </>
          )}

          <Text style={styles.h2}>Behinderungsanzeigen</Text>
          {zusatz.behinderungen.length === 0 ? (
            <Text style={styles.muted}>Keine Behinderungsanzeigen.</Text>
          ) : (
            zusatz.behinderungen.map((b, i) => (
              <Text key={i} style={styles.muted}>
                {b.datum}: {b.grund} — Verzug ca. {b.verzug} AT
              </Text>
            ))
          )}

          <Text style={styles.h2}>Zustand vor Baubeginn</Text>
          {zusatz.vorBaubeginn ? (
            <>
              <Text>Dokumentiert am: {zusatz.vorBaubeginn.datum}</Text>
              <Text style={styles.muted}>
                Bereiche: {zusatz.vorBaubeginn.bereiche.length ? zusatz.vorBaubeginn.bereiche.join(', ') : '—'}
              </Text>
              <Text style={{ marginTop: 6 }}>Vorhandene Schäden:</Text>
              <Text style={styles.muted}>{zusatz.vorBaubeginn.schaeden || 'Keine Vorschäden dokumentiert'}</Text>
              {zusatz.vorBaubeginn.besonderheiten ? (
                <>
                  <Text style={{ marginTop: 6 }}>Besonderheiten:</Text>
                  <Text style={styles.muted}>{zusatz.vorBaubeginn.besonderheiten}</Text>
                </>
              ) : null}
              <Text style={{ marginTop: 8, fontSize: 9, color: '#555' }}>
                Diese Dokumentation wurde vor Beginn der Arbeiten erstellt und dient dem Nachweis des Vorzustands.
              </Text>
            </>
          ) : (
            <Text style={styles.muted}>Kein Vor-Baubeginn-Protokoll hinterlegt.</Text>
          )}

          <Text style={styles.h2}>Bauzeitverlängerungen (Baustopps)</Text>
          {zusatz.baustopps.length === 0 ? (
            <Text style={styles.muted}>Keine Baustopps — Projekt verlief planmäßig.</Text>
          ) : (
            <>
              {zusatz.baustopps.map((b, i) => (
                <View key={i} style={styles.row} wrap={false}>
                  <Text style={styles.cell}>{b.beginn}</Text>
                  <Text style={styles.cell}>{b.typ}</Text>
                  <Text style={styles.cell}>{b.verzug} Tage</Text>
                  <Text style={styles.cell}>{b.grund}</Text>
                </View>
              ))}
              <Text style={{ marginTop: 6 }}>Gesamt Verzögerung (Baustopps): ca. {zusatz.baustoppVerzugSumme} Tage</Text>
            </>
          )}

          <Text style={styles.h2}>Finanzielle Vereinbarungen</Text>
          <Text style={styles.muted}>Sicherheitseinbehalte</Text>
          {zusatz.finanzEinbehalte.length === 0 ? (
            <Text style={styles.muted}>Keine Einbehalte erfasst.</Text>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={[styles.cell, { fontWeight: 'bold' }]}>Handwerker</Text>
                <Text style={[styles.cell, { fontWeight: 'bold' }]}>Einbehalt €</Text>
                <Text style={[styles.cell, { fontWeight: 'bold' }]}>Freigabe</Text>
              </View>
              {zusatz.finanzEinbehalte.map((row, i) => (
                <View key={i} style={styles.row} wrap={false}>
                  <Text style={styles.cell}>{row.handwercher}</Text>
                  <Text style={styles.cell}>{fmtEuro(row.einbehaltBetrag)} €</Text>
                  <Text style={styles.cell}>{row.freigabeDatum}</Text>
                </View>
              ))}
            </>
          )}
          <Text style={{ marginTop: 8, fontSize: 9, color: '#555' }}>
            Die Sicherheitseinbehalte werden nach Ablauf der Gewährleistungsfrist von 5 Jahren freigegeben, sofern keine
            Mängel geltend gemacht wurden.
          </Text>

          <Text style={styles.h2}>Mängelliste (Punch)</Text>
          {zusatz.punchList.length === 0 ? (
            <Text style={styles.muted}>Keine Einträge.</Text>
          ) : (
            zusatz.punchList.map((p, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={styles.cell}>{p.gewerk}</Text>
                <Text style={styles.cell}>{p.beschreibung}</Text>
                <Text style={styles.cell}>{p.status}</Text>
              </View>
            ))
          )}
        </Page>
      ) : null}

      {fotoUrls.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Fotos</Text>
          <View style={styles.imgRow}>
            {fotoUrls.slice(0, 8).map((url, i) => (
              <View key={i}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image hat kein alt */}
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

export async function renderAbnahmeProtokollPdfBuffer(props: {
  kunde: Kunde
  auftragIdShort: string
  abnahmeDatum: string
  positionen: AngebotPosition[]
  handwerkerZeilen: string[]
  abnahmeEintraege: FormularEintrag[]
  fotoUrls: string[]
  zusatz: AbnahmePdfZusatz | null
}) {
  return renderToBuffer(
    <AbnahmeProtokollPdfDocument
      kunde={props.kunde}
      auftragIdShort={props.auftragIdShort}
      abnahmeDatum={props.abnahmeDatum}
      positionen={props.positionen}
      handwerkerZeilen={props.handwerkerZeilen}
      abnahmeEintraege={props.abnahmeEintraege}
      fotoUrls={props.fotoUrls}
      zusatz={props.zusatz}
    />
  )
}
