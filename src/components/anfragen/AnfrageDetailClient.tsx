'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { leadAngebotFunnelFromListe } from '@/lib/lead-angebot-funnel'
import {
  leadKontaktAnzeigeName,
  leadVertragsKundeId,
} from '@/lib/lead-display-helpers'
import { Timeline } from '@/components/ui/timeline'
import { sortTimelineByCreatedAtAsc } from '@/lib/timeline-sort'
import { anfrageStatusDisplay } from '@/lib/status/status-display'
import { StatusModal, type StatusModalKind } from '@/components/anfragen/StatusModal'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { buildEntityMenu, entityMenuToActionItems } from '@/lib/entity-menu'
import { runDuplicateAnfrage } from '@/lib/list-actions'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromLead } from '@/app/(dashboard)/kommunikation/actions'
import { AnfrageDetailsTab } from '@/components/anfragen/AnfrageDetailsTab'
import { VorgangFotosTab } from '@/components/crm/VorgangFotosTab'
import { resolveCumulativeDetailTabAlias } from '@/lib/entity-detail/cumulative-detail-tabs'
import { AnfrageNotizenTab } from '@/components/anfragen/AnfrageNotizenTab'
import { AnfrageDokumenteTab } from '@/components/anfragen/AnfrageDokumenteTab'
import { fachbegriff } from '@/lib/crm/fachbegriffe'
import { naechsterSchrittAnfrage } from '@/lib/crm/naechster-schritt'
import { AngebotAuswahlModal } from '@/components/angebote/AngebotAuswahlModal'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { AnfrageNeuSheet } from '@/components/anfragen/AnfrageNeuSheet'
import { AnfrageStammdatenCard } from '@/components/anfragen/AnfrageStammdatenCard'
import { EmpfohleneHandwerkerCard } from '@/components/anfragen/EmpfohleneHandwerkerCard'
import {
  LeadGptStudioBlock,
  leadHatKiVertriebsDaten,
} from '@/components/anfragen/LeadGptStudioBlock'
import { HvMeldungKontextCards } from '@/components/anfragen/HvMeldungKontextCards'
import { NotfallDirektBeauftragenModal } from '@/components/auftraege/NotfallDirektBeauftragenModal'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { situationBereichTitel } from '@/lib/vorgang/vorgang-anzeige-titel'
import type { EmpfohlenerHandwerker } from '@/lib/empfohlene-handwerker'
import { acceptAngebotAndCreateAuftrag } from '@/app/(dashboard)/angebote/angebot-flow-actions'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'

const AngebotWizard = dynamic(
  () =>
    import('@/components/angebote/AngebotWizard').then((mod) => ({
      default: mod.AngebotWizard,
    })),
  {
    ssr: false,
    loading: () => <CrmInlineLoading label="Angebot-Assistent wird geladen …" minHeight={120} />,
  }
)
import { toast } from '@/components/ui/app-toast'
import { deleteAnfrage } from '@/app/(dashboard)/anfragen/actions'
import { MockVerlaufCard } from '@/components/mock-ui'
import { ACTIVITY_SECTIONS, CTA } from '@/lib/crm-labels'
import { collectVorgangFotos } from '@/lib/vorgang/vorgang-fotos'
import { loadAngebotWizardBootstrapKopie } from '@/app/(dashboard)/angebote/wizard-actions'
import { ergaenzeTimelineMitProjektKontext } from '@/lib/crm/build-projekt-timeline'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type {
  Gewerk,
  Handwerker,
  KalenderTermin,
  KundenObjekt,
  LeadDetail,
  LeadNotizRow,
  Preisliste,
} from '@/lib/types'
import {
  STATUS_LABELS,
  formatDatum,
  formatTimelineStamp,
  kanalLabel,
} from '@/lib/utils'

type AnfrageDetailTab = 'stammdaten' | 'details' | 'fotos' | 'verlauf' | 'dokumente' | 'notizen'

const ANFRAGE_DETAIL_TAB_IDS = new Set<AnfrageDetailTab>([
  'stammdaten',
  'details',
  'fotos',
  'verlauf',
  'dokumente',
  'notizen',
])

/** Query-/Hash-/Deep-Link-Aliase auf stabile interne IDs. */
function resolveAnfrageDetailTabFromQuery(raw: string | null): AnfrageDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase().replace(/^#/, '')
  if (!tab) return null
  if (tab === 'schritte' || tab === 'naechste-schritte' || tab === 'naechste_schritte') {
    return 'stammdaten'
  }
  if (tab === 'projekt' || tab === 'anfrage-details' || tab === 'anfragedetails') return 'details'
  if (tab === 'timeline') return 'verlauf'
  if (tab === 'bilder' || tab === 'photos') return 'fotos'
  const cumulative = resolveCumulativeDetailTabAlias(tab)
  if (cumulative === 'anfrage-details') return 'details'
  if (ANFRAGE_DETAIL_TAB_IDS.has(tab as AnfrageDetailTab)) return tab as AnfrageDetailTab
  return null
}

function kundenName(lead: LeadDetail) {
  return leadKontaktAnzeigeName(lead)
}

function leadVorhabenTitel(lead: LeadDetail): string {
  return (
    situationBereichTitel(lead.situation, bereicheFuerAnzeige(lead.bereiche, lead.situation)) ||
    'Anfrage'
  )
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
  angebotKopieVonQuelleId,
  angebotFlowSnapshot = null,
  angeboteAuswahlInitial = false,
  angebotWizardInitial = false,
  angebotWizardInitialStep = null,
  angebotWizardFocus = null,
  projektKontext,
  dbAuftragId = null,
  empfohleneHandwerker = [],
}: {
  lead: LeadDetail
  angeboteListe?: AngebotKurz[]
  wizardGewerke?: Gewerk[]
  wizardPreislisten?: Preisliste[]
  wizardFirm?: FirmenEinstellungen
  wizardHandwerker?: Handwerker[]
  kundenObjekte?: KundenObjekt[]
  /** Server: beim Aufruf mit ?angebot_kopie_von= wird der Wizard als 1:1-Kopie geöffnet. */
  angebotKopieVonQuelleId?: string
  angebotFlowSnapshot?: AnfrageAngebotFlowSnapshot | null
  /** z. B. Redirect von /anfragen/[id]/angebote — Modal sofort öffnen */
  angeboteAuswahlInitial?: boolean
  /** z. B. nach Kunden-Aktion oder ?ziel=angebot — Wizard sofort öffnen */
  angebotWizardInitial?: boolean
  /** Deep-Link ?wizard_step= */
  angebotWizardInitialStep?: number | null
  /** Deep-Link ?focus= */
  angebotWizardFocus?: string | null
  projektKontext?: ProjektKontext
  dbAuftragId?: string | null
  empfohleneHandwerker?: EmpfohlenerHandwerker[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  const [tab, setTab] = useState<AnfrageDetailTab>('details')
  const [portalLinkModalOpen, setPortalLinkModalOpen] = useState(false)
  const [notfallModalOpen, setNotfallModalOpen] = useState(false)

  useEffect(() => {
    const fromQuery = resolveAnfrageDetailTabFromQuery(searchParams.get('tab'))
    if (fromQuery) {
      setTab(fromQuery)
      return
    }
    if (typeof window !== 'undefined') {
      const fromHash = resolveAnfrageDetailTabFromQuery(window.location.hash)
      if (fromHash) setTab(fromHash)
    }
  }, [searchParams])

  useEffect(() => {
    setLead(initial)
  }, [initial.id])

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
    type Row = {
      id: string
      text: string
      time: string
      state: 'done' | 'open' | 'active'
      ts: number
    }

    const fromEvents: Row[] = timelineSorted.map((ev) => ({
      id: ev.id,
      text: ev.beschreibung ? `${ev.titel} — ${ev.beschreibung}` : ev.titel,
      time: formatTimelineStamp(ev.created_at),
      state: 'done',
      ts: new Date(ev.created_at).getTime(),
    }))
    const fromHistory: Row[] = history.map((h) => ({
      id: h.id,
      text:
        h.status_alt != null
          ? `Status: ${STATUS_LABELS[h.status_alt]} → ${STATUS_LABELS[h.status_neu]}`
          : `Status: ${STATUS_LABELS[h.status_neu]}`,
      time: formatTimelineStamp(h.created_at),
      state: 'done',
      ts: new Date(h.created_at).getTime(),
    }))
    let basis: Row[] = [...fromEvents, ...fromHistory].sort((a, b) => a.ts - b.ts)

    if (basis.length === 0 && lead.created_at) {
      basis = [
        {
          id: 'lead-eingang',
          text: `Lead eingegangen — ${kanalLabel(lead.kanal)}`,
          time: formatTimelineStamp(lead.created_at),
          state: 'done',
          ts: new Date(lead.created_at).getTime(),
        },
      ]
    }

    let merged: Row[] = basis
    if (projektKontext) {
      const enriched = ergaenzeTimelineMitProjektKontext(
        basis.map((b) => ({
          id: b.id,
          ts: b.ts,
          text: b.text,
          time: b.time,
          state: b.state === 'active' ? 'active' : 'done',
        })),
        projektKontext
      )
      merged = enriched.map((item) => ({
        id: item.id,
        text: item.text,
        time: item.time,
        state: item.state,
        ts: item.ts,
      }))
    }

    const hasAngebote = angeboteListe.length > 0
    const anKundeGesendet = Boolean(angebotFlowSnapshot?.angebotAnKundeGesendet)
    const hatAuftrag = Boolean(leadStatusData.auftrag_id)
    const openSteps: Row[] = []
    if (!hatAuftrag) {
      if (!hasAngebote || !anKundeGesendet) {
        openSteps.push({
          id: 'open-angebot',
          text: 'Angebot erstellen',
          time: 'offen',
          state: 'open',
          ts: Number.MAX_SAFE_INTEGER - 1,
        })
      }
      openSteps.push({
        id: 'open-auftrag',
        text: 'Auftragsbestätigung',
        time: 'offen',
        state: 'open',
        ts: Number.MAX_SAFE_INTEGER,
      })
    }

    return [...merged, ...openSteps].map(({ ts: _ts, ...rest }) => rest)
  }, [
    timelineSorted,
    history,
    projektKontext,
    lead.created_at,
    lead.kanal,
    angeboteListe.length,
    angebotFlowSnapshot?.angebotAnKundeGesendet,
    leadStatusData.auftrag_id,
  ])

  const dokumenteRows = useMemo(() => {
    const raw = lead.lead_dokumente
    if (!Array.isArray(raw)) return []
    return [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [lead.lead_dokumente])

  const dokumenteCount = useMemo(
    () => dokumenteRows.length + angeboteListe.length,
    [dokumenteRows.length, angeboteListe.length]
  )

  const vorgangFotos = useMemo(
    () => collectVorgangFotos({ funnelDaten: lead.funnel_daten }),
    [lead.funnel_daten]
  )

  const leadEmail =
    lead.auftraggeber?.email?.trim() ||
    lead.kunden?.email ||
    lead.kontakt_email ||
    null
  const kundeId = leadVertragsKundeId(lead)
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
    setAngebotAuswahlOpen(true)
  }, [angeboteListe.length, openAngebotWizard])

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

  const canAcceptAngebot =
    Boolean(angebotFlowSnapshot?.angebotId) && !auftragId

  const primaryCtaLabel = canAcceptAngebot ? CTA.angebotAnnehmen : CTA.angebotErstellen
  const primaryCtaIcon = canAcceptAngebot ? 'check' : 'file-invoice'

  const primaryCtaAction = useCallback(() => {
    if (canAcceptAngebot && angebotFlowSnapshot?.angebotId) {
      const angebotId = angebotFlowSnapshot.angebotId
      startTransition(async () => {
        const start = new Date().toISOString().slice(0, 10)
        const res = await acceptAngebotAndCreateAuftrag(angebotId, {
          start_datum: start,
          send_kunden_email: false,
        })
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        toast.success('Auftrag erstellt')
        router.push(`/auftraege/${res.auftragId}`)
        refresh()
      })
      return
    }
    openAngebotErstellen()
  }, [
    canAcceptAngebot,
    angebotFlowSnapshot?.angebotId,
    openAngebotErstellen,
    router,
    refresh,
    startTransition,
  ])

  const closeAngebotWizard = useCallback(() => {
    setAngebotWizardOpen(false)
    setAngebotWizardBootstrap(null)
  }, [])

  const detailHeadMenuItems = useMemo(() => {
    return entityMenuToActionItems(
      buildEntityMenu(
        'anfrage',
        { name: kundenName(lead), status: lead.status },
        {
          onEdit: () => setBearbeitenOpen(true),
          onCopy: () => runDuplicateAnfrage(lead.id, router),
          // Admin Login nur Partner-/Kunden-Detail (UX2-6)
          onPortalLink: () => {
            if (!kundeId) {
              toast.error('Kein Kunde verknüpft — Portal-Link nicht möglich.')
              return
            }
            setPortalLinkModalOpen(true)
          },
          onStatus: (k) => setStatusModalKind(k),
          // Notfall + Angebot: Header-CTAs — nicht nochmal im Menü
          mail: leadEmail?.trim() || null,
          onMail: () => mailCompose.openCompose(() => mailComposeContextFromLead(lead.id)),
          onDelete: () => {
            startTransition(async () => {
              const r = await deleteAnfrage(lead.id)
              if (!r.ok) {
                toast.error(r.message)
                return
              }
              toast.success('Anfrage gelöscht')
              router.push('/vorgaenge?tab=anfrage')
              refresh()
            })
          },
          deleteLabel: kundenName(lead),
        }
      ),
      (n, size) => mockMenuIcon(n as Parameters<typeof mockMenuIcon>[0], size)
    )
  }, [
    lead,
    leadEmail,
    mailCompose,
    router,
    startTransition,
    refresh,
    kundeId,
  ])

  const vorhabenTitel = useMemo(() => leadVorhabenTitel(lead), [lead])

  const headMeta = kundenName(lead)

  const timelineTab = (
    <MockVerlaufCard empty={timelineItems.length === 0}>
      <Timeline items={timelineItems} />
    </MockVerlaufCard>
  )

  const stammdatenInhalt = (
    <>
      <HvMeldungKontextCards lead={lead} />
      <AnfrageStammdatenCard lead={lead} onSaved={() => refresh()} />
    </>
  )

  const detailsInhalt = (
    <>
      <AnfrageDetailsTab lead={lead} onSaved={() => refresh()} />
      <EmpfohleneHandwerkerCard handwerker={empfohleneHandwerker} />
    </>
  )

  const notizenInhalt = (
    <AnfrageNotizenTab leadId={lead.id} notizen={notizenRows} onReload={() => refresh()} />
  )

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'details',
      label: 'Bedarf',
      icon: 'list-details',
      render: () => detailsInhalt,
    },
    {
      id: 'stammdaten',
      label: 'Stammdaten',
      icon: 'clipboard-list',
      render: () => stammdatenInhalt,
    },
    {
      id: 'fotos',
      label: ACTIVITY_SECTIONS.fotos,
      icon: 'photo',
      count: vorgangFotos.length || undefined,
      render: () => <VorgangFotosTab fotos={vorgangFotos} />,
    },
    {
      id: 'verlauf',
      label: ACTIVITY_SECTIONS.verlauf,
      icon: 'history',
      count: timelineItems.length || undefined,
      render: () => timelineTab,
    },
    {
      id: 'dokumente',
      label: ACTIVITY_SECTIONS.dokumente,
      icon: 'files',
      count: dokumenteCount || undefined,
      render: () => (
        <AnfrageDokumenteTab
          leadId={lead.id}
          dokumente={dokumenteRows}
          angebote={angeboteListe}
          onReload={() => refresh()}
        />
      ),
    },
    {
      id: 'notizen',
      label: ACTIVITY_SECTIONS.notizen,
      icon: 'messages',
      count: notizenRows.length || undefined,
      render: () => notizenInhalt,
    },
  ]

  return (
    <EntityDetailLayout
      phase="anfrage"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=anfrage"
      crumbBackLabel="Zurück zu den Suchergebnissen"
      nextStep={naechsterSchrittAnfrage({
        status: lead.status,
        hasAngebote,
        canAcceptAngebot,
        hasAuftrag: Boolean(auftragId),
      })}
      head={{
        title: vorhabenTitel,
        badges: (() => {
          const s = anfrageStatusDisplay(lead.status, {
            orgFreigabeStatus: lead.org_freigabe_status,
          })
          return <MockBadge kind={variantToMockBadgeKind(s.variant)}>{s.label}</MockBadge>
        })(),
        meta: headMeta,
        actions: (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!auftragId ? (
              <button
                type="button"
                className="btn ghost sm inline-flex shrink-0 gap-1.5"
                onClick={() => setNotfallModalOpen(true)}
                disabled={pending}
                title={fachbegriff('notfall')}
              >
                <MockIcon ctx="btn" n="alert-triangle" size={14} />
                Notfall melden
              </button>
            ) : null}
            <button
              type="button"
              className="btn primary sm inline-flex shrink-0 gap-1.5"
              onClick={primaryCtaAction}
              disabled={pending}
            >
              <MockIcon ctx="btn" n={primaryCtaIcon} size={14} />
              {primaryCtaLabel}
            </button>
            <ActionsMenu
              trigger={
                <button type="button" className="qa-btn" aria-label="Weitere Aktionen" title="Aktionen">
                  <MockIcon ctx="btn" n="dots" size={18} />
                </button>
              }
              items={detailHeadMenuItems}
              sheetTitle="Anfrage"
            />
          </div>
        ),
      }}
    >
      <div className="space-y-4">
      {leadHatKiVertriebsDaten(lead) || lead.ki_zusammenfassung?.trim() ? (
        <LeadGptStudioBlock lead={lead} />
      ) : null}
      <DetailShell
        groups={detailShellGroups}
        value={tab}
        onChange={(id) => setTab(id as AnfrageDetailTab)}
      />

      {angebotWizardOpen ? (
        <AngebotWizard
          key={wizardSessionKey}
          lead={lead}
          gewerke={wizardGewerke}
          preislisten={wizardPreislisten}
          handwerker={wizardHandwerker}
          firm={wizardFirm}
          kundenObjekte={kundenObjekte}
          bootstrap={angebotWizardBootstrap}
          initialStep={angebotWizardInitialStep}
          focusField={angebotWizardFocus}
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

      <KundenportalLinkVersendenModal
        open={portalLinkModalOpen}
        onClose={() => setPortalLinkModalOpen(false)}
        kundeId={kundeId}
        fallbackEmail={leadEmail}
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

      <NotfallDirektBeauftragenModal
        open={notfallModalOpen}
        onClose={() => setNotfallModalOpen(false)}
        leadId={lead.id}
        variant="anfrage"
        gewerkName={
          bereicheFuerAnzeige(lead.bereiche, lead.situation)[0] ||
          lead.situation ||
          'Allgemein'
        }
        onDone={(id) => {
          router.push(`/auftraege/${id}`)
          refresh()
        }}
      />

      {mailCompose.modal}
      </div>
    </EntityDetailLayout>
  )
}
