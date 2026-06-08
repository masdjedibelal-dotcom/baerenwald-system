/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image ohne alt */
import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import type { VertragPdfPayload } from '@/lib/vertraege/types'
import {
  PROJEKT_NU_ANLAGE_NACHWEISE,
  PROJEKT_NU_PARAGRAPHEN,
  RAHMEN_PARAGRAPHEN,
  leistungSchwerpunktAusGewerk,
  type VertragParagraph,
} from '@/lib/vertraege/klauseln'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { handwerkerAnzeigename } from '@/lib/vertraege/build-vertrag-texte'

const GRUEN = '#1A3D2B'
const TEXT_PRIMARY = '#111111'
const TEXT_MUTED = '#333333'
const TEXT_LABEL = '#6B7280'

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 80, fontSize: 9, fontFamily: 'Helvetica', color: TEXT_PRIMARY },
  logoWrap: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: GRUEN,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { height: 72, width: 72, objectFit: 'contain' },
  logoWordmark: { fontSize: 15, fontWeight: 'bold', color: GRUEN, letterSpacing: 0.2 },
  brandFallback: { fontSize: 15, fontWeight: 'bold', color: GRUEN, letterSpacing: 0.2 },
  docTitleCenter: {
    fontSize: 13,
    fontWeight: 'bold',
    color: GRUEN,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 14,
  },
  bauvorhabenCard: {
    marginTop: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 2,
  },
  bauvorhabenLabel: { fontSize: 8, fontWeight: 'bold', color: TEXT_LABEL, marginBottom: 4 },
  bauvorhabenText: { fontSize: 9, lineHeight: 1.5, color: TEXT_PRIMARY },
  partiesRow: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  partyCol: { flex: 1 },
  partyHeading: {
    fontSize: 8,
    fontWeight: 'bold',
    color: TEXT_LABEL,
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  partyName: { fontSize: 9.5, fontWeight: 'bold', marginBottom: 3 },
  partyLine: { fontSize: 9, lineHeight: 1.5, marginBottom: 1, color: TEXT_PRIMARY },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: TEXT_PRIMARY, marginTop: 4, marginBottom: 8 },
  paraTitle: { fontSize: 9.5, fontWeight: 'bold', marginTop: 9, marginBottom: 3, color: TEXT_PRIMARY },
  paraBody: { fontSize: 9, lineHeight: 1.55, color: TEXT_PRIMARY, textAlign: 'justify' },
  bullet: { fontSize: 9, marginLeft: 10, marginBottom: 3, lineHeight: 1.5 },
  signRow: { flexDirection: 'row', gap: 28, marginTop: 36 },
  signCol: { flex: 1 },
  signLine: { borderBottomWidth: 1, borderBottomColor: '#9CA3AF', height: 32, marginBottom: 6 },
  signLabel: { fontSize: 8, color: TEXT_MUTED, lineHeight: 1.45 },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
  },
  footerDataRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  footerCol: { flex: 1, fontSize: 7.5, color: TEXT_MUTED, lineHeight: 1.5, maxWidth: '46%' },
  footerColRight: { flex: 1, fontSize: 7.5, color: TEXT_MUTED, lineHeight: 1.5, textAlign: 'right', maxWidth: '46%' },
  footerPageRow: { marginTop: 6, alignItems: 'center' },
  footerPageText: { fontSize: 8, color: TEXT_MUTED },
})

function firmenName(firm: FirmenEinstellungen) {
  return firm.firmenname?.trim() || 'Bärenwald München'
}

function formatSteuernummer(nr: string | null | undefined): string | null {
  const raw = nr?.trim()
  if (!raw) return null
  if (raw.includes('/')) return raw
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}/${d.slice(3, 6)}/${d.slice(6)}`
  return raw
}

function firmAdresseBlock(firm: FirmenEinstellungen): string[] {
  const lines: string[] = []
  if (firm.strasse?.trim()) {
    const ort = [firm.plz, firm.ort].filter(Boolean).join(' ')
    lines.push(ort ? `${firm.strasse.trim()}, ${ort}` : firm.strasse.trim())
  }
  return lines
}

function handwerkerAdresseZeilen(hw: VertragPdfPayload['handwerker']): string[] {
  const adr = hw.adresse?.trim()
  if (!adr) return []
  return [adr]
}

function verguetungTextKomplett(payload: VertragPdfPayload): string {
  const base = payload.verguetung_text?.trim() || '—'
  if (payload.regiesatz_netto == null) return base
  const regieStr = `${payload.regiesatz_netto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (base.includes(regieStr) || /regiesatz/i.test(base)) return base
  return `${base} Regiesatz ${regieStr} € netto pro Stunde.`
}

function dokumentTitel(payload: VertragPdfPayload): string {
  return payload.typ === 'projekt' ? 'Projektvertrag' : 'Rahmenvertrag'
}

function LogoKopf({ logoSrc, firm }: { logoSrc: string | null; firm: FirmenEinstellungen }) {
  const name = firmenName(firm)
  const usable =
    logoSrc &&
    (logoSrc.startsWith('data:') || /^https?:\/\//i.test(logoSrc)) &&
    !/^file:/i.test(logoSrc)

  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoRow}>
        {usable ? <Image style={styles.logo} src={logoSrc} /> : null}
        <Text style={usable ? styles.logoWordmark : styles.brandFallback}>{name}</Text>
      </View>
    </View>
  )
}

function PdfFooter({ firm }: { firm: FirmenEinstellungen }) {
  const name = firmenName(firm)
  const adrLines = firmAdresseBlock(firm)
  const tel = firm.telefon?.trim() ? `Tel.: ${firm.telefon.trim()}` : null
  const email = firm.email?.trim() || null
  const web = firm.website?.trim()?.replace(/^https?:\/\//i, '') || 'www.baerenwaldmuenchen.de'
  const ust = firm.ust_id?.trim() ? `USt-IdNr.: ${firm.ust_id.trim()}` : null
  const st = formatSteuernummer(firm.steuernummer)
  const steuernr = st ? `Steuernummer: ${st}` : null

  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerDataRow}>
        <View style={styles.footerCol}>
          <Text>{name}</Text>
          {adrLines.map((l) => (
            <Text key={l}>{l}</Text>
          ))}
          {tel ? <Text>{tel}</Text> : null}
          {email ? <Text>{email}</Text> : null}
        </View>
        <View style={styles.footerColRight}>
          <Text>{web.startsWith('www.') ? web : `www.${web}`}</Text>
          {ust ? <Text>{ust}</Text> : null}
          {steuernr ? <Text>{steuernr}</Text> : null}
        </View>
      </View>
      <View style={styles.footerPageRow}>
        <Text
          style={styles.footerPageText}
          render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
        />
      </View>
    </View>
  )
}

function ParteienUndBauvorhabenBlock({ payload }: { payload: VertragPdfPayload }) {
  const firm = payload.firm
  const hw = payload.handwerker
  const hwLabel = payload.typ === 'projekt' ? 'Nachunternehmer' : 'Partner'
  const isProjekt = payload.typ === 'projekt'

  const agUst = firm.ust_id?.trim() ? `USt-IdNr. ${firm.ust_id.trim()}` : null
  const agSt = formatSteuernummer(firm.steuernummer)
  const agSteuer = agSt ? `St.-Nr. ${agSt}` : null
  const agWeb = firm.website?.trim()?.replace(/^https?:\/\//i, '')

  const hwSt = formatSteuernummer(hw.steuernummer)
  const hwSteuer = hwSt ? `Steuernummer ${hwSt}` : null

  return (
    <View>
      <View style={styles.partiesRow}>
        <View style={styles.partyCol}>
          <Text style={styles.partyHeading}>Auftraggeber</Text>
          <Text style={styles.partyName}>{firmenName(firm)}</Text>
          {firmAdresseBlock(firm).map((l) => (
            <Text key={`ag-${l}`} style={styles.partyLine}>
              {l}
            </Text>
          ))}
          {agUst ? <Text style={styles.partyLine}>{agUst}</Text> : null}
          {agSteuer ? <Text style={styles.partyLine}>{agSteuer}</Text> : null}
          {agWeb ? (
            <Text style={styles.partyLine}>{agWeb.startsWith('www.') ? agWeb : `www.${agWeb}`}</Text>
          ) : null}
        </View>
        <View style={styles.partyCol}>
          <Text style={styles.partyHeading}>{hwLabel}</Text>
          <Text style={styles.partyName}>{handwerkerAnzeigename(hw)}</Text>
          {handwerkerAdresseZeilen(hw).map((l) => (
            <Text key={`hw-${l}`} style={styles.partyLine}>
              {l}
            </Text>
          ))}
          {hw.telefon?.trim() ? <Text style={styles.partyLine}>Tel. {hw.telefon.trim()}</Text> : null}
          {hw.email?.trim() ? <Text style={styles.partyLine}>{hw.email.trim()}</Text> : null}
          {hwSteuer ? <Text style={styles.partyLine}>{hwSteuer}</Text> : null}
          {hw.ustid?.trim() ? <Text style={styles.partyLine}>USt-IdNr. {hw.ustid.trim()}</Text> : null}
          {isProjekt && payload.bauvorhaben?.trim() ? (
            <View style={styles.bauvorhabenCard}>
              <Text style={styles.bauvorhabenLabel}>Bauvorhaben</Text>
              <Text style={styles.bauvorhabenText}>{payload.bauvorhaben.trim()}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text style={styles.docTitleCenter}>{dokumentTitel(payload)}</Text>
    </View>
  )
}

function ParagraphBlock({ nr, title, body }: { nr: string; title: string; body: string }) {
  return (
    <View>
      <Text style={styles.paraTitle}>
        {nr} {title}
      </Text>
      <Text style={styles.paraBody}>{body}</Text>
    </View>
  )
}

function Paragraphs({ items, dynamic }: { items: VertragParagraph[]; dynamic?: Record<string, string> }) {
  return (
    <>
      {items.map((p) => {
        let body = p.body
        if (dynamic) {
          for (const [k, v] of Object.entries(dynamic)) {
            body = body.replaceAll(`{{${k}}}`, v)
          }
        }
        return <ParagraphBlock key={p.nr} nr={p.nr} title={p.title} body={body} />
      })}
    </>
  )
}

function VertragInhalt({ payload }: { payload: VertragPdfPayload }) {
  const isProjekt = payload.typ === 'projekt'
  const dynamic = {
    einbehalt: String(payload.einbehalt_prozent),
    zahlungsziel: String(payload.zahlungsziel_tage),
    aufmass: String(payload.aufmass_rhythmus_tage),
    leistung_schwerpunkt: leistungSchwerpunktAusGewerk(payload.gewerk_name),
  }

  if (!isProjekt) {
    return <Paragraphs items={RAHMEN_PARAGRAPHEN} />
  }

  return (
    <>
      <Paragraphs items={PROJEKT_NU_PARAGRAPHEN.slice(0, 1)} dynamic={dynamic} />
      <ParagraphBlock nr="§2" title="Leistungsumfang" body={payload.leistungsumfang} />
      <ParagraphBlock nr="§3" title="Vergütung" body={verguetungTextKomplett(payload)} />
      <Paragraphs items={PROJEKT_NU_PARAGRAPHEN.slice(1)} dynamic={dynamic} />
    </>
  )
}

export function VertragPdfDocument({
  payload,
  logoSrc,
}: {
  payload: VertragPdfPayload
  logoSrc: string | null
}) {
  const isProjekt = payload.typ === 'projekt'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <LogoKopf logoSrc={logoSrc} firm={payload.firm} />
        <ParteienUndBauvorhabenBlock payload={payload} />
        <VertragInhalt payload={payload} />
        <PdfFooter firm={payload.firm} />
      </Page>

      {isProjekt ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Anlage 1 – Verpflichtende Nachweise</Text>
          {PROJEKT_NU_ANLAGE_NACHWEISE.map((item) => (
            <Text key={item} style={styles.bullet}>
              • {item}
            </Text>
          ))}
          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <Text style={styles.signLabel}>Ort / Datum</Text>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>{firmenName(payload.firm)}</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signLabel}>Ort / Datum</Text>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>{handwerkerAnzeigename(payload.handwerker)}</Text>
            </View>
          </View>
          <PdfFooter firm={payload.firm} />
        </Page>
      ) : (
        <Page size="A4" style={styles.page}>
          <View style={styles.signRow}>
            <View style={styles.signCol}>
              <Text style={styles.signLabel}>Ort / Datum</Text>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>{firmenName(payload.firm)} · Auftraggeber</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signLabel}>Ort / Datum</Text>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>{handwerkerAnzeigename(payload.handwerker)} · Partner</Text>
            </View>
          </View>
          <PdfFooter firm={payload.firm} />
        </Page>
      )}
    </Document>
  )
}

export async function renderVertragPdfBuffer(payload: VertragPdfPayload): Promise<Buffer> {
  const logoSrc = resolveAngebotPdfLogoSrc(payload.firm.logo_url)
  const buf = await renderToBuffer(<VertragPdfDocument payload={payload} logoSrc={logoSrc} />)
  return Buffer.from(buf)
}
