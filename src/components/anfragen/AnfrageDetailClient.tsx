'use client'
import { useTransition } from '@/components/ui/action-busy'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { primaryCta } from '@/lib/vorgang/primary-cta'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { useDetailQuickActions } from '@/components/vorgang/DetailQuickActions'
import { DetailActionsBar } from '@/components/layout/DetailActionsBar'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { VorgangPhasenVerlauf } from '@/components/vorgang/VorgangPhasenVerlauf'
import { VorgangAkteTab } from '@/components/vorgang/VorgangAkteTab'
import { isLegacyDetailTabAlias } from '@/lib/vorgang/detail-tab-helpers'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { leadAngebotFunnelFromListe } from '@/lib/lead-angebot-funnel'
import { leadKontaktAnzeigeName, leadVertragsKundeId } from '@/lib/lead-display-helpers'
import { LeistungenTab, leistungenFromAnfrage } from '@/components/leistungen'
import { AnfrageZahlungTab } from '@/components/anfragen/AnfrageZahlungTab'
import { StatusModal, type StatusModalKind } from '@/components/anfragen/StatusModal'
import { DuplikatBand } from '@/components/anfragen/DuplikatBand'
import { PortalLoginIconButton } from '@/components/portal/PortalLoginIconButton'
import { StatusBadgeActionPopover } from '@/components/ui/StatusBadgeActionPopover'
import { isAngenommenesAngebotStatus } from '@/lib/dashboard-mock-mapping'
import { toast } from '@/components/ui/app-toast'
import { useIsMobile } from '@/hooks/useIsMobile'
import { resolveCumulativeDetailTabAlias } from '@/lib/entity-detail/cumulative-detail-tabs'
import { AnfrageNotizenTab } from '@/components/anfragen/AnfrageNotizenTab'
import { AnfrageDokumenteTab } from '@/components/anfragen/AnfrageDokumenteTab'
import { rechnungIstAlsAkteUnterlage } from '@/lib/auftraege/auftrag-dokumente-helpers'
import { AngebotAuswahlModal } from '@/components/angebote/AngebotAuswahlModal'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { AnfrageNeuSheet } from '@/components/anfragen/AnfrageNeuSheet'
import { AnfrageStammdatenCard } from '@/components/anfragen/AnfrageStammdatenCard'
import { HvMeldungKontextCards } from '@/components/anfragen/HvMeldungKontextCards'
import { NotfallDirektBeauftragenModal } from '@/components/auftraege/NotfallDirektBeauftragenModal'
import { VerlaufPanel } from '@/components/crm/VerlaufPanel'
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
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'
import { entityDetailTabLabel } from '@/lib/entity-detail/entity-detail-tabs'
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
const ANFRAGE_DETAIL_DEFAULT_TAB: AnfrageDetailTab = 'uebersicht'

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
  const isMobile = useIsMobile()
  const { refresh, generation } = useCrmRefresh()
  const [lead, setLead] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [statusModalKind, setStatusModalKind] = useState<StatusModalKind | null>(null)
  const [wvOpen, setWvOpen] = useState(false)
  const [zusammenfuehrenOpen, setZusammenfuehrenOpen] = useState(false)
  const [angebotWizardOpen, setAngebotWizardOpen] = useState(false)
  const [angebotWizardBootstrap, setAngebotWizardBootstrap] =
    useState<AngebotWizardBootstrap | null>(null)
  const [wizardSessionKey, setWizardSessionKey] = useState(0)
  const kopieQueryHandledRef = useRef(false)
  const [bearbeitenOpen, setBearbeitenOpen] = useState(false)
  const [angebotAuswahlOpen, setAngebotAuswahlOpen] = useState(angeboteAuswahlInitial)
  const [notfallModalOpen, setNotfallModalOpen] = useState(false)

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
  }, [initial])

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
    () =>
      dokumenteRows.length +
      angeboteListe.length +
      (projektKontext?.rechnungen ?? []).filter((r) =>
        rechnungIstAlsAkteUnterlage(r)
      ).length,
    [dokumenteRows.length, angeboteListe.length, projektKontext?.rechnungen]
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
  const { quickBar, sheets: quickActionSheets } = useDetailQuickActions({
    telefon: leadTel,
    email: leadEmail,
    notiz: { kind: 'lead', leadId: lead.id },
    dokument: { kind: 'lead', leadId: lead.id },
    onSaved: () => refresh(),
  })

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

  const matrixCta = primaryCta('anfrage', lead.status)

  const openDirektBeauftragen = useCallback(() => {
    setNotfallModalOpen(true)
  }, [])

  const primaryCtaAction = useCallback(() => {
    if (!matrixCta) return
    if (matrixCta.id === 'angebot_erstellen') {
      openAngebotErstellen()
    }
  }, [matrixCta, openAngebotErstellen])

  const detailPrimary = useMemo(() => {
    if (!matrixCta) return null
    return {
      label: matrixCta.label,
      icon: matrixCta.icon,
      onClick: primaryCtaAction,
      disabled: pending,
    }
  }, [matrixCta, pending, primaryCtaAction])

  const detailSecondary = useMemo(() => {
    if (matrixCta?.id !== 'angebot_erstellen') return null
    return {
      label: 'Direkt beauftragen',
      icon: 'alert-triangle',
      onClick: openDirektBeauftragen,
      disabled: pending,
    }
  }, [matrixCta, openDirektBeauftragen, pending])

  const closeAngebotWizard = useCallback(() => {
    setAngebotWizardOpen(false)
    setAngebotWizardBootstrap(null)
  }, [])

  const vorhabenTitel = useMemo(() => leadVorhabenTitel(lead), [lead])
  const kundeTitel = useMemo(() => kundenName(lead), [lead])
  const portalKundeId = useMemo(() => leadVertragsKundeId(lead), [lead])

  const statusBadge = useMemo(() => {
    const s = anfrageStatusDisplay(lead.status, {
      orgFreigabeStatus: lead.org_freigabe_status,
    })
    const badge = <StatusBadge status={lead.status} label={s.label} />
    const st = String(lead.status ?? '').trim().toLowerCase()
    const hasAngenommen = angeboteListe.some((a) =>
      isAngenommenesAngebotStatus(a.status, a.status_einfach)
    )
    const actions: { id: string; label: string; icon?: string; danger?: boolean; onClick: () => void }[] = []
    if (st === 'neu' || st === 'kontaktiert') {
      actions.push({
        id: 'termin',
        label: 'Termin vereinbart',
        icon: 'calendar-event',
        onClick: () => setStatusModalKind('termin'),
      })
      actions.push({
        id: 'nicht_erreichbar',
        label: 'Nicht erreichbar',
        icon: 'phone-off',
        onClick: () => setStatusModalKind('nicht_erreichbar'),
      })
    }
    if (!hasAngenommen && st !== 'abgebrochen') {
      actions.push({
        id: 'verloren',
        label: 'Als verloren markieren',
        icon: 'circle-x',
        danger: true,
        onClick: () => setStatusModalKind('verloren'),
      })
    }
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <StatusBadgeActionPopover badge={badge} actions={actions} title="Status" />
      </span>
    )
  }, [lead.status, lead.org_freigabe_status, angeboteListe])

  const noShowTerminHinweis = useMemo(
    () =>
      lead.status === 'termin' &&
      hatOffenenVergangenenKalenderTermin(
        (lead.kalender_termine ?? []) as KalenderTermin[]
      ),
    [lead.status, lead.kalender_termine]
  )

  const headMeta = useMemo(() => {
    const parts = [vorhabenTitel]
    if (lead.created_at) {
      const d = new Date(lead.created_at)
      const time = Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      parts.push(
        time
          ? `Eingang ${formatDatum(lead.created_at)}, ${time}`
          : `Eingang ${formatDatum(lead.created_at)}`
      )
    }
    return parts.filter(Boolean).join(' · ')
  }, [vorhabenTitel, lead.created_at])

  const timelineTab = <VerlaufPanel items={timelineItems} />

  const stammdatenInhalt = (
    <>
      <HvMeldungKontextCards lead={lead} />
      <AnfrageStammdatenCard lead={lead} onSaved={() => refresh()} />
    </>
  )

  const leistungenInhalt = (
    <LeistungenTab
      phase="anfrage"
      rows={leistungenFromAnfrage(lead.funnel_daten)}
      onOpenDokument={openAngebotErstellen}
      dokumentHint="Verbindliche Leistungen entstehen erst mit dem Angebot — hier siehst du nur den Bedarf aus der Anfrage."
      dokumentActionLabel="Angebot erstellen"
      emptyTitle="Noch keine Leistungen"
      emptyHint="Verbindliche Positionen entstehen mit dem Angebot."
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
          {stammdatenInhalt}
          <VorgangPhasenVerlauf
            kontext={projektKontext}
            fromRef={{ kind: 'anfrage', id: lead.id }}
            lead={lead}
            onSaved={() => refresh()}
          />
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
        <AnfrageZahlungTab rechnungen={projektKontext?.rechnungen ?? []} />
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
              rechnungen={projektKontext?.rechnungen ?? []}
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
      render: () => timelineTab,
    },
  ]

  return (
    <EntityDetailLayout
      phase="anfrage"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=anfrage"
      crumbBackLabel="Zurück zu den Suchergebnissen"
      crumbSectionLabel="Anfragen"
      breadcrumbTitle={kundeTitel}
      wiedervorlageDatum={lead.wiedervorlage_datum}
      wiedervorlageNotiz={lead.wiedervorlage_notiz}
      wiedervorlageEntity="lead"
      wiedervorlageEntityId={lead.id}
      onWiedervorlageSaved={() => refresh()}
      wiedervorlageOpen={wvOpen}
      onWiedervorlageOpenChange={setWvOpen}
      quickBar={quickBar}
      head={{
        title: kundeTitel,
        titleBadges: isMobile ? statusBadge : undefined,
        badges: isMobile ? undefined : statusBadge,
        meta: headMeta,
        titleTrailing: <PortalLoginIconButton kundeId={portalKundeId} label="Kundenportal öffnen" />,
        actions: (
          <DetailActionsBar
            sheetTitle="Anfrage"
            primary={detailPrimary}
            secondary={detailSecondary}
            menuItems={[]}
          />
        ),
      }}
    >
      <div className="space-y-4">
      <DuplikatBand
        leadId={lead.id}
        duplikatHinweis={Boolean((lead as { duplikat_hinweis?: boolean }).duplikat_hinweis)}
        duplikatBandDismissed={Boolean(
          (lead as { duplikat_band_dismissed?: boolean }).duplikat_band_dismissed
        )}
        zusammengefuehrtIn={(lead as { zusammengefuehrt_in?: string | null }).zusammengefuehrt_in}
        forceOpen={zusammenfuehrenOpen}
        onForceOpenHandled={() => setZusammenfuehrenOpen(false)}
        onDismissed={() => refresh()}
      />
      {noShowTerminHinweis ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-[length:var(--fs-text)] text-muted">
            Kunde nicht erschienen? „Nicht erreichbar“ als Kontaktversuch speichern.
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
        onSuggestVerloren={() => {
          toast.success('Drei Kontaktversuche — Vorschlag: als verloren markieren', {
            action: {
              label: 'Als verloren',
              onClick: () => setStatusModalKind('verloren'),
            },
          })
          setStatusModalKind('verloren')
        }}
      />

      <NotfallDirektBeauftragenModal
        open={notfallModalOpen}
        onClose={() => setNotfallModalOpen(false)}
        leadId={lead.id}
        variant="anfrage"
        gewerkName={
          Array.isArray(lead.bereiche) && lead.bereiche[0]
            ? String(lead.bereiche[0])
            : 'Allgemein'
        }
        onDone={(auftragId) => {
          setNotfallModalOpen(false)
          router.push(`/auftraege/${auftragId}`)
        }}
      />

      {quickActionSheets}
      </div>
    </EntityDetailLayout>
  )
}
