import { notFound } from 'next/navigation'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { RechnungDetailClient } from '@/components/rechnungen/RechnungDetailClient'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
import { loadProjektKontext } from '@/lib/crm/load-projekt-kontext'
import { loadAngebotDetail } from '@/lib/angebote/load-angebot-detail'
import {
  loadAuftragDetail,
  loadRechnungenForAuftrag,
} from '@/app/(dashboard)/auftraege/auftraege-data'
import { loadWizardContext } from '@/lib/wizard-context'
import { loadAnfrageDetail } from '@/lib/anfragen/load-anfrage-detail'
import {
  buildRechnungKorrekturKetteUi,
  findeKorrekturOriginalId,
  findeNachfolgerRechnungId,
  linkRechnungKorrekturKette,
  rechnungDarfStornoZurueckgenommenWerden,
  type RechnungKorrekturKetteSiblingRow,
  type RechnungKorrekturSibling,
  type RechnungKorrekturKetteUi,
} from '@/lib/rechnungen/rechnung-korrektur'
import type { RechnungAuswahlZeile } from '@/lib/rechnungen/rechnung-wizard-types'
import type { Gewerk, Handwerker, LeadDetail, Preisliste, Rechnung } from '@/lib/types'

export default async function RechnungDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [firm, wizardCtx, { data, error }] = await Promise.all([
    fetchFirmenEinstellungen(supabase),
    loadWizardContext(supabase),
    withCrmReadFallback(async (db) =>
      db
        .from('rechnungen')
        .select(
          '*, kunden(id, name, vorname, nachname, email, telefon, adresse, strasse, hausnummer, plz, ort, typ, ust_id), auftraege(id, titel), angebote(id, leistungsumfang, notizen)'
        )
        .eq('id', params.id)
        .maybeSingle()
    ),
  ])
  const gwRes = { data: wizardCtx.gewerke.map((g) => ({ id: g.id, name: g.name, slug: g.slug })) }
  const plRes = { data: wizardCtx.preislisten as Preisliste[] }

  if (error || !data) notFound()

  const rec = data as Rechnung & {
    kunde_id: string
    auftrag_id: string | null
    angebot_id: string | null
    created_at?: string | null
    zahlungsplan_abschlag_id?: string | null
    rechnung_art?: string | null
    abschlag_index?: number | null
    richtung?: string | null
    handwerker_id?: string | null
    korrektur_von?: string | null
    korrektur_art?: string | null
  }

  const isEingehend = String(rec.richtung ?? '') === 'eingehend'

  const projektKontext = await loadProjektKontext(supabase, {
    activeKind: 'rechnung',
    activeId: params.id,
    rechnungId: params.id,
    kundeId: rec.kunde_id,
    auftragId: rec.auftrag_id,
    angebotId: rec.angebot_id,
  })

  const leadId = isEingehend ? null : projektKontext.lead?.id ?? null
  const angebotId = rec.angebot_id ?? projektKontext.angebote[0]?.id ?? null
  const auftragId = rec.auftrag_id ?? projektKontext.auftrag?.id ?? null

  let pipelineLead: {
    kanal?: string | null
    auftraggeber_kunde_id?: string | null
    anlass?: string | null
  } | null = null
  let lead: LeadDetail | null = null
  let handwerker: Handwerker | null = null

  const [leadBundle, angebotDetail, auftragDetail, auftragRechnungenRaw, siblingRes, hwRes] =
    await Promise.all([
      leadId
        ? loadAnfrageDetail(supabase, leadId).then((leadDetail) => ({
            lead: leadDetail,
            pipelineLead: leadDetail
              ? {
                  kanal: leadDetail.kanal as string | null,
                  auftraggeber_kunde_id: leadDetail.auftraggeber_kunde_id as string | null,
                  anlass: leadDetail.anlass as string | null,
                }
              : null,
          }))
        : Promise.resolve({
            lead: null as LeadDetail | null,
            pipelineLead: null as {
              kanal?: string | null
              auftraggeber_kunde_id?: string | null
              anlass?: string | null
            } | null,
          }),
      isEingehend || !angebotId
        ? Promise.resolve(null)
        : loadAngebotDetail(supabase, angebotId),
      // Rechnung braucht keinen Full-Auftrag mit Bautagebuch/Baustelle
      isEingehend || !auftragId
        ? Promise.resolve(null)
        : loadAuftragDetail(auftragId, { mode: 'shell' }),
      isEingehend || !auftragId
        ? Promise.resolve([])
        : loadRechnungenForAuftrag(auftragId),
      isEingehend
        ? Promise.resolve({ data: [] as RechnungKorrekturSibling[] })
        : auftragId
          ? supabase
              .from('rechnungen')
              .select(
                'id, created_at, status, beleg_typ, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, bezug_rechnung_id, korrektur_von, ersetzt_durch, rechnungsnummer, brutto'
              )
              .eq('auftrag_id', auftragId)
          : supabase
              .from('rechnungen')
              .select(
                'id, created_at, status, beleg_typ, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, bezug_rechnung_id, korrektur_von, ersetzt_durch, rechnungsnummer, brutto'
              )
              .eq('kunde_id', rec.kunde_id)
              .order('created_at', { ascending: false })
              .limit(80),
      isEingehend && rec.handwerker_id
        ? supabase
            .from('handwerker')
            .select(
              'id, name, firma, vorname, nachname, email, telefon, whatsapp, webseite, adresse, strasse, hausnummer, plz, ort, iban, steuernummer, ustid, aktiv, notizen, created_at, gewerke, subkategorie, ist_fachbetrieb, compliance_status, partner_kategorie_id'
            )
            .eq('id', rec.handwerker_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  lead = leadBundle.lead
  pipelineLead = leadBundle.pipelineLead
  handwerker = (hwRes.data as Handwerker | null) ?? null

  const auftragRechnungen = (auftragRechnungenRaw ?? []) as RechnungAuswahlZeile[]
  const siblings = (siblingRes.data ?? []) as RechnungKorrekturSibling[]

  let detailRec = data as Rechnung
  if (
    !isEingehend &&
    String(rec.status ?? '') === 'entwurf' &&
    !String(rec.korrektur_von ?? '').trim()
  ) {
    const origId = findeKorrekturOriginalId(
      {
        id: params.id,
        created_at: rec.created_at,
        zahlungsplan_abschlag_id: rec.zahlungsplan_abschlag_id,
        rechnung_art: rec.rechnung_art,
        abschlag_index: rec.abschlag_index,
      },
      siblings
    )
    if (origId) {
      await linkRechnungKorrekturKette(supabase, {
        originalId: origId,
        neuId: params.id,
        art: 'gutschrift',
      })
      detailRec = {
        ...detailRec,
        korrektur_von: origId,
        korrektur_art: 'gutschrift',
      }
    }
  }

  const nachfolgerRechnungId = (() => {
    if (isEingehend) return null
    const viaFind = findeNachfolgerRechnungId(
      {
        id: params.id,
        created_at: rec.created_at,
        zahlungsplan_abschlag_id: rec.zahlungsplan_abschlag_id,
        rechnung_art: rec.rechnung_art,
        abschlag_index: rec.abschlag_index,
      },
      siblings
    )
    if (viaFind) return viaFind
    return (
      String((detailRec as { ersetzt_durch?: string | null }).ersetzt_durch ?? '').trim() || null
    )
  })()

  const darfStornoZurueck = isEingehend
    ? false
    : rechnungDarfStornoZurueckgenommenWerden(rec.status, params.id, siblings)

  let korrekturKette: RechnungKorrekturKetteUi | null = null
  if (!isEingehend) {
    const siblingRows = siblings as RechnungKorrekturKetteSiblingRow[]
    korrekturKette = buildRechnungKorrekturKetteUi(
      {
        id: params.id,
        status: detailRec.status,
        beleg_typ: (detailRec as { beleg_typ?: string | null }).beleg_typ,
        bezug_rechnung_id: (detailRec as { bezug_rechnung_id?: string | null }).bezug_rechnung_id,
        korrektur_von: (detailRec as { korrektur_von?: string | null }).korrektur_von,
        ersetzt_durch: (detailRec as { ersetzt_durch?: string | null }).ersetzt_durch,
        rechnungsnummer: detailRec.rechnungsnummer,
        brutto: detailRec.brutto ?? null,
      },
      siblingRows
    )

    // Fehlende Kettenglieder nachladen (z. B. andere Auftrags-Grenze)
    if (korrekturKette) {
      const missing = korrekturKette.members
        .filter((m) => !siblingRows.some((s) => s.id === m.id) && m.id !== params.id)
        .map((m) => m.id)
      if (missing.length) {
        const { data: extra } = await supabase
          .from('rechnungen')
          .select(
            'id, created_at, status, beleg_typ, bezug_rechnung_id, korrektur_von, ersetzt_durch, rechnungsnummer, brutto'
          )
          .in('id', missing)
        const merged = [...siblingRows, ...((extra ?? []) as RechnungKorrekturKetteSiblingRow[])]
        korrekturKette = buildRechnungKorrekturKetteUi(
          {
            id: params.id,
            status: detailRec.status,
            beleg_typ: (detailRec as { beleg_typ?: string | null }).beleg_typ,
            bezug_rechnung_id: (detailRec as { bezug_rechnung_id?: string | null })
              .bezug_rechnung_id,
            korrektur_von: (detailRec as { korrektur_von?: string | null }).korrektur_von,
            ersetzt_durch: (detailRec as { ersetzt_durch?: string | null }).ersetzt_durch,
            rechnungsnummer: detailRec.rechnungsnummer,
            brutto: detailRec.brutto ?? null,
          },
          merged
        )
      }
    }
  }

  return (
    <RechnungDetailClient
      detail={detailRec}
      kleinunternehmerFirma={parseKleinunternehmerSetting(firm.kleinunternehmer)}
      gewerke={(gwRes.data ?? []) as Gewerk[]}
      preislisten={(plRes.data ?? []) as Preisliste[]}
      firm={firm}
      projektKontext={projektKontext}
      pipelineLead={pipelineLead}
      lead={lead}
      handwerker={handwerker}
      angebotDetail={angebotDetail}
      auftragDetail={auftragDetail}
      auftragRechnungen={auftragRechnungen}
      nachfolgerRechnungId={nachfolgerRechnungId}
      darfStornoZuruecknehmen={darfStornoZurueck}
      korrekturKette={korrekturKette}
    />
  )
}
