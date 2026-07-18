'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { hubSpotStatusToMockBadgeKind, variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { MapPin } from 'lucide-react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { buildEntityMenu, entityMenuToActionItems, type EntityMenuItem } from '@/lib/entity-menu'
import { runDuplicateAuftrag } from '@/lib/list-actions'
import { AuftragDetailsTab } from '@/components/auftraege/AuftragDetailsTab'
import { AuftragStammdatenCard } from '@/components/auftraege/AuftragStammdatenCard'
import { AuftragZahlungsplanSection } from '@/components/auftraege/AuftragZahlungsplanSection'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromAuftrag } from '@/app/(dashboard)/kommunikation/actions'
import { PipelineKontextBadge } from '@/components/anfragen/PipelineKontextBadge'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import { DetailMetaChip, DetailMetaRow } from '@/components/ui/DetailMetaChip'
import { Card } from '@/components/ui/Card'
import { AuftragTimelineTab } from '@/components/auftraege/AuftragTimelineTab'
import { AbschlussdokumentationModal } from '@/components/auftraege/AbschlussdokumentationModal'
import { AuftragAbschlussSection } from '@/components/auftraege/AuftragAbschlussSection'
import { AuftragBautagebuchCard } from '@/components/auftraege/AuftragBautagebuchCard'
import { AuftragBaustelleTab } from '@/components/auftraege/AuftragBaustelleTab'
import { auftragIstBauprojekt } from '@/lib/auftraege/ist-bauprojekt'
import { AuftragAbnahmeprotokollCard } from '@/components/auftraege/AuftragAbnahmeprotokollCard'
import { AuftragDokumenteTab } from '@/components/auftraege/AuftragDokumenteTab'
import {
  AuftragComplianceTab,
} from '@/components/auftraege/AuftragComplianceTab'
import { zaehleAuftragDokumente } from '@/lib/auftraege/auftrag-dokumente-helpers'
import { erzeugeVersicherungsaktePdf } from '@/lib/org/hv-auftrag-actions'
import { auftragStatusDisplay } from '@/lib/status/status-display'
import { formatAuftragsNr } from '@/lib/auftraege/auftrag-liste-helpers'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type {
  AuftragDetail,
  Gewerk,
  Lead,
  LeadTimelineRow,
  Preisliste,
} from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { openPortalAsKunde } from '@/app/(dashboard)/impersonation/actions'
import { deleteVorgang } from '@/app/(dashboard)/vorgaenge/actions'
import { ClientOnly } from '@/components/ui/ClientOnly'
import { RechnungAuswahlModal } from '@/components/rechnungen/RechnungAuswahlModal'
import { RechnungWizard } from '@/components/rechnungen/RechnungWizard'
import { ProjektVertragWizard } from '@/components/vertraege/ProjektVertragWizard'
import { VertragNachtragPickerModal } from '@/components/vertraege/VertragNachtragPickerModal'
import {
  loadRechnungWizardBootstrapFromAuftrag,
  type RechnungWizardBootstrap,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import {
  loadProjektVertragBootstrap,
  loadNachtragBootstrap,
  type ProjektVertragWizardBootstrap,
} from '@/app/(dashboard)/vertraege/wizard-actions'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import { istHauptvertragFuerNachtrag } from '@/lib/vertraege/vertrag-nachtrag-helpers'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { auftragSummenAusPositionen } from '@/lib/rechnungen/zahlungsplan'
import {
  defaultZahlungszielTage,
  type RechnungAuswahlZeile,
} from '@/lib/rechnungen/rechnung-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'
import type { LeadDetail } from '@/lib/types'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { loadAngebotKorrekturWizardBootstrap } from '@/app/(dashboard)/auftraege/angebot-korrektur-actions'

const AngebotWizard = dynamic(
  () => import('@/components/angebote/AngebotWizard').then((mod) => ({ default: mod.AngebotWizard })),
  { ssr: false }
)

type GewerkOpt = { id: string; name: string; slug: string }

type AuftragLeadSnapshot = Pick<
  Lead,
  | 'id'
  | 'plz'
  | 'kontakt_name'
  | 'kontakt_email'
  | 'kontakt_telefon'
  | 'funnel_daten'
  | 'kanal'
  | 'auftraggeber_kunde_id'
  | 'anlass'
  | 'situation'
  | 'bereiche'
  | 'kontakt_nachricht'
  | 'notizen'
  | 'budget_ca'
  | 'preis_min'
  | 'preis_max'
  | 'created_at'
>

type AuftragDetailTab =
  | 'stammdaten'
  | 'leistung'
  | 'baustelle'
  | 'abnahme'
  | 'abschluss'
  | 'aktivitaet'
  | 'dokumente'
  | 'finanzen'
  | 'notizen'

const AUFTRAG_DETAIL_TAB_IDS = new Set<AuftragDetailTab>([
  'stammdaten',
  'leistung',
  'baustelle',
  'abnahme',
  'abschluss',
  'aktivitaet',
  'dokumente',
  'finanzen',
  'notizen',
])

/** Query-/Deep-Link-Aliase auf stabile interne IDs. */
function resolveAuftragDetailTabFromQuery(raw: string | null): AuftragDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase()
  if (!tab) return null
  if (tab === 'schritte' || tab === 'naechste-schritte' || tab === 'naechste_schritte') return 'stammdaten'
  if (tab === 'positionen' || tab === 'details') return 'leistung'
  if (tab === 'zahlplan') return 'finanzen'
  if (tab === 'bautagebuch') return 'baustelle'
  if (tab === 'abnahmeprotokoll' || tab === 'abnahmeprotokolle') return 'abnahme'
  if (tab === 'abschlussdokumentation' || tab === 'abschlussdoku') return 'abschluss'
  if (tab === 'verlauf') return 'aktivitaet'
  if (tab === 'compliance' || tab === 'compliance-checkliste') return 'dokumente'
  if (tab === 'kommunikation') return 'notizen'
  if (AUFTRAG_DETAIL_TAB_IDS.has(tab as AuftragDetailTab)) return tab as AuftragDetailTab
  return null
}

export function AuftragDetailClient({
  detail: initial,
  lead = null,
  gewerke = [],
  preislisten = [],
  leadTimeline = [],
  team = [],
  rechnungenListe = [],
  vertraegeListe = [],
  firm,
  complianceTypen = [],
  partnerDokumente = [],
  rahmenVertraegeByHandwerker = {},
  projektKontext,
}: {
  detail: AuftragDetail
  lead?: AuftragLeadSnapshot | null
  gewerke?: GewerkOpt[]
  preislisten?: Preisliste[]
  leadTimeline?: LeadTimelineRow[]
  team?: CrmTeamMitglied[]
  rechnungenListe?: RechnungAuswahlZeile[]
  vertraegeListe?: HandwerkerVertragRow[]
  firm?: FirmenEinstellungen
  complianceTypen?: import('@/lib/types').ComplianceDokumentTyp[]
  partnerDokumente?: import('@/lib/types').PartnerDokument[]
  rahmenVertraegeByHandwerker?: Record<string, HandwerkerVertragRow>
  projektKontext?: import('@/lib/crm/projekt-kontext-types').ProjektKontext
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh, generation } = useCrmRefresh()
  const isMobile = useIsMobile()
  const mailCompose = useKundenMailCompose({ onSent: () => refresh() })
  const [detail, setDetail] = useState(initial)
  const [, startTransition] = useTransition()

  const [mainTab, setMainTab] = useState<AuftragDetailTab>('stammdaten')

  useEffect(() => {
    const tab = resolveAuftragDetailTabFromQuery(searchParams.get('tab'))
    if (tab === 'notizen' && !initial.notizen?.trim()) {
      setMainTab('stammdaten')
      return
    }
    if (tab) setMainTab(tab)
  }, [searchParams, initial.notizen])
  const [abschlussModal, setAbschlussModal] = useState(false)
  const [rechnungAuswahlOpen, setRechnungAuswahlOpen] = useState(false)
  const [rechnungWizardOpen, setRechnungWizardOpen] = useState(false)
  const [rechnungWizardBootstrap, setRechnungWizardBootstrap] =
    useState<RechnungWizardBootstrap | null>(null)
  const [rechnungWizardKey, setRechnungWizardKey] = useState(0)
  const [vertragWizardOpen, setVertragWizardOpen] = useState(false)
  const [vertragWizardBootstrap, setVertragWizardBootstrap] =
    useState<ProjektVertragWizardBootstrap | null>(null)
  const [vertragWizardKey, setVertragWizardKey] = useState(0)
  const [nachtragPickerOpen, setNachtragPickerOpen] = useState(false)
  const [angebotKorrekturOpen, setAngebotKorrekturOpen] = useState(false)
  const [angebotKorrekturBootstrap, setAngebotKorrekturBootstrap] =
    useState<AngebotWizardBootstrap | null>(null)
  const [angebotKorrekturLead, setAngebotKorrekturLead] = useState<LeadDetail | null>(null)
  const [angebotKorrekturKey, setAngebotKorrekturKey] = useState(0)
  const isCrmAdmin = useIsCrmAdmin()
  const [impersonating, setImpersonating] = useState(false)
  const [portalLinkModalOpen, setPortalLinkModalOpen] = useState(false)

  const openAngebotKorrektur = useCallback(() => {
    if (!detail.angebot_id) {
      toast.error('Kein verknüpftes Angebot.')
      return
    }
    if (!detail.lead_id) {
      toast.error('Keine Anfrage verknüpft — Korrektur nur über das Angebot möglich.')
      return
    }
    startTransition(async () => {
      const res = await loadAngebotKorrekturWizardBootstrap(detail.id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setAngebotKorrekturBootstrap(res.bootstrap)
      setAngebotKorrekturLead(res.lead)
      setAngebotKorrekturKey((k) => k + 1)
      setAngebotKorrekturOpen(true)
    })
  }, [detail.angebot_id, detail.id, detail.lead_id])

  const hauptvertraegeFuerNachtrag = useMemo(
    () => vertraegeListe.filter(istHauptvertragFuerNachtrag),
    [vertraegeListe]
  )

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

  const openAbnahme = useCallback(() => {
    setMainTab('abnahme')
    router.replace(`/auftraege/${detail.id}?tab=abnahme`, { scroll: false })
  }, [detail.id, router])

  const openAbschluss = useCallback(() => {
    setMainTab('abschluss')
    router.replace(`/auftraege/${detail.id}?tab=abschluss`, { scroll: false })
  }, [detail.id, router])

  const openAbschlussErstellen = useCallback(() => {
    if (isMobile) router.push(`/auftraege/${detail.id}/abschluss`)
    else setAbschlussModal(true)
  }, [detail.id, isMobile, router])

  const openVertragWizard = useCallback((bootstrap: ProjektVertragWizardBootstrap) => {
    setVertragWizardBootstrap(bootstrap)
    setVertragWizardKey((k) => k + 1)
    setVertragWizardOpen(true)
  }, [])

  const openNachunternehmervertrag = useCallback(() => {
    startTransition(async () => {
      const res = await loadProjektVertragBootstrap(detail.id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      openVertragWizard(res.bootstrap)
    })
  }, [detail.id, openVertragWizard])

  const startNachtragWizard = useCallback(
    (parentVertragId: string) => {
      setNachtragPickerOpen(false)
      startTransition(async () => {
        const res = await loadNachtragBootstrap({
          auftragId: detail.id,
          parentVertragId,
        })
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        openVertragWizard(res.bootstrap)
      })
    },
    [detail.id, openVertragWizard]
  )

  const openNachtragErstellen = useCallback(() => {
    if (!hauptvertraegeFuerNachtrag.length) {
      toast.error('Zuerst einen Nachunternehmervertrag mit PDF anlegen.')
      return
    }
    if (hauptvertraegeFuerNachtrag.length === 1) {
      startNachtragWizard(hauptvertraegeFuerNachtrag[0]!.id)
      return
    }
    setNachtragPickerOpen(true)
  }, [hauptvertraegeFuerNachtrag, startNachtragWizard])

  const openRechnungErstellen = useCallback(() => {
    if (rechnungenListe.length === 0) {
      if (isMobile) {
        router.push(`/auftraege/${detail.id}/rechnungen-auswahl`)
        return
      }
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
  }, [
    detail.id,
    isMobile,
    openRechnungWizard,
    rechnungenListe.length,
    router,
  ])

  useEffect(() => {
    setDetail(initial)
  }, [initial])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash === '#dokumentation') setMainTab('dokumente')
    if (hash === '#compliance' || hash === '#compliance-checkliste') setMainTab('dokumente')
    if (hash === '#auftrag-abnahmeprotokoll' || hash === '#abnahme') setMainTab('abnahme')
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

  const kunde = detail.kunden
  const name = kunde?.name ?? 'Auftrag'
  const posCount = detail.auftrag_positionen?.length ?? 0
  const kundeAdresse = useMemo(() => {
    const str = [kunde?.strasse, kunde?.hausnummer].filter(Boolean).join(' ').trim()
    const ort = [kunde?.plz, kunde?.ort].filter(Boolean).join(' ').trim()
    return [str, ort].filter(Boolean).join(', ') || kunde?.adresse?.trim() || ''
  }, [kunde])

  const istBauprojekt = useMemo(
    () =>
      auftragIstBauprojekt({
        ist_bauprojekt: detail.ist_bauprojekt,
        gewerkSlugs: (detail.auftrag_positionen ?? [])
          .map((p) => p.gewerk_slug)
          .filter(Boolean) as string[],
        alleGewerke: gewerke as Gewerk[],
      }),
    [detail.ist_bauprojekt, detail.auftrag_positionen, gewerke]
  )

  const auftragStatus = useMemo(() => auftragStatusDisplay(detail.status), [detail.status])

  const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
  const projektName = angebotTitelOderSituationBereich({
    angebot: ang,
    situation: lead?.situation,
    bereiche: lead?.bereiche,
    fallback: detail.titel?.trim() || formatAuftragsNr(detail),
  })
  const kundeTelefon = detail.kunden?.telefon?.trim() ?? ''
  const headMeta = useMemo(() => {
    const ort = detail.kunden?.ort?.trim() || ''
    const plz = detail.kunden?.plz?.trim() || ''
    const region = [plz, ort].filter(Boolean).join(' ')
    return (
      <DetailMetaRow>
        {detail.kunden?.name ? <DetailMetaChip>{detail.kunden.name}</DetailMetaChip> : null}
        {region ? <DetailMetaChip icon={MapPin}>{region}</DetailMetaChip> : null}
        <DetailMetaChip className="font-mono text-[11px]">
          AUF-{detail.id.slice(0, 8).toUpperCase()}
        </DetailMetaChip>
      </DetailMetaRow>
    )
  }, [detail])

  const istAbgeschlossen = detail.status === 'abgeschlossen'

  const openProjektBearbeiten = useCallback(() => {
    setMainTab('leistung')
    router.replace(`/auftraege/${detail.id}?tab=details`, { scroll: false })
  }, [detail.id, router])

  /** Mock entityMenu(auftrag) + CRM-Extras */
  const aktionenMenuItems = useMemo(() => {
    const extras: EntityMenuItem[] = [
      {
        icon: 'checks',
        label: 'Abschlussdokumentation',
        onClick: openAbschluss,
      },
      {
        icon: 'clipboard-list',
        label: 'Abnahmeprotokoll',
        onClick: openAbnahme,
      },
      ...(istBauprojekt
        ? ([
            {
              icon: 'file-pencil',
              label: 'Nachunternehmervertrag',
              onClick: () => openNachunternehmervertrag(),
            },
            ...(hauptvertraegeFuerNachtrag.length
              ? [
                  {
                    icon: 'file-pencil',
                    label: 'Nachtrag erstellen',
                    onClick: () => openNachtragErstellen(),
                  },
                ]
              : []),
          ] as EntityMenuItem[])
        : []),
      ...(String(detail.kostentraeger ?? '').trim() === 'versicherung'
        ? ([
            {
              icon: 'shield-check',
              label: 'Versicherungsakte erzeugen',
              onClick: () => {
                startTransition(async () => {
                  const r = await erzeugeVersicherungsaktePdf(detail.id)
                  if (!r.ok) toast.error(r.message)
                  else {
                    toast.success('Versicherungsakte erstellt')
                    refresh()
                  }
                })
              },
            },
          ] as EntityMenuItem[])
        : []),
      ...(detail.angebot_id
        ? ([
            {
              icon: 'file-invoice',
              label: 'Zum Angebot',
              onClick: () => router.push(`/angebote/${detail.angebot_id}`),
            },
          ] as EntityMenuItem[])
        : []),
    ]

    return entityMenuToActionItems(
      buildEntityMenu(
        'auftrag',
        {
          name: projektName,
          status: detail.status,
          customer: {
            name: detail.kunden?.name ?? undefined,
            tel: kundeTelefon || undefined,
            mail: detail.kunden?.email?.trim() || undefined,
          },
        },
        {
          onEdit: openProjektBearbeiten,
          onCopy: () => runDuplicateAuftrag(detail.id, router),
          onPortal: () => {
            if (!isCrmAdmin || !detail.kunde_id) {
              toast.error('Admin Login nur für CRM-Admins mit Kundenkonto')
              return
            }
            if (impersonating) return
            setImpersonating(true)
            void openPortalAsKunde(detail.kunde_id).then((r) => {
              setImpersonating(false)
              if (!r.ok) {
                toast.error(r.message)
                return
              }
              window.open(r.url, '_blank', 'noopener,noreferrer')
            })
          },
          onPortalLink: () => {
            if (!detail.kunde_id) {
              toast.error('Kein Kunde verknüpft — Portal-Link nicht möglich.')
              return
            }
            setPortalLinkModalOpen(true)
          },
          onEditAngebot: detail.angebot_id ? openAngebotKorrektur : undefined,
          onComplete: !istAbgeschlossen ? openAbschluss : undefined,
          onInvoice: () => openRechnungErstellen(),
          tel: kundeTelefon || null,
          mail: detail.kunden?.email?.trim() || null,
          onCall: kundeTelefon
            ? () => {
                window.location.href = `tel:${kundeTelefon.replace(/\s/g, '')}`
              }
            : undefined,
          onMail: detail.kunden?.email?.trim()
            ? () => mailCompose.openCompose(() => mailComposeContextFromAuftrag(detail.id))
            : undefined,
          onDelete: detail.lead_id
            ? () => {
                void deleteVorgang(detail.lead_id!).then((r) => {
                  if (!r.ok) toast.error(r.message)
                  else {
                    toast.success('Vorgang gelöscht')
                    router.push('/vorgaenge?tab=auftrag')
                  }
                })
              }
            : undefined,
          deleteLabel: projektName,
          extra: extras,
        }
      ),
      (n, size) => mockMenuIcon(n as Parameters<typeof mockMenuIcon>[0], size)
    )
  }, [
    detail.angebot_id,
    detail.id,
    detail.kunde_id,
    detail.kunden?.name,
    detail.kunden?.email,
    detail.status,
    detail.kostentraeger,
    detail.lead_id,
    kundeTelefon,
    mailCompose,
    hauptvertraegeFuerNachtrag.length,
    openAbnahme,
    openAbschluss,
    openAngebotKorrektur,
    openNachtragErstellen,
    openNachunternehmervertrag,
    openRechnungErstellen,
    openProjektBearbeiten,
    router,
    refresh,
    startTransition,
    istBauprojekt,
    istAbgeschlossen,
    isCrmAdmin,
    impersonating,
    projektName,
  ])

  const timelineCount = useMemo(() => {
    const lead = leadTimeline.length
    const auftrag = detail.auftrag_timeline?.length ?? 0
    return (lead + auftrag) || 1
  }, [leadTimeline.length, detail.auftrag_timeline])

  const dokumenteCount = useMemo(
    () => zaehleAuftragDokumente(detail, rechnungenListe, vertraegeListe),
    [detail, rechnungenListe, vertraegeListe]
  )

  const stammdatenInhalt = (
    <AuftragStammdatenCard detail={detail} lead={lead} onSaved={() => refresh()} />
  )

  const leistungInhalt = (
    <AuftragDetailsTab
      detail={detail}
      lead={lead}
      team={team}
      gewerke={gewerke}
      editable={detail.status !== 'storniert'}
      onSaved={() => refresh()}
    />
  )

  const abnahmeInhalt = (
    <AuftragAbnahmeprotokollCard auftragId={detail.id} onChanged={() => refresh()} />
  )

  const abschlussInhalt = (
    <AuftragAbschlussSection
      auftragId={detail.id}
      istAbgeschlossen={istAbgeschlossen}
      abschlussUrl={detail.abschlussdokumentation_url}
      abschlussGesendetAt={detail.abschlussdokumentation_gesendet_at}
      onCreate={openAbschlussErstellen}
      onRefresh={() => refresh()}
    />
  )

  const baustelleInhalt = (
    <div className="space-y-4">
      <AuftragBautagebuchCard
        auftragId={detail.id}
        eintraege={detail.auftrag_bautagebuch ?? []}
        kundeName={name}
        positionen={detail.auftrag_positionen ?? []}
        gewerke={gewerke}
        onChanged={() => refresh()}
      />
      {istBauprojekt ? (
        <AuftragBaustelleTab
          auftragId={detail.id}
          team={
            detail.auftrag_baustelle_team ?? {
              bau_mannschaft: [],
            }
          }
          bautagesberichte={detail.auftrag_bautagesberichte ?? []}
          regiearbeiten={detail.auftrag_regiearbeiten ?? []}
          wochenberichte={detail.auftrag_wochenberichte ?? []}
          baustellenDokumente={detail.auftrag_baustellen_dokumente ?? []}
          kundeName={name}
          kundeAdresse={kundeAdresse}
          handwerker={detail.auftrag_handwerker ?? []}
          onChanged={() => refresh()}
        />
      ) : null}
    </div>
  )

  const auftragNettoSumme = useMemo(() => {
    const ap = detail.auftrag_positionen ?? []
    if (ap.length) {
      return auftragSummenAusPositionen(
        ap.map((p) => ({
          id: p.id,
          gewerk_id: '',
          gewerk_slug: p.gewerk_slug ?? '',
          gewerk_name: p.gewerk_name ?? '',
          leistung: p.leistung_name ?? '',
          beschreibung: p.beschreibung ?? '',
          menge: p.menge ?? 1,
          einheit: p.einheit ?? '',
          lohn_netto: p.lohn_fix ?? 0,
          material_netto: p.material_fix ?? 0,
          gesamt_min: p.preis_fix ?? 0,
          gesamt_max: p.preis_fix ?? 0,
          preis_typ: 'fix' as const,
        }))
      ).netto
    }
    const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
    const raw = (ang as { positionen?: unknown } | null)?.positionen
    return auftragSummenAusPositionen(normalizeAngebotPositionen(raw)).netto
  }, [detail.auftrag_positionen, detail.angebote])

  const finanzenInhalt = (
    <AuftragZahlungsplanSection
      auftragId={detail.id}
      zahlungsplanRaw={(detail as { zahlungsplan?: unknown }).zahlungsplan}
      gesamtNetto={auftragNettoSumme}
      rechnungen={rechnungenListe}
      onCreateInvoice={openRechnungErstellen}
      onRefresh={() => refresh()}
    />
  )

  const notizenInhalt = detail.notizen?.trim() ? (
    <Card title="Notizen" collapsible={false}>
      <p className="whitespace-pre-wrap text-sm text-bw-text">{detail.notizen.trim()}</p>
    </Card>
  ) : null

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'stammdaten',
      label: 'Stammdaten',
      icon: 'clipboard-list',
      render: () => stammdatenInhalt,
    },
    {
      id: 'leistung',
      label: 'Details',
      icon: 'list-details',
      count: posCount || undefined,
      render: () => leistungInhalt,
    },
    {
      id: 'finanzen',
      label: 'Zahlplan',
      icon: 'calculator',
      render: () => finanzenInhalt,
    },
    {
      id: 'baustelle',
      label: 'Bautagebuch',
      icon: 'clipboard-list',
      render: () => baustelleInhalt,
    },
    {
      id: 'abnahme',
      label: 'Abnahmeprotokoll',
      icon: 'checklist',
      render: () => abnahmeInhalt,
    },
    {
      id: 'abschluss',
      label: 'Abschlussdokumentation',
      icon: 'checks',
      render: () => abschlussInhalt,
    },
    {
      id: 'aktivitaet',
      label: ACTIVITY_SECTIONS.verlauf,
      icon: 'history',
      count: timelineCount || undefined,
      render: () => <AuftragTimelineTab detail={detail} leadTimeline={leadTimeline} />,
    },
    {
      id: 'dokumente',
      label: ACTIVITY_SECTIONS.dokumente,
      icon: 'files',
      count: dokumenteCount || undefined,
      render: () => (
        <>
          <AuftragDokumenteTab
            detail={detail}
            rechnungen={rechnungenListe}
            vertraege={vertraegeListe}
            onChanged={() => refresh()}
          />
          {istBauprojekt ? (
            <AuftragComplianceTab
              detail={detail}
              complianceTypen={complianceTypen}
              partnerDokumente={partnerDokumente}
              gewerke={gewerke as Gewerk[]}
              onChanged={() => refresh()}
            />
          ) : null}
        </>
      ),
    },
    ...(detail.notizen?.trim()
      ? ([
          {
            id: 'notizen',
            label: ACTIVITY_SECTIONS.notizen,
            icon: 'messages',
            render: () => notizenInhalt,
          },
        ] as DetailShellGroup[])
      : []),
  ]

  return (
    <EntityDetailLayout
      phase="auftrag"
      breadcrumbTitle={projektName}
      crumbBackHref="/vorgaenge?tab=auftrag"
      crumbBackLabel="Zurück zu den Vorgängen"
      className="space-y-4 pb-0"
      head={{
        title: projektName,
        badges: (
          <span className="inline-flex flex-wrap items-center gap-2">
            <MockBadge kind={variantToMockBadgeKind(auftragStatus.variant)}>{auftragStatus.label}</MockBadge>
            {lead ? (
              <PipelineKontextBadge
                lead={{
                  kanal: lead.kanal,
                  auftraggeber_kunde_id: lead.auftraggeber_kunde_id,
                  anlass: lead.anlass,
                }}
              />
            ) : null}
          </span>
        ),
        meta: headMeta,
        actions: (
          <div className="flex w-full flex-wrap items-center gap-2">
            {istAbgeschlossen ? (
              <button
                type="button"
                className="btn primary sm inline-flex flex-1 gap-1.5 sm:flex-none"
                onClick={() => openRechnungErstellen()}
              >
                <MockIcon ctx="btn" n="file-invoice" size={15} />
                Rechnung erstellen
              </button>
            ) : (
              <button
                type="button"
                className="btn primary sm inline-flex flex-1 gap-1.5 sm:flex-none"
                onClick={openAbschluss}
              >
                <MockIcon ctx="btn" n="checks" size={15} />
                Abschlussdokumentation
              </button>
            )}
            <ActionsMenu
              trigger={
                <button type="button" className="qa-btn" aria-label="Weitere Aktionen" title="Aktionen">
                  <MockIcon ctx="btn" n="dots" size={18} />
                </button>
              }
              items={aktionenMenuItems}
              sheetTitle="Auftrag"
            />
          </div>
        ),
      }}
    >
      <DetailShell
        groups={detailShellGroups}
        value={mainTab}
        onChange={(id) => setMainTab(id as AuftragDetailTab)}
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
        auftragsReferenz={formatAuftragsNr(detail)}
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

      {vertragWizardOpen && vertragWizardBootstrap ? (
        <ClientOnly>
          <ProjektVertragWizard
            key={vertragWizardKey}
            bootstrap={vertragWizardBootstrap}
            onClose={() => {
              setVertragWizardOpen(false)
              setVertragWizardBootstrap(null)
            }}
            onDone={() => refresh()}
          />
        </ClientOnly>
      ) : null}

      <VertragNachtragPickerModal
        open={nachtragPickerOpen}
        vertraege={hauptvertraegeFuerNachtrag}
        onClose={() => setNachtragPickerOpen(false)}
        onSelect={startNachtragWizard}
      />

      {mailCompose.modal}

      <KundenportalLinkVersendenModal
        open={portalLinkModalOpen}
        onClose={() => setPortalLinkModalOpen(false)}
        kundeId={detail.kunde_id}
        fallbackEmail={detail.kunden?.email}
      />

      {angebotKorrekturOpen && angebotKorrekturLead && angebotKorrekturBootstrap ? (
        <AngebotWizard
          key={angebotKorrekturKey}
          lead={angebotKorrekturLead}
          gewerke={gewerke as Gewerk[]}
          preislisten={preislisten}
          firm={firm}
          bootstrap={angebotKorrekturBootstrap}
          onClose={() => {
            setAngebotKorrekturOpen(false)
            setAngebotKorrekturBootstrap(null)
            setAngebotKorrekturLead(null)
          }}
          onDone={() => {
            setAngebotKorrekturOpen(false)
            setAngebotKorrekturBootstrap(null)
            setAngebotKorrekturLead(null)
            refresh()
          }}
          onSaved={() => refresh()}
        />
      ) : null}
    </EntityDetailLayout>
  )
}
