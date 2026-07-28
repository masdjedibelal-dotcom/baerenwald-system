'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { primaryCta } from '@/lib/vorgang/primary-cta'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailActionsBar } from '@/components/layout/DetailActionsBar'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { ZugehoerigListe } from '@/components/vorgang/ZugehoerigListe'
import { PhaseCardsBlock } from '@/components/vorgang/PhaseCard'
import { DetailSection } from '@/components/vorgang/DetailSection'
import { VorgangAkteTab } from '@/components/vorgang/VorgangAkteTab'
import { isLegacyDetailTabAlias } from '@/lib/vorgang/detail-tab-helpers'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { leadAngebotFunnelFromListe } from '@/lib/lead-angebot-funnel'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromLead } from '@/app/(dashboard)/kommunikation/actions'
import { AnfrageDetailsTab } from '@/components/anfragen/AnfrageDetailsTab'
import { LeistungenTab, leistungenFromAnfrage } from '@/components/leistungen'
import { AnfrageZahlungTab } from '@/components/anfragen/AnfrageZahlungTab'
import { StatusModal, type StatusModalKind } from '@/components/anfragen/StatusModal'
import { DuplikatBand } from '@/components/anfragen/DuplikatBand'
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
import { VerlaufPanel } from '@/components/crm/VerlaufPanel'
import { ProjektHistorieTab } from '@/components/crm/ProjektHistorieTab'
import { buildLeadVerlaufItems, type VerlaufBuiltItem } from '@/lib/crm/verlauf'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { situationBereichTitel } from '@/lib/vorgang/vorgang-anzeige-titel'
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
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'
import { entityDetailTabLabel } from '@/lib/entity-detail/entity-detail-tabs'
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
import { hatOffenenVergangenenKalenderTermin } from '@/lib/kalender/termin-no-show-hint'

type AnfrageDetailTab = 'uebersicht' | 'leistungen' | 'zahlung' | 'akte' | 'aktivitaet'

const ANFRAGE_DETAIL_TAB_IDS = new Set<AnfrageDetailTab>([
  'uebersicht',
  'leistungen',
  'zahlung',
  'akte',
  'aktivitaet',
])
const ANFRAGE_DETAIL_DEFAULT_TAB: AnfrageDetailTab = 'leistungen'

/** Query-/Hash-/Deep-Link-Aliase auf stabile interne IDs. */
function resolveAnfrageDetailTabFromQuery(raw: string | null): AnfrageDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase().replace(/^#/, '')
  if (!tab) return ANFRAGE_DETAIL_DEFAULT_TAB
  if (tab === 'zahlung' || tab === 'zahlplan' || tab === 'finanzen') return 'zahlung'
  if (
    tab === 'leistungen' ||
    tab === 'leistung' ||
    tab === 'bedarf' ||
    tab === 'positionen'
  ) {
    return 'leistungen'
  }
  if (
    tab === 'akte' ||
    tab === 'dokumente' ||
    tab === 'notizen'
  ) {
    return 'akte'
  }
  if (
    tab === 'uebersicht' ||
    tab === 'stammdaten' ||
    tab === 'schritte' ||
    tab === 'naechste-schritte' ||
    tab === 'naechste_schritte' ||
    tab === 'details' ||
    tab === 'projekt' ||
    tab === 'anfrage-details' ||
    tab === 'anfragedetails' ||
    tab === 'fotos' ||
    tab === 'bilder' ||
    tab === 'photos'
  ) {
    return 'uebersicht'
  }
  if (
    tab === 'aktivitaet' ||
    tab === 'verlauf' ||
    tab === 'timeline' ||
    tab === 'historie' ||
    tab === 'projekt-historie' ||
    tab === 'phasen'
  ) {
    return 'aktivitaet'
  }
  const cumulative = resolveCumulativeDetailTabAlias(tab)
  if (cumulative === 'anfrage-details') return 'uebersicht'
  if (ANFRAGE_DETAIL_TAB_IDS.has(tab as AnfrageDetailTab)) return tab as AnfrageDetailTab
  return ANFRAGE_DETAIL_DEFAULT_TAB
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

  const [tab, setTab] = useState<AnfrageDetailTab>(ANFRAGE_DETAIL_DEFAULT_TAB)

  useEffect(() => {
    const raw = searchParams.get('tab')
    if (isLegacyDetailTabAlias(raw)) {
      const resolved = resolveAnfrageDetailTabFromQuery(raw) ?? 'uebersicht'
      const q = new URLSearchParams(searchParams.toString())
      q.set('tab', resolved)
      q.delete('segment')
      router.replace(`/anfragen/${lead.id}?${q.toString()}`, { scroll: false })
      return
    }
    const fromQuery = resolveAnfrageDetailTabFromQuery(raw)
    if (fromQuery) {
      setTab(fromQuery)
      if (searchParams.has('segment')) {
        const q = new URLSearchParams(searchParams.toString())
        q.delete('segment')
        router.replace(`/anfragen/${lead.id}?${q.toString()}`, { scroll: false })
      }
      return
    }
    if (typeof window !== 'undefined') {
      const fromHash = resolveAnfrageDetailTabFromQuery(window.location.hash)
      if (fromHash) setTab(fromHash)
    }
  }, [searchParams, lead.id, router])

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
  const leadTel =
    lead.auftraggeber?.telefon?.trim() ||
    lead.kunden?.telefon?.trim() ||
    lead.kontakt_telefon?.trim() ||
    null
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

  const matrixCta = primaryCta('anfrage', lead.status)

  const primaryCtaAction = useCallback(() => {
    if (!matrixCta) return
    if (matrixCta.id === 'angebot_erstellen') {
      openAngebotErstellen()
    }
  }, [matrixCta, openAngebotErstellen])

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
          onStatus: (k) => setStatusModalKind(k),
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
  }, [lead, router, startTransition, refresh])

  const vorhabenTitel = useMemo(() => leadVorhabenTitel(lead), [lead])

  const noShowTerminHinweis = useMemo(
    () =>
      lead.status === 'termin' &&
      hatOffenenVergangenenKalenderTermin(
        (lead.kalender_termine ?? []) as KalenderTermin[]
      ),
    [lead.status, lead.kalender_termine]
  )

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

  const leistungenInhalt = (
    <LeistungenTab
      phase="anfrage"
      rows={leistungenFromAnfrage(lead.funnel_daten)}
      onOpenDokument={openAngebotErstellen}
      emptyTitle="Noch keine Leistungen"
      emptyHint="Bedarf aus der Anfrage erscheint hier. Verbindliche Positionen legst du im Angebot an."
    />
  )

  const notizenInhalt = (
    <AnfrageNotizenTab leadId={lead.id} notizen={notizenRows} onReload={() => refresh()} />
  )

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'uebersicht',
      label: entityDetailTabLabel('uebersicht'),
      icon: 'list-details',
      render: () => (
        <div className="space-y-6">
          <PhaseCardsBlock
            kontext={projektKontext}
            fromRef={{ kind: 'anfrage', id: lead.id }}
          />
          {stammdatenInhalt}
          {detailsInhalt}
          <ZugehoerigListe
            kontext={projektKontext}
            fromRef={{ kind: 'anfrage', id: lead.id }}
          />
          {vorgangFotos.length > 0 ? (
            <DetailSection title="Fotos">
              <VorgangFotosTab fotos={vorgangFotos} />
            </DetailSection>
          ) : null}
        </div>
      ),
    },
    {
      id: 'leistungen',
      label: entityDetailTabLabel('leistungen'),
      icon: 'tool',
      render: () => <div className="space-y-6">{leistungenInhalt}</div>,
    },
    {
      id: 'zahlung',
      label: entityDetailTabLabel('zahlung'),
      icon: 'receipt',
      render: () => (
        <AnfrageZahlungTab
          rechnungen={projektKontext?.rechnungen ?? []}
          onCreateAngebot={openAngebotErstellen}
        />
      ),
    },
    {
      id: 'akte',
      label: entityDetailTabLabel('akte'),
      icon: 'files',
      count: (dokumenteCount || 0) + (notizenRows.length || 0) || undefined,
      render: () => (
        <VorgangAkteTab
          dateien={
            <AnfrageDokumenteTab
              leadId={lead.id}
              dokumente={dokumenteRows}
              angebote={angeboteListe}
              onReload={() => refresh()}
            />
          }
          notizen={notizenInhalt}
        />
      ),
    },
    {
      id: 'aktivitaet',
      label: entityDetailTabLabel('aktivitaet'),
      icon: 'history',
      count: timelineItems.length || undefined,
      render: () => (
        <div className="space-y-6">
          {timelineTab}
          <ProjektHistorieTab kontext={projektKontext} />
        </div>
      ),
    },
  ]

  return (
    <EntityDetailLayout
      phase="anfrage"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=anfrage"
      crumbBackLabel="Zurück zu Vorgängen"
      wiedervorlageDatum={lead.wiedervorlage_datum}
      wiedervorlageNotiz={lead.wiedervorlage_notiz}
      wiedervorlageEntity="lead"
      wiedervorlageEntityId={lead.id}
      onWiedervorlageSaved={() => refresh()}
      nextStepMetrics={[
        { label: 'Status', value: anfrageStatusDisplay(lead.status, { orgFreigabeStatus: lead.org_freigabe_status }).label },
        { label: 'Angebote', value: String(angeboteListe.length) },
      ]}
      quickBar={[
        {
          id: 'call',
          label: 'Anrufen',
          icon: 'phone',
          disabled: !leadTel,
          onClick: () => {
            if (leadTel) window.open(`tel:${leadTel.replace(/\s/g, '')}`)
          },
        },
        {
          id: 'mail',
          label: 'Mail',
          icon: 'mail',
          disabled: !leadEmail,
          onClick: () => mailCompose.openCompose(() => mailComposeContextFromLead(lead.id)),
        },
        { id: 'notiz', label: 'Notiz', icon: 'messages', onClick: () => setTab('akte') },
        { id: 'foto', label: 'Foto', icon: 'camera', onClick: () => setTab('uebersicht') },
      ]}
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
          return <StatusBadge status={lead.status} label={s.label} />
        })(),
        meta: headMeta,
        actions: (
          <DetailActionsBar
            sheetTitle="Anfrage"
            primary={
              matrixCta
                ? {
                    label: matrixCta.label,
                    icon: matrixCta.icon,
                    onClick: primaryCtaAction,
                    disabled: pending,
                  }
                : null
            }
            secondary={null}
            menuItems={detailHeadMenuItems}
          />
        ),
      }}
    >
      <div className="space-y-4">
      <DuplikatBand
        leadId={lead.id}
        duplikatHinweis={Boolean((lead as { duplikat_hinweis?: boolean }).duplikat_hinweis)}
        zusammengefuehrtIn={(lead as { zusammengefuehrt_in?: string | null }).zusammengefuehrt_in}
      />
      {noShowTerminHinweis ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-[length:var(--fs-text)] text-muted">
            Kunde nicht erschienen? Status „Nicht erreichbar“ setzen (Wiedervorlage).
          </p>
          <button
            type="button"
            className="btn ghost sm shrink-0"
            onClick={() => setStatusModalKind('nicht_erreichbar')}
          >
            Nicht erreichbar
          </button>
        </div>
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
