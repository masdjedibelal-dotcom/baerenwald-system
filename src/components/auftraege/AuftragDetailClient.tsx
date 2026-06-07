'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
  ClipboardList,
  FolderOpen,
  History,
  LayoutGrid,
  List,
  ListChecks,
  Mail,
  MoreHorizontal,
  FileCheck,
  Pencil,
  Phone,
  Receipt,
  Wallet,
} from 'lucide-react'
import { DetailHead } from '@/components/layout/DetailHead'
import { DetailResponsiveTabs } from '@/components/layout/app'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { DetailTabBar } from '@/components/ui/detail-tab-bar'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { NaechsteSchritteCard } from '@/components/crm/NaechsteSchritteCard'
import { AuftragFinanzenClient } from '@/components/auftraege/AuftragFinanzenClient'
import type { AuftragFinanzenClientPayload } from '@/app/(dashboard)/auftraege/load-auftrag-finanzen-client-props'
import { KommunikationCard } from '@/components/kommunikation/KommunikationCard'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromAuftrag } from '@/app/(dashboard)/kommunikation/actions'
import { AuftragStatusBadge } from '@/components/ui/AuftragStatusBadge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuftragTimelineTab } from '@/components/auftraege/AuftragTimelineTab'
import { AbnahmeprotokollModal } from '@/components/auftraege/AbnahmeprotokollModal'
import { AbschlussdokumentationModal } from '@/components/auftraege/AbschlussdokumentationModal'
import { AuftragBautagebuchCard } from '@/components/auftraege/AuftragBautagebuchCard'
import { AuftragAbnahmeprotokollCard } from '@/components/auftraege/AuftragAbnahmeprotokollCard'
import { HandwerkerBewertungModal } from '@/components/auftraege/HandwerkerBewertungModal'
import { AuftragPositionenSteuerungTab } from '@/components/auftraege/AuftragPositionenSteuerungTab'
import { AuftragDokumenteTab } from '@/components/auftraege/AuftragDokumenteTab'
import { zaehleAuftragDokumente } from '@/lib/auftraege/auftrag-dokumente-helpers'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import {
  completeAuftragAbnahme,
  createFormularEintragUndEmail,
  startAuftragArbeit,
  setAuftragZurAbnahme,
  updateAuftragProjektFelder,
} from '@/app/(dashboard)/auftraege/actions'
import { AuftragDetailTopCards } from '@/components/auftraege/AuftragDetailTopCards'
import {
  ensureKundenTokenAction,
  sendKundenProjektLinkEmail,
} from '@/app/(dashboard)/auftraege/kunden-status-actions'
import { auftragTitel } from '@/lib/auftraege/auftrag-liste-helpers'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type {
  AuftragDetail,
  FormularTemplate,
  Gewerk,
  LeadTimelineRow,
  Preisliste,
} from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
import { Modal } from '@/components/ui/Modal'
import { ClientOnly } from '@/components/ui/ClientOnly'
import { RechnungAuswahlModal } from '@/components/rechnungen/RechnungAuswahlModal'
import { RechnungWizard } from '@/components/rechnungen/RechnungWizard'
import {
  loadRechnungWizardBootstrapFromAuftrag,
  type RechnungWizardBootstrap,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import {
  defaultZahlungszielTage,
  type RechnungAuswahlZeile,
} from '@/lib/rechnungen/rechnung-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'
import { buildAuftragNaechsteSchritte } from '@/lib/naechste-schritte'

type GewerkOpt = { id: string; name: string; slug: string }

type AuftragDetailTab = 'stammdaten' | 'leistung' | 'schritte' | 'aktivitaet' | 'dokumente' | 'finanzen'

const DESKTOP_AUFTRAG_TABS: AuftragDetailTab[] = ['schritte', 'aktivitaet', 'dokumente', 'finanzen']
const MOBILE_AUFTRAG_TABS: AuftragDetailTab[] = [
  'stammdaten',
  'leistung',
  'schritte',
  'aktivitaet',
  'dokumente',
  'finanzen',
]

export function AuftragDetailClient({
  detail: initial,
  templates,
  gewerke = [],
  preislisten = [],
  leadTimeline = [],
  team = [],
  rechnungenListe = [],
  firm,
  finanzenPayload,
}: {
  detail: AuftragDetail
  templates: FormularTemplate[]
  gewerke?: GewerkOpt[]
  preislisten?: Preisliste[]
  leadTimeline?: LeadTimelineRow[]
  team?: CrmTeamMitglied[]
  rechnungenListe?: RechnungAuswahlZeile[]
  firm?: FirmenEinstellungen
  finanzenPayload: AuftragFinanzenClientPayload | null
}) {
  const router = useRouter()
  const { refresh, generation } = useCrmRefresh()
  const isMobile = useIsMobile()
  const mailCompose = useKundenMailCompose()
  const [detail, setDetail] = useState(initial)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [formModal, setFormModal] = useState<{
    gewerkId: string
    handwerkerId: string
    email: string
    templateId: string
    phase: 'vorab' | 'update' | 'abnahme'
  } | null>(null)
  const [mainTab, setMainTab] = useState<AuftragDetailTab>('schritte')
  const [projektModal, setProjektModal] = useState(false)
  const [projektTitel, setProjektTitel] = useState('')
  const [projektStart, setProjektStart] = useState('')
  const [projektEnde, setProjektEnde] = useState('')
  const [abnahmeModal, setAbnahmeModal] = useState(false)
  const [abnahmeModalStep, setAbnahmeModalStep] = useState<1 | 2 | 3 | 4>(1)
  const [abschlussModal, setAbschlussModal] = useState(false)
  const [rechnungAuswahlOpen, setRechnungAuswahlOpen] = useState(false)
  const [rechnungWizardOpen, setRechnungWizardOpen] = useState(false)
  const [rechnungWizardBootstrap, setRechnungWizardBootstrap] =
    useState<RechnungWizardBootstrap | null>(null)
  const [rechnungWizardKey, setRechnungWizardKey] = useState(0)
  const [hwBewertungZiele, setHwBewertungZiele] = useState<HandwerkerBewertungZiel[] | null>(null)

  const zahlungszielTage = useMemo(
    () =>
      Math.max(
        1,
        parseInt(firm?.zahlungsziel_tage ?? '', 10) ||
          defaultZahlungszielTage(initial.kunden?.typ)
      ),
    [firm?.zahlungsziel_tage, initial.kunden?.typ]
  )

  const openRechnungWizard = useCallback((bootstrap: RechnungWizardBootstrap) => {
    setRechnungWizardBootstrap(bootstrap)
    setRechnungWizardKey((k) => k + 1)
    setRechnungWizardOpen(true)
  }, [])

  const openAbnahme = useCallback(
    (step: 1 | 2 | 3 | 4 = 1) => {
      if (isMobile) router.push(`/auftraege/${detail.id}/abnahme`)
      else {
        setAbnahmeModalStep(step)
        setAbnahmeModal(true)
      }
    },
    [detail.id, isMobile, router]
  )

  const openAbschluss = useCallback(() => {
    if (isMobile) router.push(`/auftraege/${detail.id}/abschluss`)
    else setAbschlussModal(true)
  }, [detail.id, isMobile, router])

  const openRechnungErstellen = useCallback(() => {
    if (rechnungenListe.length === 0) {
      startTransition(async () => {
        const res = await loadRechnungWizardBootstrapFromAuftrag(detail.id)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        openRechnungWizard(res.bootstrap)
      })
      return
    }
    if (isMobile) {
      router.push(`/auftraege/${detail.id}/rechnungen-auswahl`)
      return
    }
    setRechnungAuswahlOpen(true)
  }, [rechnungenListe.length, detail.id, isMobile, openRechnungWizard, router])

  useEffect(() => {
    setDetail(initial)
    setProjektTitel(initial.titel ?? '')
    setProjektStart(initial.start_datum?.slice(0, 10) ?? '')
    setProjektEnde(initial.end_datum?.slice(0, 10) ?? '')
  }, [initial])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#dokumentation') setMainTab('dokumente')
  }, [])

  useEffect(() => {
    const resetRechnungUi = () => {
      setRechnungAuswahlOpen(false)
      setRechnungWizardOpen(false)
      setRechnungWizardBootstrap(null)
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resetRechnungUi()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setErr(null)
    startTransition(async () => {
      const r = await fn()
      if (!r.ok) setErr('message' in r ? (r.message ?? 'Fehler') : 'Fehler')
      else refresh()
    })
  }

  const kunde = detail.kunden
  const name = kunde?.name ?? 'Auftrag'
  const posCount = detail.auftrag_positionen?.length ?? 0

  const projektName = auftragTitel(detail)
  const kundeTelefon = detail.kunden?.telefon?.trim() ?? ''
  const metaLine = useMemo(() => {
    const ort = detail.kunden?.ort?.trim() || detail.kunden?.plz?.trim() || ''
    const parts: string[] = []
    if (detail.kunden?.name) parts.push(detail.kunden.name)
    if (ort) parts.push(ort)
    return parts.join(' · ')
  }, [detail])

  const filteredTemplates = formModal
    ? templates.filter(
        (t) => !t.gewerk_id || t.gewerk_id === formModal.gewerkId
      )
    : []

  const openFormModal = (gewerkId: string, handwerkerId: string, email: string) => {
    const first = templates.find((t) => !t.gewerk_id || t.gewerk_id === gewerkId)
    setFormModal({
      gewerkId,
      handwerkerId,
      email: email ?? '',
      templateId: first?.id ?? '',
      phase: 'vorab',
    })
  }

  const onStatusAction = useCallback(
    (action: string, payload?: unknown) => {
      const p = (payload ?? {}) as Record<string, unknown>
      if (action === 'navigate' && typeof p.href === 'string') {
        if (p.href.startsWith('/api/')) {
          window.open(p.href, '_blank', 'noopener,noreferrer')
          return
        }
        router.push(p.href)
        return
      }
      if (action === 'auftrag.start_arbeit') {
        run(() => startAuftragArbeit(detail.id))
        return
      }
      if (action === 'auftrag.zur_abnahme') {
        run(() => setAuftragZurAbnahme(detail.id))
        return
      }
      if (action === 'auftrag.abnahme_abschliessen') {
        run(() => completeAuftragAbnahme(detail.id))
        return
      }
      if (action === 'auftrag.formular_hw') {
        const z = (detail.auftrag_handwerker ?? [])[0]
        if (!z?.handwerker_id || !z.gewerk_id) {
          toast.message('Kein Handwerker', { description: 'Bitte zuerst Gewerke zuordnen.' })
          return
        }
        openFormModal(z.gewerk_id, z.handwerker_id, z.handwerker?.email ?? '')
        return
      }
      if (action === 'auftrag.nachtrag') {
        setMainTab('dokumente')
        return
      }
      if (action === 'auftrag.mangel') {
        setMainTab('dokumente')
        return
      }
      if (action === 'auftrag.baustopp') {
        setMainTab('dokumente')
        return
      }
      if (action === 'auftrag.mail_kunde' || action === 'auftrag.abnahme_mail' || action === 'auftrag.termin') {
        toast.message('Kalender & E-Mail', { description: 'Bitte Kalender bzw. bestehende Formular-/Mail-Funktion nutzen.' })
      }
      if (action === 'auftrag.bewertung') {
        toast.message('Bewertung', { description: 'Google-Link in den Einstellungen hinterlegen (NEXT_PUBLIC_GOOGLE_BEWERTUNG_URL).' })
      }
    },
    [detail.id, detail.auftrag_handwerker, router]
  )

  const istAbgeschlossen = detail.status === 'abgeschlossen'

  const aktionenMenuItems = useMemo((): ActionsMenuItem[] => {
    const items: ActionsMenuItem[] = [
      {
        label: 'E-Mail schreiben',
        icon: <Mail className="h-[15px] w-[15px]" aria-hidden />,
        hint: detail.kunden?.email?.trim() ? undefined : 'Keine E-Mail-Adresse',
        onClick: () => mailCompose.openCompose(() => mailComposeContextFromAuftrag(detail.id)),
      },
    ]

    if (kundeTelefon) {
      items.push({
        label: 'Anrufen',
        icon: <Phone className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => {
          window.location.href = `tel:${kundeTelefon.replace(/\s/g, '')}`
        },
      })
    }

    items.push(
      'sep',
      {
        label: 'Kundenportal-Link versenden',
        icon: <Mail className="h-[15px] w-[15px]" aria-hidden />,
        hint: detail.kunden?.email?.trim() ? undefined : 'Keine Kunden-E-Mail',
        onClick: () => {
          startTransition(async () => {
            const r = await sendKundenProjektLinkEmail(detail.id)
            if (!r.ok) toast.error(r.message)
            else toast.success('E-Mail gesendet')
          })
        },
      }
    )

    if (detail.angebot_id) {
      items.push('sep', {
        label: 'Zum Angebot',
        icon: <Receipt className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => router.push(`/angebote/${detail.angebot_id}`),
      })
    }

    items.push(
      'sep',
      {
        label: 'Abnahmeprotokoll',
        icon: <ClipboardList className="h-[15px] w-[15px]" aria-hidden />,
        onClick: openAbnahme,
      },
      {
        label: 'Rechnung erstellen',
        icon: <Receipt className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => openRechnungErstellen(),
      }
    )

    return items
  }, [
    detail.angebot_id,
    detail.id,
    detail.kunden?.email,
    kundeTelefon,
    mailCompose,
    openAbnahme,
    openRechnungErstellen,
    router,
  ])

  const submitFormular = () => {
    if (!formModal || !formModal.templateId || !formModal.email.trim()) {
      setErr('Template und E-Mail ausfüllen.')
      return
    }
    setErr(null)
    startTransition(async () => {
      const r = await createFormularEintragUndEmail({
        auftragId: detail.id,
        handwerkerId: formModal.handwerkerId,
        gewerkId: formModal.gewerkId,
        templateId: formModal.templateId,
        phase: formModal.phase,
        handwerkerEmail: formModal.email.trim(),
      })
      if (!r.ok) setErr(r.message ?? 'Fehler')
      else {
        setFormModal(null)
        refresh()
      }
    })
  }

  const timelineCount = useMemo(() => {
    const lead = leadTimeline.length
    const auftrag = detail.auftrag_timeline?.length ?? 0
    return (lead + auftrag) || 1
  }, [leadTimeline.length, detail.auftrag_timeline])

  const dokumenteCount = useMemo(
    () => zaehleAuftragDokumente(detail, rechnungenListe),
    [detail, rechnungenListe]
  )

  const handwerkerKontext = useMemo(
    () => ({
      kundeName: name,
      adresse: detail.kunden?.adresse ?? null,
      plz: detail.kunden?.plz ?? null,
      ort: detail.kunden?.ort ?? null,
      startDatum: detail.start_datum,
      endDatum: detail.end_datum,
      notizen: detail.notizen,
    }),
    [name, detail.kunden, detail.start_datum, detail.end_datum, detail.notizen]
  )

  const hatAbnahme = Boolean(detail.abnahme_protokoll_url)

  const naechsteSchritte = useMemo(
    () =>
      buildAuftragNaechsteSchritte({
        status: detail.status,
        auftragId: detail.id,
        hatAbnahme,
        rechnungenCount: rechnungenListe.length,
      }),
    [detail.status, detail.id, hatAbnahme, rechnungenListe.length]
  )

  const offeneSchritteCount = useMemo(
    () => naechsteSchritte.filter((s) => !s.done).length,
    [naechsteSchritte]
  )

  const desktopDetailTabs = useMemo(
    () => [
      {
        id: 'schritte' as const,
        label: 'Nächste Schritte',
        icon: ListChecks,
        count: offeneSchritteCount || undefined,
      },
      {
        id: 'aktivitaet' as const,
        label: ACTIVITY_SECTIONS.verlauf,
        icon: History,
        count: timelineCount || undefined,
      },
      {
        id: 'dokumente' as const,
        label: ACTIVITY_SECTIONS.dokumente,
        icon: FolderOpen,
        count: dokumenteCount || undefined,
      },
      {
        id: 'finanzen' as const,
        label: 'Finanzen',
        icon: Wallet,
      },
    ],
    [offeneSchritteCount, timelineCount, dokumenteCount]
  )

  const mobileDetailTabs = useMemo(
    () => [
      { id: 'stammdaten' as const, label: 'Stammdaten', icon: LayoutGrid },
      { id: 'leistung' as const, label: 'Leistungsübersicht', icon: List },
      {
        id: 'schritte' as const,
        label: 'Nächste Schritte',
        icon: ListChecks,
        count: offeneSchritteCount || undefined,
      },
      {
        id: 'aktivitaet' as const,
        label: ACTIVITY_SECTIONS.verlauf,
        icon: History,
        count: timelineCount || undefined,
      },
      {
        id: 'dokumente' as const,
        label: ACTIVITY_SECTIONS.dokumente,
        icon: FolderOpen,
        count: dokumenteCount || undefined,
      },
      {
        id: 'finanzen' as const,
        label: 'Finanzen',
        icon: Wallet,
      },
    ],
    [offeneSchritteCount, timelineCount, dokumenteCount]
  )

  const stammdatenInhalt = (
    <div className="space-y-3">
      <AuftragDetailTopCards detail={detail} team={team} />
      <KommunikationCard
        filter={{ auftragId: detail.id, kundeId: detail.kunde_id ?? undefined }}
        reloadKey={mailCompose.reloadKey + generation}
      />
    </div>
  )

  const leistungInhalt = (
    <div className="space-y-3">
      <Card
        title="Positionen"
        bodyClassName="p-4"
        action={
          posCount > 0 ? (
            <span className="text-[12px] font-medium tabular-nums text-bw-text-muted">
              {posCount} {posCount === 1 ? 'Leistung' : 'Leistungen'}
            </span>
          ) : null
        }
      >
        <AuftragPositionenSteuerungTab
          auftragId={detail.id}
          positionen={detail.auftrag_positionen ?? []}
          gewerke={gewerke}
          auftragStatus={detail.status}
          handwerkerKontext={handwerkerKontext}
          onChanged={() => refresh()}
        />
      </Card>
      <Card
        id="auftrag-bautagebuch"
        title="Bautagebuch"
        className="scroll-mt-24"
        bodyClassName="p-4"
      >
        <AuftragBautagebuchCard
          auftragId={detail.id}
          eintraege={detail.auftrag_bautagebuch ?? []}
          kundeName={name}
          positionen={detail.auftrag_positionen ?? []}
          gewerke={gewerke}
          onChanged={() => refresh()}
        />
      </Card>
      <AuftragAbnahmeprotokollCard
        auftragId={detail.id}
        kundeName={name}
        positionen={detail.auftrag_positionen ?? []}
        angebotPositionen={detail.angebote?.positionen ?? []}
        gewerke={gewerke}
        abnahmeProtokollUrl={detail.abnahme_protokoll_url}
        abnahmeDatum={detail.abnahme_datum}
        onChanged={() => refresh()}
      />
    </div>
  )

  const fixedOverview = (
    <div className="space-y-3">
      {stammdatenInhalt}
      {leistungInhalt}
    </div>
  )

  const schritteInhalt = <NaechsteSchritteCard steps={naechsteSchritte} />

  const finanzenInhalt = finanzenPayload ? (
    <AuftragFinanzenClient
      embedded
      auftragId={detail.id}
      projektTitel={detail.titel}
      kundeName={detail.kunden?.name ?? null}
      {...finanzenPayload}
    />
  ) : (
    <p className="text-sm text-bw-text-muted">Finanzdaten konnten nicht geladen werden.</p>
  )

  const desktopTabContent =
    mainTab === 'schritte' ? (
      schritteInhalt
    ) : mainTab === 'aktivitaet' ? (
      <AuftragTimelineTab detail={detail} leadTimeline={leadTimeline} />
    ) : mainTab === 'dokumente' ? (
      <AuftragDokumenteTab
        detail={detail}
        rechnungen={rechnungenListe}
        onChanged={() => refresh()}
      />
    ) : mainTab === 'finanzen' ? (
      finanzenInhalt
    ) : null

  const mobileTabContent =
    mainTab === 'stammdaten' ? (
      stammdatenInhalt
    ) : mainTab === 'leistung' ? (
      leistungInhalt
    ) : mainTab === 'schritte' ? (
      schritteInhalt
    ) : mainTab === 'aktivitaet' ? (
      <AuftragTimelineTab detail={detail} leadTimeline={leadTimeline} />
    ) : mainTab === 'dokumente' ? (
      <AuftragDokumenteTab
        detail={detail}
        rechnungen={rechnungenListe}
        onChanged={() => refresh()}
      />
    ) : mainTab === 'finanzen' ? (
      finanzenInhalt
    ) : null

  return (
    <div className="space-y-4 pb-0">
      <DetailHead
        backHref="/auftraege"
        backLabel="Zurück zu Aufträge"
        title={
          <>
            <span>{projektName}</span>
            <div className="detail-head-status">
              <AuftragStatusBadge status={detail.status} />
            </div>
          </>
        }
        sub={metaLine || undefined}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2">
            {istAbgeschlossen ? (
              <button
                type="button"
                className="btn btn-primary btn-sm inline-flex flex-1 gap-1.5 sm:flex-none"
                onClick={() => mailCompose.openCompose(() => mailComposeContextFromAuftrag(detail.id))}
              >
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                E-Mail
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm inline-flex flex-1 gap-1.5 sm:flex-none"
                onClick={openAbschluss}
              >
                <FileCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Auftrag abschließen
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm inline-flex shrink-0 gap-1.5"
              onClick={() => setProjektModal(true)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Bearbeiten</span>
            </button>
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
              items={aktionenMenuItems}
              sheetTitle="Auftrag"
            />
          </div>
        }
      />

      {err ? (
        <p className="mb-3 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <DetailResponsiveTabs
        tab={mainTab}
        onTabChange={setMainTab}
        desktopOverview={fixedOverview}
        desktopTabs={
          <DetailTabBar
            tabs={desktopDetailTabs}
            value={mainTab}
            onChange={(id) => setMainTab(id as AuftragDetailTab)}
          />
        }
        mobileTabs={
          <DetailTabBar
            tabs={mobileDetailTabs}
            value={mainTab}
            onChange={(id) => setMainTab(id as AuftragDetailTab)}
          />
        }
        desktopTabContent={desktopTabContent}
        mobileTabContent={mobileTabContent}
        mobileDefaultTab="stammdaten"
        desktopDefaultTab="schritte"
        mobileTabIds={MOBILE_AUFTRAG_TABS}
        desktopTabIds={DESKTOP_AUFTRAG_TABS}
      />

      <Modal
        open={projektModal}
        onClose={() => setProjektModal(false)}
        title="Projekt bearbeiten"
        size="md"
      >
        <div className="space-y-3">
          <Input label="Titel" value={projektTitel} onChange={(e) => setProjektTitel(e.target.value)} />
          <Input
            label="Start (Datum)"
            type="date"
            value={projektStart}
            onChange={(e) => setProjektStart(e.target.value)}
          />
          <Input
            label="Ende (Datum)"
            type="date"
            value={projektEnde}
            onChange={(e) => setProjektEnde(e.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setProjektModal(false)}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            loading={pending}
            onClick={() =>
              run(async () => {
                const r = await updateAuftragProjektFelder(detail.id, {
                  titel: projektTitel,
                  start_datum: projektStart || null,
                  end_datum: projektEnde || null,
                })
                if (r.ok) setProjektModal(false)
                return r
              })
            }
          >
            Speichern
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!formModal}
        onClose={() => setFormModal(null)}
        title="Formular-Link senden"
        size="md"
      >
        {formModal ? (
          <>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-ink">Template</span>
                <select
                  value={formModal.templateId}
                  onChange={(e) =>
                    setFormModal((m) => (m ? { ...m, templateId: e.target.value } : m))
                  }
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-surface px-3"
                >
                  <option value="">Bitte wählen</option>
                  {filteredTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink">Phase</span>
                <select
                  value={formModal.phase}
                  onChange={(e) =>
                    setFormModal((m) =>
                      m
                        ? {
                            ...m,
                            phase: e.target.value as 'vorab' | 'update' | 'abnahme',
                          }
                        : m
                    )
                  }
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-surface px-3"
                >
                  <option value="vorab">Vorab</option>
                  <option value="update">Update</option>
                  <option value="abnahme">Abnahme</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-ink">Handwerker-E-Mail</span>
                <input
                  type="email"
                  value={formModal.email}
                  onChange={(e) =>
                    setFormModal((m) => (m ? { ...m, email: e.target.value } : m))
                  }
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-border bg-surface px-3"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setFormModal(null)}>
                Abbrechen
              </Button>
              <Button variant="primary" loading={pending} onClick={submitFormular}>
                Formular-Link senden
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

      <AbnahmeprotokollModal
        open={abnahmeModal}
        onClose={() => setAbnahmeModal(false)}
        auftragId={detail.id}
        positionen={detail.auftrag_positionen ?? []}
        angebotPositionen={detail.angebote?.positionen ?? []}
        gewerke={gewerke}
        kundeName={name}
        initialStep={abnahmeModalStep}
        onDone={() => refresh()}
      />

      <AbschlussdokumentationModal
        open={abschlussModal}
        onClose={() => setAbschlussModal(false)}
        auftragId={detail.id}
        kundeName={name}
        onDone={() => refresh()}
      />

      <RechnungAuswahlModal
        open={rechnungAuswahlOpen}
        onClose={() => setRechnungAuswahlOpen(false)}
        auftragId={detail.id}
        rechnungen={rechnungenListe}
        onNeueRechnung={() => {
          setRechnungAuswahlOpen(false)
          startTransition(async () => {
            const res = await loadRechnungWizardBootstrapFromAuftrag(detail.id)
            if (!res.ok) {
              toast.error(res.message)
              return
            }
            openRechnungWizard(res.bootstrap)
          })
        }}
        onWeiterbearbeiten={(bootstrap) => {
          setRechnungAuswahlOpen(false)
          openRechnungWizard(bootstrap)
        }}
      />

      {rechnungWizardOpen && rechnungWizardBootstrap ? (
        <ClientOnly>
          <RechnungWizard
            key={rechnungWizardKey}
            bootstrap={rechnungWizardBootstrap}
            gewerke={gewerke as Gewerk[]}
            preislisten={preislisten}
            firm={firm}
            zahlungszielTage={zahlungszielTage}
            onClose={() => {
              setRechnungWizardOpen(false)
              setRechnungWizardBootstrap(null)
            }}
            onDone={() => {
              setRechnungWizardOpen(false)
              setRechnungWizardBootstrap(null)
              refresh()
            }}
          />
        </ClientOnly>
      ) : null}

      <HandwerkerBewertungModal
        open={hwBewertungZiele != null && hwBewertungZiele.length > 0}
        onClose={() => setHwBewertungZiele(null)}
        auftragId={detail.id}
        ziele={hwBewertungZiele ?? []}
        onSaved={() => refresh()}
      />

      {mailCompose.modal}
    </div>
  )
}
