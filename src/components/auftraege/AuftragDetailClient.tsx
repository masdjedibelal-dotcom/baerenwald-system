'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { hubSpotStatusToMockBadgeKind, variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { MapPin } from 'lucide-react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { DetailHead } from '@/components/layout/DetailHead'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { AuftragDetailTopCards } from '@/components/auftraege/AuftragDetailTopCards'
import { AuftragZahlungsplanSection } from '@/components/auftraege/AuftragZahlungsplanSection'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromAuftrag } from '@/app/(dashboard)/kommunikation/actions'
import { PipelineKontextBadge } from '@/components/anfragen/PipelineKontextBadge'
import { DetailMetaChip, DetailMetaRow } from '@/components/ui/DetailMetaChip'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuftragTimelineTab } from '@/components/auftraege/AuftragTimelineTab'
import { AbschlussdokumentationModal } from '@/components/auftraege/AbschlussdokumentationModal'
import { AuftragBautagebuchCard } from '@/components/auftraege/AuftragBautagebuchCard'
import { AuftragBaustelleTab } from '@/components/auftraege/AuftragBaustelleTab'
import { auftragIstBauprojekt } from '@/lib/auftraege/ist-bauprojekt'
import { AuftragAbnahmeprotokollCard } from '@/components/auftraege/AuftragAbnahmeprotokollCard'
import { HandwerkerBewertungModal } from '@/components/auftraege/HandwerkerBewertungModal'
import { AuftragPositionenSteuerungTab } from '@/components/auftraege/AuftragPositionenSteuerungTab'
import { AuftragDokumenteTab } from '@/components/auftraege/AuftragDokumenteTab'
import {
  AuftragComplianceTab,
} from '@/components/auftraege/AuftragComplianceTab'
import { zaehleAuftragDokumente } from '@/lib/auftraege/auftrag-dokumente-helpers'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import {
  createFormularEintragUndEmail,
  updateAuftragProjektFelder,
} from '@/app/(dashboard)/auftraege/actions'
import { erzeugeVersicherungsaktePdf } from '@/lib/org/hv-auftrag-actions'
import { KundenStammdatenCard } from '@/components/kunden/KundenStammdatenCard'
import {
  ensureKundenTokenAction,
  sendKundenProjektLinkEmail,
} from '@/app/(dashboard)/auftraege/kunden-status-actions'
import { auftragStatusDisplay } from '@/lib/status/status-display'
import { auftragTitel, formatAuftragsNr } from '@/lib/auftraege/auftrag-liste-helpers'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type {
  AuftragDetail,
  FormularTemplate,
  Gewerk,
  Lead,
  LeadTimelineRow,
  Preisliste,
} from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { openPortalAsKunde } from '@/app/(dashboard)/impersonation/actions'
import { Modal } from '@/components/ui/Modal'
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
import type { AngebotHandwerkerRow, LeadDetail } from '@/lib/types'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { loadAngebotKorrekturWizardBootstrap } from '@/app/(dashboard)/auftraege/angebot-korrektur-actions'

const AngebotWizard = dynamic(
  () => import('@/components/angebote/AngebotWizard').then((mod) => ({ default: mod.AngebotWizard })),
  { ssr: false }
)

const KundeModal = dynamic(
  () => import('@/components/kunden/KundeModal').then((mod) => ({ default: mod.KundeModal })),
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
>

type AuftragDetailTab =
  | 'stammdaten'
  | 'leistung'
  | 'baustelle'
  | 'aktivitaet'
  | 'dokumente'
  | 'finanzen'
  | 'notizen'

const AUFTRAG_DETAIL_TAB_IDS = new Set<AuftragDetailTab>([
  'stammdaten',
  'leistung',
  'baustelle',
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
  if (tab === 'verlauf') return 'aktivitaet'
  if (tab === 'compliance' || tab === 'compliance-checkliste') return 'dokumente'
  if (tab === 'kommunikation') return 'notizen'
  if (AUFTRAG_DETAIL_TAB_IDS.has(tab as AuftragDetailTab)) return tab as AuftragDetailTab
  return null
}

export function AuftragDetailClient({
  detail: initial,
  lead = null,
  templates,
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
  templates: FormularTemplate[]
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
  const [stammdatenModalOpen, setStammdatenModalOpen] = useState(false)
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
  const [mainTab, setMainTab] = useState<AuftragDetailTab>('stammdaten')

  useEffect(() => {
    const tab = resolveAuftragDetailTabFromQuery(searchParams.get('tab'))
    if (tab === 'notizen' && !initial.notizen?.trim()) {
      setMainTab('stammdaten')
      return
    }
    if (tab) setMainTab(tab)
  }, [searchParams, initial.notizen])
  const [projektModal, setProjektModal] = useState(false)
  const [projektTitel, setProjektTitel] = useState('')
  const [projektStart, setProjektStart] = useState('')
  const [projektEnde, setProjektEnde] = useState('')
  const [projektIstBauprojekt, setProjektIstBauprojekt] = useState(false)
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
  const [hwBewertungZiele, setHwBewertungZiele] = useState<HandwerkerBewertungZiel[] | null>(null)
  const [angebotKorrekturOpen, setAngebotKorrekturOpen] = useState(false)
  const [angebotKorrekturBootstrap, setAngebotKorrekturBootstrap] =
    useState<AngebotWizardBootstrap | null>(null)
  const [angebotKorrekturLead, setAngebotKorrekturLead] = useState<LeadDetail | null>(null)
  const [angebotKorrekturKey, setAngebotKorrekturKey] = useState(0)
  const isCrmAdmin = useIsCrmAdmin()
  const [impersonating, setImpersonating] = useState(false)

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
    router.push(`/auftraege/${detail.id}/abnahme/erstellen`)
  }, [detail.id, router])

  const openAbschluss = useCallback(() => {
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
    if (isMobile) {
      router.push(`/auftraege/${detail.id}/rechnungen-auswahl`)
      return
    }
    setRechnungAuswahlOpen(true)
  }, [detail.id, isMobile, router])

  useEffect(() => {
    setDetail(initial)
    setProjektTitel(initial.titel ?? '')
    setProjektStart(initial.start_datum?.slice(0, 10) ?? '')
    setProjektEnde(initial.end_datum?.slice(0, 10) ?? '')
    setProjektIstBauprojekt(initial.ist_bauprojekt === true)
  }, [initial])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash === '#dokumentation') setMainTab('dokumente')
    if (hash === '#compliance' || hash === '#compliance-checkliste') setMainTab('dokumente')
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

  const projektName = auftragTitel(detail)
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

  const istAbgeschlossen = detail.status === 'abgeschlossen'

  const openProjektBearbeiten = useCallback(() => {
    setProjektIstBauprojekt(
      detail.ist_bauprojekt === true
        ? true
        : detail.ist_bauprojekt === false
          ? false
          : istBauprojekt
    )
    setProjektModal(true)
  }, [detail.ist_bauprojekt, istBauprojekt])

  /** Mock-Reihenfolge + CRM-Extras mit Funktion; Admin Login nur für CRM-Admins. */
  const aktionenMenuItems = useMemo((): ActionsMenuItem[] => {
    const items: ActionsMenuItem[] = [
      {
        label: 'Bearbeiten',
        icon: mockMenuIcon('pencil'),
        onClick: openProjektBearbeiten,
      },
      'sep',
      {
        label: 'Kundenportal-Link versenden',
        icon: mockMenuIcon('send'),
        hint: detail.kunden?.email?.trim() ? undefined : 'Keine Kunden-E-Mail',
        onClick: () => {
          startTransition(async () => {
            const r = await sendKundenProjektLinkEmail(detail.id)
            if (!r.ok) toast.error(r.message)
            else toast.success('E-Mail gesendet')
          })
        },
      },
    ]

    if (isCrmAdmin && detail.kunde_id) {
      items.push({
        label: 'Admin Login',
        icon: mockMenuIcon('external-link'),
        hint: impersonating
          ? 'Öffne…'
          : `HV-Portal als ${detail.kunden?.name ?? 'Kunde'}`,
        onClick: () => {
          if (impersonating || !detail.kunde_id) return
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
      })
    }

    items.push('sep')

    if (detail.angebot_id) {
      items.push({
        label: 'Angebot korrigieren',
        icon: mockMenuIcon('file-pencil'),
        hint: 'Leistungen ergänzen, Korrektur an Kunden senden',
        onClick: openAngebotKorrektur,
      })
      items.push({
        label: 'Zum Angebot',
        icon: mockMenuIcon('file-invoice'),
        onClick: () => router.push(`/angebote/${detail.angebot_id}`),
      })
    }

    if (!istAbgeschlossen) {
      items.push({
        label: 'Auftrag abschließen',
        icon: mockMenuIcon('checks'),
        onClick: openAbschluss,
      })
    }

    items.push(
      {
        label: 'Abnahmeprotokoll',
        icon: mockMenuIcon('clipboard-list'),
        onClick: openAbnahme,
      },
      ...(istBauprojekt
        ? [
            {
              label: 'Nachunternehmervertrag',
              icon: mockMenuIcon('file-pencil'),
              onClick: () => openNachunternehmervertrag(),
            } as ActionsMenuItem,
            ...(hauptvertraegeFuerNachtrag.length
              ? [
                  {
                    label: 'Nachtrag erstellen',
                    icon: mockMenuIcon('file-pencil'),
                    onClick: () => openNachtragErstellen(),
                  } as ActionsMenuItem,
                ]
              : []),
          ]
        : []),
      {
        label: 'Rechnung erstellen',
        icon: mockMenuIcon('file-invoice'),
        onClick: () => openRechnungErstellen(),
      },
      ...(String(detail.kostentraeger ?? '').trim() === 'versicherung'
        ? [
            {
              label: 'Versicherungsakte erzeugen',
              icon: mockMenuIcon('shield-check'),
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
            } as ActionsMenuItem,
          ]
        : []),
    )

    if (kundeTelefon || detail.kunden?.email?.trim()) {
      items.push('sep')
      if (kundeTelefon) {
        items.push({
          label: 'Anrufen',
          icon: mockMenuIcon('phone'),
          onClick: () => {
            window.location.href = `tel:${kundeTelefon.replace(/\s/g, '')}`
          },
        })
      }
      if (detail.kunden?.email?.trim()) {
        items.push({
          label: 'Mail schreiben',
          icon: mockMenuIcon('mail'),
          onClick: () => mailCompose.openCompose(() => mailComposeContextFromAuftrag(detail.id)),
        })
      }
    }

    return items
  }, [
    detail.angebot_id,
    detail.id,
    detail.kunde_id,
    detail.kunden?.name,
    openAngebotKorrektur,
    detail.kunden?.email,
    kundeTelefon,
    mailCompose,
    hauptvertraegeFuerNachtrag.length,
    openAbnahme,
    openAbschluss,
    openNachtragErstellen,
    openNachunternehmervertrag,
    openRechnungErstellen,
    openProjektBearbeiten,
    router,
    detail.kostentraeger,
    refresh,
    startTransition,
    istBauprojekt,
    istAbgeschlossen,
    isCrmAdmin,
    impersonating,
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
    () => zaehleAuftragDokumente(detail, rechnungenListe, vertraegeListe),
    [detail, rechnungenListe, vertraegeListe]
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

  const angebotHandwerker = useMemo((): AngebotHandwerkerRow[] => {
    const raw = detail.angebote as { angebot_handwerker?: AngebotHandwerkerRow[] | null } | null | undefined
    return raw?.angebot_handwerker ?? []
  }, [detail.angebote])

  const angebotPositionen = useMemo(() => {
    const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
    return normalizeAngebotPositionen((ang as { positionen?: unknown } | null)?.positionen)
  }, [detail.angebote])

  const angebotTitel = useMemo(() => {
    const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
    return (ang as { titel?: string } | null)?.titel?.trim() || detail.titel?.trim() || 'Projekt'
  }, [detail.angebote, detail.titel])

  const stammdatenInhalt = (
    <>
      <AuftragDetailTopCards detail={detail} team={team} />
      <KundenStammdatenCard
        kunde={kunde}
        collapsible={false}
        fallback={
          lead
            ? {
                plz: lead.plz,
                kontakt_name: lead.kontakt_name,
                kontakt_email: lead.kontakt_email,
                kontakt_telefon: lead.kontakt_telefon,
                funnel_daten: lead.funnel_daten,
              }
            : null
        }
        action={
          kunde ? (
            <button
              type="button"
              onClick={() => setStammdatenModalOpen(true)}
              className="btn ghost sm"
              aria-label="Stammdaten bearbeiten"
            >
              <MockIcon ctx="btn" n="pencil" size={15} />
            </button>
          ) : null
        }
      />
    </>
  )

  const leistungInhalt = (
    <>
      <Card
        id="auftrag-positionen"
        title="Positionen"
        collapsible={false}
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
          angebotId={detail.angebot_id}
          angebotTitel={angebotTitel}
          angebotHandwerker={angebotHandwerker}
          angebotPositionen={angebotPositionen}
          auftragStatus={detail.status}
          handwerkerKontext={handwerkerKontext}
          handwerkerRows={detail.auftrag_handwerker ?? []}
          eigenregie={istBauprojekt}
          onChanged={() => refresh()}
        />
      </Card>
      <AuftragAbnahmeprotokollCard auftragId={detail.id} onChanged={() => refresh()} />
    </>
  )

  const baustelleInhalt = istBauprojekt ? (
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
  ) : (
    <Card id="auftrag-bautagebuch" title="Bautagebuch" collapsible={false} bodyClassName="p-4">
      <AuftragBautagebuchCard
        auftragId={detail.id}
        eintraege={detail.auftrag_bautagebuch ?? []}
        kundeName={name}
        positionen={detail.auftrag_positionen ?? []}
        gewerke={gewerke}
        onChanged={() => refresh()}
      />
    </Card>
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
      icon: 'list-numbers',
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
    <div className="space-y-4 pb-0">
      <DetailHead
        backHref="/vorgaenge?tab=auftrag"
        backLabel="Zurück zu den Vorgängen"
        title={projektName}
        badges={
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
        }
        meta={headMeta}
        actions={
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
                Auftrag abschließen
              </button>
            )}
            <ActionsMenu
              trigger={
                <button
                  type="button"
                  className="btn ghost sm inline-flex shrink-0 gap-1.5 px-2.5 max-md:btn ghost max-md:px-2"
                  aria-label="Weitere Aktionen"
                  title="Aktionen"
                >
                  <MockIcon ctx="btn" n="dots" size={18} />
                  <span className="sr-only">Mehr</span>
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

      <DetailShell
        groups={detailShellGroups}
        value={mainTab}
        onChange={(id) => setMainTab(id as AuftragDetailTab)}
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
          <label className="flex cursor-pointer items-start gap-2 text-sm text-bw-text">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-bw-border"
              checked={projektIstBauprojekt}
              onChange={(e) => setProjektIstBauprojekt(e.target.checked)}
            />
            <span>
              <span className="font-medium">Bauprojekt / Bauauftrag</span>
              <span className="mt-0.5 block text-xs text-bw-text-muted">
                Aktiviert Bautagebuch, Baustellen-Tab und Compliance-Checkliste (wie im
                Partner-Portal).
              </span>
            </span>
          </label>
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
                  ist_bauprojekt: projektIstBauprojekt,
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

      <HandwerkerBewertungModal
        open={hwBewertungZiele != null && hwBewertungZiele.length > 0}
        onClose={() => setHwBewertungZiele(null)}
        auftragId={detail.id}
        ziele={hwBewertungZiele ?? []}
        onSaved={() => refresh()}
      />

      {kunde ? (
        <KundeModal
          open={stammdatenModalOpen}
          onClose={() => setStammdatenModalOpen(false)}
          editKunde={kunde}
          leadFunnelDaten={lead?.funnel_daten}
          stayOnPage
          revalidateAnfrageId={lead?.id}
          onSaved={() => {
            toast.success('Stammdaten gespeichert')
            setStammdatenModalOpen(false)
            refresh()
          }}
        />
      ) : null}

      {mailCompose.modal}

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
    </div>
  )
}
