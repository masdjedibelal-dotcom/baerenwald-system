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
  findeNachfolgerRechnungId,
  rechnungDarfStornoZurueckgenommenWerden,
  type RechnungKorrekturSibling,
} from '@/lib/rechnungen/rechnung-korrektur'
import type { RechnungAuswahlZeile } from '@/lib/rechnungen/rechnung-wizard-types'
import type { Gewerk, LeadDetail, LeadTimelineRow, Preisliste, Rechnung } from '@/lib/types'

export default async function RechnungDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [firm, wizardCtx, mahnRes, { data, error }] = await Promise.all([
    fetchFirmenEinstellungen(supabase),
    loadWizardContext(supabase),
    supabase
      .from('email_log')
      .select('id, betreff, created_at')
      .eq('rechnung_id', params.id)
      .eq('typ', 'zahlungserinnerung')
      .order('created_at', { ascending: true }),
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
  }

  const projektKontext = await loadProjektKontext(supabase, {
    activeKind: 'rechnung',
    activeId: params.id,
    rechnungId: params.id,
    kundeId: rec.kunde_id,
    auftragId: rec.auftrag_id,
    angebotId: rec.angebot_id,
  })

  const leadId = projektKontext.lead?.id ?? null
  const angebotId = rec.angebot_id ?? projektKontext.angebote[0]?.id ?? null
  const auftragId = rec.auftrag_id ?? projektKontext.auftrag?.id ?? null

  let pipelineLead: {
    kanal?: string | null
    auftraggeber_kunde_id?: string | null
    anlass?: string | null
  } | null = null
  let lead: LeadDetail | null = null
  let timeline: LeadTimelineRow[] = []

  const [leadBundle, angebotDetail, auftragDetail, auftragRechnungenRaw, siblingRes] =
    await Promise.all([
      leadId
        ? Promise.all([
            loadAnfrageDetail(supabase, leadId),
            supabase
              .from('lead_timeline')
              .select('*')
              .eq('lead_id', leadId)
              .order('created_at', { ascending: true }),
          ]).then(([leadDetail, tlRes]) => ({
            lead: leadDetail,
            timeline: (tlRes.data ?? []) as LeadTimelineRow[],
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
            timeline: [] as LeadTimelineRow[],
            pipelineLead: null as {
              kanal?: string | null
              auftraggeber_kunde_id?: string | null
              anlass?: string | null
            } | null,
          }),
      angebotId ? loadAngebotDetail(supabase, angebotId) : Promise.resolve(null),
      // Rechnung braucht keinen Full-Auftrag mit Bautagebuch/Baustelle
      auftragId ? loadAuftragDetail(auftragId, { mode: 'shell' }) : Promise.resolve(null),
      auftragId ? loadRechnungenForAuftrag(auftragId) : Promise.resolve([]),
      auftragId
        ? supabase
            .from('rechnungen')
            .select(
              'id, created_at, status, beleg_typ, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, bezug_rechnung_id'
            )
            .eq('auftrag_id', auftragId)
        : supabase
            .from('rechnungen')
            .select(
              'id, created_at, status, beleg_typ, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, bezug_rechnung_id'
            )
            .eq('kunde_id', rec.kunde_id)
            .order('created_at', { ascending: false })
            .limit(80),
    ])

  lead = leadBundle.lead
  timeline = leadBundle.timeline
  pipelineLead = leadBundle.pipelineLead

  const auftragRechnungen = (auftragRechnungenRaw ?? []) as RechnungAuswahlZeile[]
  const siblings = (siblingRes.data ?? []) as RechnungKorrekturSibling[]

  const nachfolgerRechnungId = findeNachfolgerRechnungId(
    {
      id: params.id,
      created_at: rec.created_at,
      zahlungsplan_abschlag_id: rec.zahlungsplan_abschlag_id,
      rechnung_art: rec.rechnung_art,
      abschlag_index: rec.abschlag_index,
    },
    siblings
  )

  const darfStornoZurueck =
    rechnungDarfStornoZurueckgenommenWerden(rec.status, params.id, siblings)

  return (
    <RechnungDetailClient
      detail={data as Rechnung}
      kleinunternehmerFirma={parseKleinunternehmerSetting(firm.kleinunternehmer)}
      gewerke={(gwRes.data ?? []) as Gewerk[]}
      preislisten={(plRes.data ?? []) as Preisliste[]}
      firm={firm}
      mahnMails={mahnRes.data ?? []}
      projektKontext={projektKontext}
      pipelineLead={pipelineLead}
      lead={lead}
      angebotDetail={angebotDetail}
      auftragDetail={auftragDetail}
      auftragRechnungen={auftragRechnungen}
      nachfolgerRechnungId={nachfolgerRechnungId}
      darfStornoZuruecknehmen={darfStornoZurueck}
      timeline={timeline}
    />
  )
}
