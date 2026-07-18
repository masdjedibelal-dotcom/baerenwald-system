'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { hubSpotStatusToMockBadgeKind, variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
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
import { AnfrageNotizenTab } from '@/components/anfragen/AnfrageNotizenTab'
import { AnfrageDokumenteTab } from '@/components/anfragen/AnfrageDokumenteTab'
import { AngebotAuswahlModal } from '@/components/angebote/AngebotAuswahlModal'
import { PipelineKontextBadge } from '@/components/anfragen/PipelineKontextBadge'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { AnfrageNeuSheet } from '@/components/anfragen/AnfrageNeuSheet'
import { AnfrageStammdatenCard } from '@/components/anfragen/AnfrageStammdatenCard'
import { HvMeldungKontextCards } from '@/components/anfragen/HvMeldungKontextCards'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { acceptAngebotAndCreateAuftrag } from '@/app/(dashboard)/angebote/angebot-flow-actions'

const AngebotWizard = dynamic(
  () =>
    import('@/components/angebote/AngebotWizard').then((mod) => ({
      default: mod.AngebotWizard,
    })),
  { ssr: false }
)
import { toast } from '@/components/ui/app-toast'
import { deleteAnfrage } from '@/app/(dashboard)/anfragen/actions'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { openMieterStatusPreview } from '@/app/(dashboard)/impersonation/actions'
import { MockVerlaufCard } from '@/components/mock-ui'
import { ACTIVITY_SECTIONS, CTA } from '@/lib/crm-labels'
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
  BEREICH_LABELS,
  STATUS_LABELS,
  formatDatum,
  formatTimelineStamp,
  kanalLabel,
} from '@/lib/utils'

type AnfrageDetailTab = 'stammdaten' | 'details' | 'verlauf' | 'dokumente' | 'notizen'

const ANFRAGE_DETAIL_TAB_IDS = new Set<AnfrageDetailTab>([
  'stammdaten',
  'details',
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
  if (tab === 'projekt') return 'details'
  if (tab === 'timeline') return 'verlauf'
  if (ANFRAGE_DETAIL_TAB_IDS.has(tab as AnfrageDetailTab)) return tab as AnfrageDetailTab
  return null
}

function kundenName(lead: LeadDetail) {
  return leadKontaktAnzeigeName(lead)
}

function leadProjektMetaLabel(lead: LeadDetail): string {
  const bereiche = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  if (bereiche.length) {
    return bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
  }
  const sit = leadSituationDisplay(lead.situation)
  if (sit) return sit
  return 'Anfrage'
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
  projektKontext,
  dbAuftragId = null,
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
  projektKontext?: ProjektKontext
  dbAuftragId?: string | null
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

  const [tab, setTab] = useState<AnfrageDetailTab>('stammdaten')
  const isCrmAdmin = useIsCrmAdmin()
  const [impersonating, setImpersonating] = useState(false)
  const [portalLinkModalOpen, setPortalLinkModalOpen] = useState(false)

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

  const leadEmail = lead.kunden?.email ?? lead.kontakt_email ?? null
  const leadTelefon = (lead.kunden?.telefon ?? lead.kontakt_telefon ?? '').trim()
  const kundeId = lead.kunde_id ?? lead.kunden?.id ?? null
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
    Boolean(angebotFlowSnapshot?.angebotAnKundeGesendet) &&
    Boolean(angebotFlowSnapshot?.angebotId) &&
    !auftragId

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
          onPortal: () => {
            if (!isCrmAdmin) {
              toast.error('Admin Login nur für CRM-Admins')
              return
            }
            if (impersonating) return
            setImpersonating(true)
            void openMieterStatusPreview(lead.id).then((r) => {
              setImpersonating(false)
              if (!r.ok) {
                toast.error(r.message)
                return
              }
              window.open(r.url, '_blank', 'noopener,noreferrer')
            })
          },
          onPortalLink: () => {
            if (!kundeId) {
              toast.error('Kein Kunde verknüpft — Portal-Link nicht möglich.')
              return
            }
            setPortalLinkModalOpen(true)
          },
          onStatus: (k) => setStatusModalKind(k),
          onAngebot: () => {
            if (hasAngebote) setAngebotAuswahlOpen(true)
            else openAngebotErstellen()
          },
          tel: leadTelefon || null,
          mail: leadEmail?.trim() || null,
          onCall: leadTelefon
            ? () => {
                window.location.href = `tel:${leadTelefon.replace(/\s/g, '')}`
              }
            : undefined,
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
    leadTelefon,
    mailCompose,
    openAngebotErstellen,
    hasAngebote,
    router,
    startTransition,
    isCrmAdmin,
    impersonating,
    refresh,
    kundeId,
  ])

  const projektMetaLabel = useMemo(() => leadProjektMetaLabel(lead), [lead])

  const headMeta = (
    <>
      <span>{projektMetaLabel}</span>
      {lead.created_at ? (
        <>
          <span className="sep" aria-hidden>
            ·
          </span>
          <span>Eingang {formatDatum(lead.created_at)}</span>
        </>
      ) : null}
    </>
  )

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
    <AnfrageDetailsTab lead={lead} gewerke={wizardGewerke} onSaved={() => refresh()} />
  )

  const notizenInhalt = (
    <AnfrageNotizenTab leadId={lead.id} notizen={notizenRows} onReload={() => refresh()} />
  )

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'stammdaten',
      label: 'Stammdaten',
      icon: 'clipboard-list',
      render: () => stammdatenInhalt,
    },
    {
      id: 'details',
      label: 'Details',
      icon: 'list-details',
      render: () => detailsInhalt,
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
      breadcrumbTitle={kundenName(lead)}
      crumbBackHref="/vorgaenge?tab=anfrage"
      crumbBackLabel="Zurück zu den Vorgängen"
      head={{
        title: kundenName(lead),
        badges: (
          <span className="inline-flex flex-wrap items-center gap-2">
            {(() => {
              const s = anfrageStatusDisplay(lead.status)
              if (lead.status === 'angebot') {
                return <MockBadge kind={hubSpotStatusToMockBadgeKind('offer')}>{s.label}</MockBadge>
              }
              return <MockBadge kind={variantToMockBadgeKind(s.variant)}>{s.label}</MockBadge>
            })()}
            <PipelineKontextBadge
              lead={{
                kanal: lead.kanal,
                auftraggeber_kunde_id: lead.auftraggeber_kunde_id,
                anlass: lead.anlass,
              }}
            />
          </span>
        ),
        meta: headMeta,
        actions: (
          <div className="flex w-full flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn primary sm inline-flex flex-1 gap-1.5 sm:flex-none"
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

      {mailCompose.modal}
      </div>
    </EntityDetailLayout>
  )
}
