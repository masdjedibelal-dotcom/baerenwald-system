'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailActionsBar } from '@/components/layout/DetailActionsBar'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { leadAngebotFunnelFromListe } from '@/lib/lead-angebot-funnel'
import {
  leadKontaktAnzeigeName,
  leadVertragsKundeId,
} from '@/lib/lead-display-helpers'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromLead } from '@/app/(dashboard)/kommunikation/actions'
import { AnfrageDetailsTab } from '@/components/anfragen/AnfrageDetailsTab'
import { StatusModal, type StatusModalKind } from '@/components/anfragen/StatusModal'
import { buildEntityMenu, entityMenuToActionItems } from '@/lib/entity-menu'
import { runDuplicateAnfrage } from '@/lib/list-actions'
import { VorgangFotosTab } from '@/components/crm/VorgangFotosTab'
import { resolveCumulativeDetailTabAlias } from '@/lib/entity-detail/cumulative-detail-tabs'
import { AnfrageNotizenTab } from '@/components/anfragen/AnfrageNotizenTab'
import { AnfrageDokumenteTab } from '@/components/anfragen/AnfrageDokumenteTab'
import { naechsterSchrittAnfrage } from '@/lib/crm/naechster-schritt'
import { AngebotAuswahlModal } from '@/components/angebote/AngebotAuswahlModal'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { AnfrageNeuSheet } from '@/components/anfragen/AnfrageNeuSheet'
import { AnfrageStammdatenCard } from '@/components/anfragen/AnfrageStammdatenCard'
import { HvMeldungKontextCards } from '@/components/anfragen/HvMeldungKontextCards'
import { NotfallDirektBeauftragenModal } from '@/components/auftraege/NotfallDirektBeauftragenModal'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import { VerlaufPanel } from '@/components/crm/VerlaufPanel'
import { ProjektHistorieTab } from '@/components/crm/ProjektHistorieTab'
import { buildLeadVerlaufItems, type VerlaufBuiltItem } from '@/lib/crm/verlauf'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { situationBereichTitel } from '@/lib/vorgang/vorgang-anzeige-titel'
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
import { ACTIVITY_SECTIONS, CTA } from '@/lib/crm-labels'
import { collectVorgangFotos } from '@/lib/vorgang/vorgang-fotos'
import { loadAngebotWizardBootstrapKopie } from '@/app/(dashboard)/angebote/wizard-actions'
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
import { formatDatum, kanalLabel } from '@/lib/utils'
import { anfrageStatusDisplay } from '@/lib/status/status-display'

type AnfrageDetailTab =
  | 'stammdaten'
  | 'details'
  | 'fotos'
  | 'verlauf'
  | 'historie'
  | 'dokumente'
  | 'notizen'

const ANFRAGE_DETAIL_TAB_IDS = new Set<AnfrageDetailTab>([
  'stammdaten',
  'details',
  'fotos',
  'verlauf',
  'historie',
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
  if (tab === 'historie' || tab === 'projekt-historie' || tab === 'phasen') return 'historie'
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

  const timelineItems = useMemo(() => {
    const base = buildLeadVerlaufItems(lead.lead_timeline ?? [], {
      fallbackCreatedAt: lead.created_at,
      fallbackCreatedLabel: `Lead eingegangen — ${kanalLabel(lead.kanal)}`,
    })

    const hasAngebote = angeboteListe.length > 0
    const anKundeGesendet = Boolean(angebotFlowSnapshot?.angebotAnKundeGesendet)
    const hatAuftrag = Boolean(leadStatusData.auftrag_id)
    const openSteps: VerlaufBuiltItem[] = []
    if (!hatAuftrag) {
      if (!hasAngebote || !anKundeGesendet) {
        openSteps.push({
          id: 'open-angebot',
          text: 'Angebot erstellen',
          time: 'offen',
          state: 'open',
          inspect: null,
          ts: Number.MAX_SAFE_INTEGER - 1,
          source: 'open',
        })
      }
      openSteps.push({
        id: 'open-auftrag',
        text: 'Auftragsbestätigung',
        time: 'offen',
        state: 'open',
        inspect: null,
        ts: Number.MAX_SAFE_INTEGER,
        source: 'open',
      })
    }

    return [...base, ...openSteps]
  }, [
    lead.lead_timeline,
    lead.created_at,
    lead.kanal,
    angeboteListe.length,
    angebotFlowSnapshot?.angebotAnKundeGesendet,
    leadStatusData.auftrag_id,
  ])

  const notizenRows = useMemo(() => {
    const raw = lead.lead_notizen
    if (!Array.isArray(raw)) return [] as LeadNotizRow[]
    return [...raw].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [lead.lead_notizen])

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

  const timelineTab = <VerlaufPanel items={timelineItems} />

  const stammdatenInhalt = (
    <>
      <HvMeldungKontextCards lead={lead} />
      <AnfrageStammdatenCard lead={lead} onSaved={() => refresh()} />
    </>
  )

  const detailsInhalt = (
    <AnfrageDetailsTab lead={lead} onSaved={() => refresh()} />
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
      id: 'historie',
      label: 'Historie',
      icon: 'list-details',
      render: () => <ProjektHistorieTab kontext={projektKontext} />,
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
          <DetailActionsBar
            sheetTitle="Anfrage"
            primary={{
              label: primaryCtaLabel,
              icon: primaryCtaIcon,
              onClick: primaryCtaAction,
              disabled: pending,
            }}
            secondary={
              !auftragId
                ? {
                    label: 'Notfall melden',
                    icon: 'alert-triangle',
                    onClick: () => setNotfallModalOpen(true),
                    disabled: pending,
                  }
                : null
            }
            menuItems={detailHeadMenuItems}
          />
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
