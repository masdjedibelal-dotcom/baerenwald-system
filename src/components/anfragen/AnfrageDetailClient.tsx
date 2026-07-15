'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  ArrowRight,
  Briefcase,
  Calendar,
  MapPin,
  FileText,
  History,
  LayoutGrid,
  Layers,
  ListChecks,
  MoreHorizontal,
  StickyNote,
  Pencil,
  Sparkles,
} from 'lucide-react'
import { DetailHead } from '@/components/layout/DetailHead'
import { ProjektKette } from '@/components/crm/ProjektKette'
import { ProjektUebersichtCard } from '@/components/crm/ProjektUebersichtCard'
import {
  MockDetailShell,
  MockDokumenteCard,
  MockVerlaufCard,
} from '@/components/mock-ui'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { DetailProp } from '@/components/ui/detail-prop'
import { LeadNaechsteSchritteCard, buildLeadNaechsteSchritte } from '@/components/anfragen/LeadNaechsteSchritteCard'
import {
  dedupeKalenderTermineAnzeige,
  normalizeKalenderTermineList,
} from '@/lib/anfragen/normalize-kalender-termine'
import { istLeadTerminAnzeige } from '@/lib/kalender-internes-todo'
import { leadAngebotFunnelFromListe } from '@/lib/lead-angebot-funnel'
import { leadKontaktAnzeigeName, resolveLeadKunde } from '@/lib/lead-display-helpers'
import { istKundeGewerbeTyp } from '@/lib/kunde-stammdaten'
import { Timeline } from '@/components/ui/timeline'
import { EmailLogPreviewModal } from '@/components/email/EmailLogPreviewModal'
import { sortTimelineByCreatedAtAsc } from '@/lib/timeline-sort'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { KanalBadge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { anfrageStatusDisplay } from '@/lib/status/status-display'
import { DetailMetaChip, DetailMetaRow } from '@/components/ui/DetailMetaChip'
import { StatusModal, type StatusModalKind } from '@/components/anfragen/StatusModal'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import { KommunikationCard } from '@/components/kommunikation/KommunikationCard'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromLead } from '@/app/(dashboard)/kommunikation/actions'
import { LeadFunnelProjektAnzeige } from '@/components/anfragen/LeadFunnelProjektAnzeige'
import { LeadOrgKontextBlock } from '@/components/anfragen/LeadOrgKontextBlock'
import { CrmPortalOpenButtons } from '@/components/portal/CrmPortalOpenButtons'
import { PipelineKontextBadge, PortalSyncWarning } from '@/components/anfragen/PipelineKontextBadge'
import { VorgangResolverBanner } from '@/components/vorgang/VorgangResolverBanner'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { EntityDetailsTab } from '@/components/entity-detail/EntityDetailsTab'
import { PosBoard } from '@/components/posboard/PosBoard'
import { LeadGptStudioBlock, leadHatKiVertriebsDaten } from '@/components/anfragen/LeadGptStudioBlock'
import { LeadNotizenListeTab } from '@/components/anfragen/AnfrageLeadTabsShared'
import { LeadTermineCard } from '@/components/anfragen/LeadTermineCard'
import { AnfrageDokumenteTab } from '@/components/anfragen/AnfrageDokumenteTab'
import { AngebotAuswahlModal } from '@/components/angebote/AngebotAuswahlModal'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { AnfrageNeuSheet } from '@/components/anfragen/AnfrageNeuSheet'
import { KundenStammdatenCard } from '@/components/kunden/KundenStammdatenCard'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { KundenObjekteCard } from '@/components/kunden/KundenObjekteCard'
import { fetchKundenObjekte, setLeadKundeObjekt } from '@/app/actions/kunden-objekte'
import type { KundenObjekt } from '@/lib/types'
import type { ObjektAkteReadOnlyPayload } from '@/lib/objektakte/types'
import { resolveVorgangFromCrmEntities } from '@/lib/vorgang/resolve-from-crm-entities'
import { vorgangBackNav } from '@/lib/vorgang/vorgang-back-nav'
import type { AngebotPosition } from '@/lib/types'

const AngebotWizard = dynamic(
  () =>
    import('@/components/angebote/AngebotWizard').then((mod) => ({
      default: mod.AngebotWizard,
    })),
  { ssr: false }
)

const KundeModal = dynamic(
  () =>
    import('@/components/kunden/KundeModal').then((mod) => ({
      default: mod.KundeModal,
    })),
  { ssr: false }
)
import { toast } from '@/components/ui/app-toast'
import { deleteAnfrage, weiterfuehrenAlsProjekt } from '@/app/(dashboard)/anfragen/actions'
import { ENTITY_DETAIL_TAB_LABELS } from '@/lib/entity-detail/entity-detail-tabs'
import { ACTIVITY_SECTIONS, CTA } from '@/lib/crm-labels'
import { loadAngebotWizardBootstrap, loadAngebotWizardBootstrapKopie } from '@/app/(dashboard)/angebote/wizard-actions'
import { findeNeuestenEntwurf, hatNurEntwuerfe } from '@/lib/angebote/angebot-lebenszyklus'
import { ergaenzeTimelineMitProjektKontext } from '@/lib/crm/build-projekt-timeline'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, Handwerker, KalenderTermin, LeadDetail, LeadNotizRow, Preisliste } from '@/lib/types'
import {
  STATUS_LABELS,
  formatDatum,
  formatDatumZeit,
  formatRelativeDate,
} from '@/lib/utils'
import { isEchterFreitext } from '@/lib/lead-display-helpers'

function kundenName(lead: LeadDetail) {
  return leadKontaktAnzeigeName(lead)
}

type AngebotKurz = {
  id: string
  status: string
  status_einfach?: string | null
  gesamt_fix?: number | null
  gesamt_min: number | null
  gesamt_max: number | null
  created_at: string
  angebotsnr?: string | null
  pdf_url?: string | null
}

type AnfrageAngebotFlowSnapshot = {
  angebotId: string
  angebotHref: string
  handwerkerErledigt: boolean
  angebotAnKundeGesendet: boolean
}

export function AnfrageDetailClient({
  lead: initial,
  angeboteListe = [],
  wizardGewerke = [],
  wizardPreislisten = [],
  wizardFirm,
  wizardHandwerker = [],
  kundenObjekte = [],
  objektAkteReadOnly = null,
  angebotKopieVonQuelleId,
  angebotFlowSnapshot = null,
  angeboteAuswahlInitial = false,
  angebotWizardInitial = false,
  projektKontext,
  dbAuftragId = null,
  dbAuftragStatus = null,
  posBoardPositionen = [],
}: {
  lead: LeadDetail
  angeboteListe?: AngebotKurz[]
  wizardGewerke?: Gewerk[]
  wizardPreislisten?: Preisliste[]
  wizardFirm?: FirmenEinstellungen
  wizardHandwerker?: Handwerker[]
  kundenObjekte?: KundenObjekt[]
  objektAkteReadOnly?: ObjektAkteReadOnlyPayload | null
  /** Server: beim Aufruf mit ?angebot_kopie_von= wird der Wizard als 1:1-Kopie geöffnet. */
  angebotKopieVonQuelleId?: string
  angebotFlowSnapshot?: AnfrageAngebotFlowSnapshot | null
  /** z. B. Redirect von /anfragen/[id]/angebote — Modal sofort öffnen */
  angeboteAuswahlInitial?: boolean
  /** z. B. nach Kunden-Aktion oder ?ziel=angebot — Wizard sofort öffnen */
  angebotWizardInitial?: boolean
  projektKontext?: ProjektKontext
  dbAuftragId?: string | null
  dbAuftragStatus?: string | null
  posBoardPositionen?: AngebotPosition[]
}) {
  const router = useRouter()
  const { refresh, generation } = useCrmRefresh()
  const [lead, setLead] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [statusModalKind, setStatusModalKind] = useState<StatusModalKind | null>(null)
  const [angebotWizardOpen, setAngebotWizardOpen] = useState(false)
  const [angebotWizardBootstrap, setAngebotWizardBootstrap] =
    useState<AngebotWizardBootstrap | null>(null)
  const [wizardSessionKey, setWizardSessionKey] = useState(0)
  const kopieQueryHandledRef = useRef(false)
  const [bearbeitenOpen, setBearbeitenOpen] = useState(false)
  const [angebotAuswahlOpen, setAngebotAuswahlOpen] = useState(angeboteAuswahlInitial)

  const [stammdatenModalOpen, setStammdatenModalOpen] = useState(false)
  const [objekteListe, setObjekteListe] = useState<KundenObjekt[]>(kundenObjekte)

  const kunde = useMemo(() => resolveLeadKunde(lead.kunden), [lead.kunden])
  const { backHref, backLabel } = vorgangBackNav('anfrage')
  const resolvedVorgang = useMemo(
    () =>
      resolveVorgangFromCrmEntities({
        lead: {
          id: lead.id,
          status: lead.status,
          situation: lead.situation,
          funnel_daten: lead.funnel_daten,
          kanal: lead.kanal,
          org_freigabe_status: lead.org_freigabe_status,
          hv_meldung_status: lead.hv_meldung_status,
          kontakt_name: lead.kontakt_name,
          plz: lead.plz,
          bereiche: lead.bereiche,
          created_at: lead.created_at,
          updated_at: lead.updated_at,
        },
        angebote: angeboteListe.map((a) => ({
          id: a.id,
          status: a.status,
          created_at: a.created_at,
        })),
        auftraege: dbAuftragId
          ? [
              {
                id: dbAuftragId,
                status: dbAuftragStatus ?? 'offen',
                created_at: lead.created_at,
              },
            ]
          : [],
      }),
    [lead, angeboteListe, dbAuftragId, dbAuftragStatus]
  )
  const kundeTypFuerObjekte = resolveAngebotKundeTyp(kunde?.typ, lead.kundentyp)
  const kundeIdFuerObjekte = kunde?.id ?? lead.kunde_id ?? ''
  const zeigeObjekteCard =
    Boolean(kundeIdFuerObjekte) && istKundeGewerbeTyp(kundeTypFuerObjekte)

  useEffect(() => {
    setLead(initial)
  }, [initial.id])

  useEffect(() => {
    if (!zeigeObjekteCard || !kundeIdFuerObjekte) {
      setObjekteListe([])
      return
    }
    let cancelled = false
    void fetchKundenObjekte(kundeIdFuerObjekte).then((rows) => {
      if (!cancelled) setObjekteListe(rows)
    })
    return () => {
      cancelled = true
    }
  }, [zeigeObjekteCard, kundeIdFuerObjekte])

  function waehleLeadObjekt(objektId: string | null) {
    setLead((l) => ({ ...l, kunde_objekt_id: objektId }))
    startTransition(async () => {
      const r = await setLeadKundeObjekt(lead.id, objektId)
      if (!r.ok) toast.error(r.message)
    })
  }

  const [emailPreviewId, setEmailPreviewId] = useState<string | null>(null)

  const history = sortTimelineByCreatedAtAsc(lead.leads_status_history ?? [])

  const leadStatusData = useMemo(() => {
    const fd = lead.funnel_daten
    const rec = typeof fd === 'object' && fd !== null ? (fd as Record<string, unknown>) : {}
    const funnelAngebotId = typeof rec.angebot_id === 'string' ? rec.angebot_id : undefined
    const funnelAuftragId = typeof rec.auftrag_id === 'string' ? rec.auftrag_id : undefined
    const auftragId = dbAuftragId ?? funnelAuftragId
    const angeboteQuelle =
      angeboteListe.length > 0
        ? angeboteListe
        : Array.isArray(lead.angebote)
          ? lead.angebote
          : []
    const funnel = leadAngebotFunnelFromListe(angeboteQuelle, funnelAngebotId)
    return {
      ...funnel,
      auftrag_href: auftragId ? `/auftraege/${auftragId}` : undefined,
      auftrag_id: auftragId,
      abgeschlossen_datum: lead.status === 'abgeschlossen' ? formatDatum(lead.updated_at) : undefined,
    }
  }, [lead.funnel_daten, lead.status, lead.updated_at, lead.angebote, angeboteListe, dbAuftragId])

  const timelineSorted = useMemo(
    () => sortTimelineByCreatedAtAsc(lead.lead_timeline ?? []),
    [lead.lead_timeline]
  )

  const notizenRows = useMemo(() => {
    const raw = lead.lead_notizen
    if (!Array.isArray(raw)) return [] as LeadNotizRow[]
    return [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [lead.lead_notizen])

  const timelineItems = useMemo(() => {
    const fromEvents = timelineSorted.map((ev) => ({
      id: ev.id,
      text: ev.beschreibung ? `${ev.titel} — ${ev.beschreibung}` : ev.titel,
      time: formatRelativeDate(ev.created_at),
      state: 'done' as const,
      ts: new Date(ev.created_at).getTime(),
      linkLabel: ev.email_log_id ? 'E-Mail ansehen' : undefined,
      onLinkClick: ev.email_log_id ? () => setEmailPreviewId(ev.email_log_id!) : undefined,
    }))
    const fromHistory = history.map((h) => ({
      id: h.id,
      text:
        h.status_alt != null
          ? `Status: ${STATUS_LABELS[h.status_alt]} → ${STATUS_LABELS[h.status_neu]}`
          : `Status: ${STATUS_LABELS[h.status_neu]}`,
      time: formatDatumZeit(h.created_at),
      state: 'active' as const,
      ts: new Date(h.created_at).getTime(),
    }))
    const basis = [...fromEvents, ...fromHistory]
      .sort((a, b) => a.ts - b.ts)
      .map((item) => ({
        text: item.text,
        time: item.time,
        state: item.state,
        id: item.id,
        ts: item.ts,
        linkLabel: 'linkLabel' in item ? item.linkLabel : undefined,
        onLinkClick: 'onLinkClick' in item ? item.onLinkClick : undefined,
      }))
    if (!projektKontext) {
      return basis.map(({ ts: _ts, ...rest }) => rest)
    }
    const merged = ergaenzeTimelineMitProjektKontext(
      basis.map((b) => ({
        id: b.id,
        ts: b.ts,
        text: b.text,
        time: b.time,
        state: b.state,
        linkLabel: b.linkLabel,
      })),
      projektKontext
    )
    return merged.map((item) => ({
      text: item.text,
      time: item.time,
      state: item.state,
      id: item.id,
      linkLabel: item.linkLabel,
      onLinkClick: item.href ? () => router.push(item.href!) : undefined,
    }))
  }, [timelineSorted, history, projektKontext, router])

  const dokumenteRows = useMemo(() => {
    const raw = lead.lead_dokumente
    if (!Array.isArray(raw)) return []
    return [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [lead.lead_dokumente])

  const dokumenteCount = useMemo(
    () => dokumenteRows.length + angeboteListe.length,
    [dokumenteRows.length, angeboteListe.length]
  )

  const stammdatenCard = (
    <KundenStammdatenCard
      kunde={kunde}
      fallback={{
        plz: lead.plz,
        kontakt_name: lead.kontakt_name,
        kontakt_email: lead.kontakt_email,
        kontakt_telefon: lead.kontakt_telefon,
        funnel_daten: lead.funnel_daten,
      }}
      action={
        kunde ? (
          <button
            type="button"
            onClick={() => setStammdatenModalOpen(true)}
            className="btn btn-ghost btn-sm"
            aria-label="Stammdaten bearbeiten"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null
      }
    />
  )
  const leadEmail = lead.kunden?.email ?? lead.kontakt_email ?? null
  const auftragId = leadStatusData.auftrag_id as string | undefined
  const mailCompose = useKundenMailCompose({ onSent: () => refresh() })

  const openAngebotWizard = useCallback((bootstrap: AngebotWizardBootstrap | null) => {
    setAngebotWizardBootstrap(bootstrap)
    setWizardSessionKey((k) => k + 1)
    setAngebotWizardOpen(true)
  }, [])

  useEffect(() => {
    const kopieId = angebotKopieVonQuelleId?.trim()
    if (!kopieId) {
      kopieQueryHandledRef.current = false
      return
    }
    if (kopieQueryHandledRef.current) return
    kopieQueryHandledRef.current = true
    const lid = lead.id
    let cancelled = false
    void (async () => {
      const res = await loadAngebotWizardBootstrapKopie(kopieId, lid)
      if (cancelled) return
      if (!res.ok) {
        toast.error(res.message)
        router.replace(`/anfragen/${lid}`, { scroll: false })
        return
      }
      openAngebotWizard(res.bootstrap)
      router.replace(`/anfragen/${lid}`, { scroll: false })
      refresh()
    })()
    return () => {
      cancelled = true
    }
  }, [angebotKopieVonQuelleId, lead.id, openAngebotWizard, router])

  const angebotWizardQueryHandledRef = useRef(false)
  useEffect(() => {
    if (!angebotWizardInitial) {
      angebotWizardQueryHandledRef.current = false
      return
    }
    if (angebotWizardQueryHandledRef.current) return
    angebotWizardQueryHandledRef.current = true
    openAngebotWizard(null)
    router.replace(`/anfragen/${lead.id}`, { scroll: false })
  }, [angebotWizardInitial, lead.id, openAngebotWizard, router])

  const hasAngebote = angeboteListe.length > 0

  const openAngebotAuswahl = useCallback(() => {
    if (angeboteListe.length === 0) {
      openAngebotWizard(null)
      return
    }
    const entwurf = findeNeuestenEntwurf(angeboteListe)
    if (entwurf && hatNurEntwuerfe(angeboteListe)) {
      startTransition(async () => {
        const res = await loadAngebotWizardBootstrap(entwurf.id, lead.id)
        if (res.ok) {
          openAngebotWizard(res.bootstrap)
          return
        }
        toast.error(res.message)
        setAngebotAuswahlOpen(true)
      })
      return
    }
    setAngebotAuswahlOpen(true)
  }, [angeboteListe, lead.id, openAngebotWizard, startTransition])

  const openAngebotErstellen = openAngebotAuswahl

  const openHandwerkerEinholen = useCallback(() => {
    const href = angebotFlowSnapshot?.angebotHref ?? (angeboteListe[0] ? `/angebote/${angeboteListe[0].id}` : null)
    if (href) router.push(`${href}#angebot-versand-handwerker`)
    else openAngebotWizard(null)
  }, [angebotFlowSnapshot?.angebotHref, angeboteListe, openAngebotWizard, router])

  const openAngebotAnKunde = useCallback(() => {
    const href = angebotFlowSnapshot?.angebotHref ?? (angeboteListe[0] ? `/angebote/${angeboteListe[0].id}` : null)
    if (href) router.push(`${href}#angebot-versand-kunde`)
  }, [angebotFlowSnapshot?.angebotHref, angeboteListe, router])

  const primaryCtaLabel = useMemo(() => {
    if (!hasAngebote) return CTA.angebotErstellen
    if (!angebotFlowSnapshot?.handwerkerErledigt) return 'Handwerker einholen'
    if (!angebotFlowSnapshot?.angebotAnKundeGesendet) return 'An Kunden senden'
    return CTA.angeboteOeffnen
  }, [hasAngebote, angebotFlowSnapshot])

  const primaryCtaAction = useCallback(() => {
    if (!hasAngebote) {
      openAngebotErstellen()
      return
    }
    if (!angebotFlowSnapshot?.handwerkerErledigt) {
      openHandwerkerEinholen()
      return
    }
    if (!angebotFlowSnapshot?.angebotAnKundeGesendet) {
      openAngebotAnKunde()
      return
    }
    openAngebotErstellen()
  }, [
    hasAngebote,
    angebotFlowSnapshot,
    openAngebotErstellen,
    openHandwerkerEinholen,
    openAngebotAnKunde,
  ])

  const closeAngebotWizard = useCallback(() => {
    setAngebotWizardOpen(false)
    setAngebotWizardBootstrap(null)
  }, [])

  const hatTermin = useMemo(() => {
    const unique = dedupeKalenderTermineAnzeige(
      normalizeKalenderTermineList(lead.kalender_termine as KalenderTermin[] | null | undefined)
    ).filter(istLeadTerminAnzeige)
    return unique.length > 0
  }, [lead.kalender_termine])

  const naechsteSchritte = useMemo(
    () =>
      buildLeadNaechsteSchritte({
        hatTermin,
        handwerkerErledigt: angebotFlowSnapshot?.handwerkerErledigt ?? false,
        angebotAnKundeGesendet: angebotFlowSnapshot?.angebotAnKundeGesendet ?? false,
        angebotHref:
          angebotFlowSnapshot?.angebotHref ??
          (angeboteListe[0] ? `/angebote/${angeboteListe[0].id}` : undefined),
        onTerminClick: () => setStatusModalKind('termin'),
        onHandwerkerEinholen: openHandwerkerEinholen,
        onAngebotAnKunde: openAngebotAnKunde,
      }),
    [
      angeboteListe,
      hatTermin,
      angebotFlowSnapshot,
      openHandwerkerEinholen,
      openAngebotAnKunde,
    ]
  )

  const offeneSchritteCount = useMemo(
    () => naechsteSchritte.filter((s) => !s.done).length,
    [naechsteSchritte]
  )

  const detailHeadMenuItems = useMemo(
    () =>
      listEntityMenuItems(
        'anfrage',
        {
          name: leadKontaktAnzeigeName(lead),
          tel: lead.kontakt_telefon,
          status: lead.status,
        },
        {
          onEdit: () => setBearbeitenOpen(true),
          onStatus: (kind) => setStatusModalKind(kind),
          onAngebot: openAngebotErstellen,
          tel: lead.kontakt_telefon,
          onDelete: () => {
            startTransition(async () => {
              const r = await deleteAnfrage(lead.id)
              if (!r.ok) {
                toast.error(r.message)
                return
              }
              toast.success('Anfrage gelöscht')
              router.push('/anfragen')
              refresh()
            })
          },
          deleteLabel: leadKontaktAnzeigeName(lead),
          extra: [
            {
              icon: 'mail',
              label: 'E-Mail schreiben',
              hint: leadEmail?.trim() ? undefined : 'E-Mail im Modal eintragen',
              onClick: () => mailCompose.openCompose(() => mailComposeContextFromLead(lead.id)),
            },
            ...(lead.anlass === 'meldung'
              ? [
                  {
                    icon: 'briefcase',
                    label: 'Als Projekt weiterführen',
                    onClick: () => {
                      startTransition(async () => {
                        const r = await weiterfuehrenAlsProjekt(lead.id)
                        if (!r.ok) {
                          toast.error(r.message)
                          return
                        }
                        toast.success('Projekt-Anfrage angelegt')
                        router.push(`/anfragen/${r.id}`)
                      })
                    },
                  },
                ]
              : []),
          ],
        }
      ),
    [
      lead,
      leadEmail,
      mailCompose,
      openAngebotErstellen,
      refresh,
      router,
      startTransition,
    ]
  )

  const headMeta = (
    <DetailMetaRow>
      {lead.created_at ? (
        <DetailMetaChip icon={Calendar}>
          Anfrage vom {formatDatum(lead.created_at)}
        </DetailMetaChip>
      ) : null}
      {lead.plz?.trim() ? <DetailMetaChip icon={MapPin}>{lead.plz.trim()}</DetailMetaChip> : null}
      {lead.kanal ? <KanalBadge kanal={lead.kanal} /> : null}
    </DetailMetaRow>
  )

  const objekteCard =
    zeigeObjekteCard && kundeIdFuerObjekte ? (
      <KundenObjekteCard
        key={kundeIdFuerObjekte}
        kundeId={kundeIdFuerObjekte}
        objekte={objekteListe}
        selectedId={lead.kunde_objekt_id}
        onSelect={waehleLeadObjekt}
        onChanged={() => refresh()}
      />
    ) : null

  const timelineTab = (
    <>
      <Timeline items={timelineItems} />
      <EmailLogPreviewModal
        emailLogId={emailPreviewId}
        open={Boolean(emailPreviewId)}
        onClose={() => setEmailPreviewId(null)}
      />
    </>
  )

  const hatKiVertrieb = leadHatKiVertriebsDaten(lead)

  const projektuebersichtCards = (
    <>
      {hatKiVertrieb ? <LeadGptStudioBlock lead={lead} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <PipelineKontextBadge lead={lead} />
        {lead.duplikat_hinweis ? (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
            Mögliches Duplikat — ähnliche Meldung kürzlich am gleichen Objekt
          </span>
        ) : null}
      </div>
      <PortalSyncWarning lead={lead} auftragStatus={dbAuftragStatus} />
      <CrmPortalOpenButtons
        kundeId={lead.auftraggeber_kunde_id ?? undefined}
        leadId={lead.id}
        showKunde={Boolean(lead.auftraggeber_kunde_id)}
        showMieter
      />
      <LeadOrgKontextBlock lead={lead} objektAkteReadOnly={objektAkteReadOnly} />
      <LeadFunnelProjektAnzeige
        lead={lead}
        gewerke={wizardGewerke}
        preislisten={wizardPreislisten}
        onSaved={() => refresh()}
      />
      {objekteCard}
      {isEchterFreitext(lead.kontakt_nachricht) ? (
        <Card title="Nachricht vom Kunden">
          <p className="text-[13px] leading-relaxed text-bw-text-muted">{lead.kontakt_nachricht}</p>
        </Card>
      ) : null}
    </>
  )

  const stammdatenInhalt = (
    <div className="space-y-3">
      {stammdatenCard}
      <KommunikationCard filter={{ leadId: lead.id }} reloadKey={mailCompose.reloadKey + generation} />
      <LeadTermineCard
        leadId={lead.id}
        termine={lead.kalender_termine as KalenderTermin[] | null | undefined}
        notizen={notizenRows}
        onReload={() => refresh()}
      />
    </div>
  )

  const schritteInhalt = (
    <LeadNaechsteSchritteCard steps={naechsteSchritte} />
  )

  const verlaufInhalt = (
    <div className="space-y-3">
      {offeneSchritteCount > 0 ? schritteInhalt : null}
      <MockVerlaufCard>{timelineTab}</MockVerlaufCard>
    </div>
  )

  const anfrageDetailGroups = [
    {
      id: 'stammdaten',
      label: ENTITY_DETAIL_TAB_LABELS.stammdaten,
      icon: 'clipboard-list',
      render: () => stammdatenInhalt,
    },
    {
      id: 'details',
      label: ENTITY_DETAIL_TAB_LABELS.details,
      icon: 'layers',
      count: posBoardPositionen.length || undefined,
      render: () => (
        <EntityDetailsTab
          projektKontext={projektKontext}
          positionen={posBoardPositionen}
          overview={projektuebersichtCards}
        />
      ),
    },
    {
      id: 'verlauf',
      label: ENTITY_DETAIL_TAB_LABELS.verlauf,
      icon: 'history',
      count: (offeneSchritteCount + timelineItems.length) || undefined,
      render: () => verlaufInhalt,
    },
    {
      id: 'dokumente',
      label: ENTITY_DETAIL_TAB_LABELS.dokumente,
      icon: 'files',
      count: dokumenteCount || undefined,
      render: () => (
        <MockDokumenteCard>
          <AnfrageDokumenteTab
            leadId={lead.id}
            dokumente={dokumenteRows}
            angebote={angeboteListe}
            onReload={() => refresh()}
          />
        </MockDokumenteCard>
      ),
    },
    {
      id: 'notizen',
      label: ENTITY_DETAIL_TAB_LABELS.notizen,
      icon: 'messages',
      count: notizenRows.length || undefined,
      render: () => (
        <LeadNotizenListeTab leadId={lead.id} notizen={notizenRows} onReload={() => refresh()} />
      ),
    },
  ]

  const kiAnalyseCard =
    !hatKiVertrieb && lead.ki_zusammenfassung?.trim() ? (
      <details className="group rounded-lg border border-[#2E7D52] bg-[#EAF3DE]">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-[#2E7D52] marker:content-none [&::-webkit-details-marker]:hidden">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          KI Vertriebs-Analyse
        </summary>
        <p className="whitespace-pre-wrap border-t border-[#2E7D52]/25 px-4 pb-3.5 pt-2 text-[13px] leading-relaxed text-[#1A3D2B]">
          {lead.ki_zusammenfassung.trim()}
        </p>
      </details>
    ) : null

  const main = <MockDetailShell defaultGroup="stammdaten" groups={anfrageDetailGroups} />

  return (
    <EntityDetailLayout
      resolvedVorgang={resolvedVorgang}
      phase="anfrage"
      breadcrumbTitle={kundenName(lead)}
      head={{
        backHref,
        backLabel,
        title: kundenName(lead),
        badges: (() => {
          const s = anfrageStatusDisplay(lead.status)
          return <StatusBadge label={s.label} variant={s.variant} />
        })(),
        meta: headMeta,
        actions: (
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm inline-flex flex-1 gap-1.5 sm:flex-none md:flex-none"
              onClick={primaryCtaAction}
            >
              {primaryCtaLabel}
              <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </button>
            {auftragId ? (
              <Link
                href={`/auftraege/${auftragId}`}
                className="btn btn-secondary btn-sm inline-flex shrink-0 gap-1.5 md:btn-ghost"
              >
                <Briefcase className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Auftrag</span>
              </Link>
            ) : null}
            <ActionsMenu
              trigger={
                <button
                  type="button"
                  className="btn btn-secondary btn-sm inline-flex shrink-0 gap-1.5 px-2.5 max-md:btn-ghost max-md:px-2"
                  aria-label="Weitere Aktionen"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                  <span className="sr-only sm:not-sr-only">Mehr</span>
                </button>
              }
              items={detailHeadMenuItems}
              sheetTitle="Anfrage"
            />
          </>
        ),
      }}
    >

      {projektKontext ? <ProjektKette kontext={projektKontext} /> : null}

      {kiAnalyseCard}

      {main}

      {angebotWizardOpen ? (
        <AngebotWizard
          key={wizardSessionKey}
          lead={lead}
          gewerke={wizardGewerke}
          preislisten={wizardPreislisten}
          handwerker={wizardHandwerker}
          firm={wizardFirm}
          kundenObjekte={objekteListe}
          bootstrap={angebotWizardBootstrap}
          onClose={closeAngebotWizard}
          onSaved={() => refresh()}
          onDone={() => {
            closeAngebotWizard()
            refresh()
          }}
        />
      ) : null}

      <AngebotAuswahlModal
        open={angebotAuswahlOpen}
        onClose={() => setAngebotAuswahlOpen(false)}
        leadId={lead.id}
        angebote={angeboteListe}
        onNeuesAngebot={() => {
          setAngebotAuswahlOpen(false)
          openAngebotWizard(null)
        }}
        onWeiterbearbeiten={(bootstrap) => {
          setAngebotAuswahlOpen(false)
          openAngebotWizard(bootstrap)
        }}
        onKopie={(bootstrap) => {
          setAngebotAuswahlOpen(false)
          openAngebotWizard(bootstrap)
        }}
      />

      <AnfrageNeuSheet
        open={bearbeitenOpen}
        onClose={() => setBearbeitenOpen(false)}
        bearbeitenLead={lead}
        onSuccess={() => {
          setBearbeitenOpen(false)
          refresh()
        }}
      />

      <StatusModal
        kind={statusModalKind}
        open={statusModalKind != null}
        lead={lead}
        onClose={() => setStatusModalKind(null)}
        onSaved={() => {
          setStatusModalKind(null)
          refresh()
        }}
      />

      {kunde ? (
        <KundeModal
          open={stammdatenModalOpen}
          onClose={() => setStammdatenModalOpen(false)}
          editKunde={kunde}
          leadFunnelDaten={lead.funnel_daten}
          stayOnPage
          revalidateAnfrageId={lead.id}
          onSaved={() => {
            toast.success('Stammdaten gespeichert')
            refresh()
          }}
        />
      ) : null}

      {mailCompose.modal}
    </EntityDetailLayout>
  )
}
