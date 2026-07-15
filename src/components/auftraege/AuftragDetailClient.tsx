'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  Mail,
  FileCheck,
} from 'lucide-react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { PosBoard } from '@/components/posboard/PosBoard'
import {
  MockDetailShell,
  MockDokumenteCard,
  MockNotizenCard,
  MockNotizComposer,
  MockProjektUebersichtCard,
  MockVerlaufCard,
} from '@/components/mock-ui'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { MockEntityRowMenu } from '@/components/mock-ui'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromAuftrag } from '@/app/(dashboard)/kommunikation/actions'
import { loadAbnahmeprotokollSummary } from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { countOffeneMaengel } from '@/lib/auftraege/abnahme-maengel-helpers'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuftragTimelineTab } from '@/components/auftraege/AuftragTimelineTab'
import { AbschlussdokumentationModal } from '@/components/auftraege/AbschlussdokumentationModal'
import { AuftragBautagebuchCard } from '@/components/auftraege/AuftragBautagebuchCard'
import { AuftragZahlungsplanSection } from '@/components/auftraege/AuftragZahlungsplanSection'
import { auftragIstBauprojekt } from '@/lib/auftraege/ist-bauprojekt'
import { HandwerkerBewertungModal } from '@/components/auftraege/HandwerkerBewertungModal'
import { AuftragLeistungZuweisungModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal'
import { AuftragDokumenteTab } from '@/components/auftraege/AuftragDokumenteTab'
import { zaehleAuftragDokumente } from '@/lib/auftraege/auftrag-dokumente-helpers'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import {
  completeAuftragAbnahme,
  createFormularEintragUndEmail,
  startAuftragArbeit,
  setAuftragZurAbnahme,
  updateAuftragNotizen,
  updateAuftragProjektFelder,
} from '@/app/(dashboard)/auftraege/actions'
import { erzeugeVersicherungsaktePdf } from '@/lib/org/hv-auftrag-actions'
import { AuftragDetailTopCards } from '@/components/auftraege/AuftragDetailTopCards'
import {
  ensureKundenTokenAction,
  sendKundenProjektLinkEmail,
} from '@/app/(dashboard)/auftraege/kunden-status-actions'
import { auftragStatusDisplay } from '@/lib/status/status-display'
import { auftragTitel, formatAuftragsNr } from '@/lib/auftraege/auftrag-liste-helpers'
import { auftragBrauchtHandwerkerAktion } from '@/lib/vorgang/handwerker-aktion-offen'
import { resolveVorgangFromCrmEntities } from '@/lib/vorgang/resolve-from-crm-entities'
import { vorgangBackNav } from '@/lib/vorgang/vorgang-back-nav'
import { auftragPositionenToPosBoardLines } from '@/lib/posboard/position-adapters'
import { handwerkerAntwortAnzeige } from '@/lib/auftraege/partner-vorgang-display'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import type {
  AngebotHandwerkerRow,
  AuftragDetail,
  AuftragPosition,
  FormularTemplate,
  Gewerk,
  Lead,
  LeadDetail,
  LeadTimelineRow,
  Preisliste,
} from '@/lib/types'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import { toast } from '@/components/ui/app-toast'
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
import { ENTITY_DETAIL_TAB_LABELS } from '@/lib/entity-detail/entity-detail-tabs'
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import { formatDatum } from '@/lib/utils'
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
  | 'kanal'
  | 'preis_min'
  | 'preis_max'
  | 'kontakt_name'
  | 'kontakt_email'
  | 'kontakt_telefon'
  | 'funnel_daten'
  | 'vorgang_phase'
  | 'hv_meldung_status'
>

type AuftragDetailTab =
  | 'stammdaten'
  | 'details'
  | 'verlauf'
  | 'dokumente'
  | 'notizen'
  | 'zahlplan'
  | 'bautagebuch'

const AUFTRAG_DETAIL_TAB_IDS = new Set<AuftragDetailTab>([
  'stammdaten',
  'details',
  'verlauf',
  'dokumente',
  'notizen',
  'zahlplan',
  'bautagebuch',
])

function resolveAuftragDetailTabFromQuery(raw: string | null): AuftragDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase()
  if (!tab) return null
  if (tab === 'positionen' || tab === 'leistung' || tab === 'projekt') return 'details'
  if (tab === 'schritte' || tab === 'aktivitaet' || tab === 'timeline') return 'verlauf'
  if (tab === 'finanzen') return 'zahlplan'
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
  rahmenVertraegeByHandwerker = {},
  projektKontext,
  hvMeldungLeadId = null,
  hvMeldungLabel = null,
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
  rahmenVertraegeByHandwerker?: Record<string, HandwerkerVertragRow>
  projektKontext?: import('@/lib/crm/projekt-kontext-types').ProjektKontext
  hvMeldungLeadId?: string | null
  hvMeldungLabel?: string | null
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
  const [zuweisungModal, setZuweisungModal] = useState<{ open: boolean; ids: string[] }>({
    open: false,
    ids: [],
  })
  const [mainTab, setMainTab] = useState<AuftragDetailTab>('stammdaten')
  const [auftragNotizen, setAuftragNotizen] = useState(initial.notizen ?? '')
  const notizenTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const tab = resolveAuftragDetailTabFromQuery(searchParams.get('tab'))
    if (tab) setMainTab(tab)
  }, [searchParams])
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
    setAuftragNotizen(initial.notizen ?? '')
  }, [initial])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash === '#dokumentation') setMainTab('dokumente')
  }, [])

  useEffect(() => {
    if (notizenTimer.current) clearTimeout(notizenTimer.current)
    notizenTimer.current = setTimeout(() => {
      const t = auftragNotizen.trim()
      if (t === (detail.notizen ?? '').trim()) return
      void updateAuftragNotizen(detail.id, t).then((r) => {
        if (!r.ok) toast.error(r.message)
      })
    }, 600)
    return () => {
      if (notizenTimer.current) clearTimeout(notizenTimer.current)
    }
  }, [auftragNotizen, detail.id, detail.notizen])

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
  const kundeTelefon = lead?.kontakt_telefon?.trim() || kunde?.telefon?.trim() || ''
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
  const { backHref, backLabel } = vorgangBackNav('auftrag')
  const resolvedVorgang = useMemo(() => {
    const leadId = lead?.id ?? detail.lead_id
    if (!leadId) return null
    const angebot = detail.angebote
    return resolveVorgangFromCrmEntities({
      lead: {
        id: leadId,
        status: lead?.vorgang_phase ?? 'auftrag',
        funnel_daten: lead?.funnel_daten,
        hv_meldung_status: lead?.hv_meldung_status,
        kontakt_name: lead?.kontakt_name,
        plz: lead?.plz,
        created_at: detail.created_at,
        updated_at: detail.updated_at,
      },
      angebote: angebot
        ? [
            {
              id: angebot.id,
              status: angebot.status,
              status_einfach: angebot.status_einfach,
              created_at: angebot.created_at,
              updated_at: angebot.updated_at,
            },
          ]
        : [],
      auftraege: [
        {
          id: detail.id,
          status: detail.status,
          titel: detail.titel,
          created_at: detail.created_at,
          updated_at: detail.updated_at,
          handwerkerAktionOffen: auftragBrauchtHandwerkerAktion(detail.auftrag_positionen ?? []),
        },
      ],
      rechnungen: rechnungenListe.map((r) => ({
        id: r.id,
        status: r.status,
        faellig: r.faellig_am,
        created_at: r.rechnungsdatum ?? detail.created_at,
      })),
    })
  }, [lead, detail, rechnungenListe])
  const posBoardPositionen = useMemo(
    () => auftragPositionenToPosBoardLines(detail.auftrag_positionen ?? []),
    [detail.auftrag_positionen]
  )
  const auftragPosById = useMemo(() => {
    const m = new Map<string, AuftragPosition>()
    for (const p of detail.auftrag_positionen ?? []) m.set(p.id, p)
    return m
  }, [detail.auftrag_positionen])
  const canAssignHandwerker =
    (detail.auftrag_positionen ?? []).length > 0 && detail.status !== 'abgeschlossen'
  const openHandwerkerZuweisung = useCallback((positionIds: string[]) => {
    if (!positionIds.length) return
    setZuweisungModal({ open: true, ids: positionIds })
  }, [])

  const leistungenPosBoard = (
    <PosBoard
      title="Leistungen"
      positionen={posBoardPositionen}
      badgeOf={(line) => {
        const ap = auftragPosById.get(line.id)
        if (!ap) return null
        const info = handwerkerAntwortAnzeige(ap)
        if (!info) return null
        const kindMap = {
          angenommen: 'grn',
          abgelehnt: 'red',
          offen: 'yel',
          nicht_gesendet: 'gray',
        } as const
        return { kind: kindMap[info.variant], label: info.label }
      }}
      selectable={canAssignHandwerker}
      bulkActions={
        canAssignHandwerker
          ? (selected, clearSel) => [
              {
                icon: 'user-plus',
                label: 'Handwerker zuweisen',
                onClick: () => {
                  openHandwerkerZuweisung(selected.map((p) => p.id))
                  clearSel()
                },
              },
            ]
          : undefined
      }
      headerAction={
        canAssignHandwerker ? (
          <MockBtn sm kind="ghost" icon="user-plus" onClick={() => openHandwerkerZuweisung((detail.auftrag_positionen ?? []).map((p) => p.id))}>
            Handwerker zuweisen
          </MockBtn>
        ) : null
      }
    />
  )

  const headMeta = useMemo(
    () => (
      <span>
        {projektName}
        {detail.created_at ? (
          <>
            {' '}
            · erstellt {formatDatum(detail.created_at)}
          </>
        ) : null}
      </span>
    ),
    [projektName, detail.created_at]
  )

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
        router.push(`/auftraege/${detail.id}/abnahme/maengel`)
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

  const aktionenMenuItems = useMemo(
    () => {
      const extra: Array<
        | 'sep'
        | { icon?: string; label: string; hint?: string; danger?: boolean; onClick: () => void }
      > = [
        {
          icon: 'mail',
          label: 'E-Mail schreiben',
          hint: detail.kunden?.email?.trim() ? undefined : 'Keine E-Mail-Adresse',
          onClick: () => mailCompose.openCompose(() => mailComposeContextFromAuftrag(detail.id)),
        },
        'sep',
        {
          icon: 'send',
          label: 'Kundenportal-Link versenden',
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

      if (detail.angebot_id) {
        extra.push({
          icon: 'file-invoice',
          label: 'Zum Angebot',
          onClick: () => router.push(`/angebote/${detail.angebot_id}`),
        })
      }

      extra.push(
        'sep',
        {
          icon: 'clipboard-list',
          label: 'Abnahmeprotokoll',
          onClick: openAbnahme,
        },
        ...(istBauprojekt
          ? [
              {
                icon: 'file-signature',
                label: 'Nachunternehmervertrag',
                onClick: () => openNachunternehmervertrag(),
              },
              ...(hauptvertraegeFuerNachtrag.length
                ? [
                    {
                      icon: 'file-signature',
                      label: 'Nachtrag erstellen',
                      onClick: () => openNachtragErstellen(),
                    },
                  ]
                : []),
            ]
          : []),
        ...(String(detail.kostentraeger ?? '').trim() === 'versicherung'
          ? [
              {
                icon: 'shield',
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
            ]
          : [])
      )

      return listEntityMenuItems(
        'auftrag',
        {
          titel: detail.titel,
          status: detail.status,
        },
        {
          onEditAngebot:
            detail.angebot_id && !istAbgeschlossen ? openAngebotKorrektur : undefined,
          onInvoice: () => openRechnungErstellen(),
          tel: kundeTelefon,
          extra,
        }
      )
    },
    [
      detail.angebot_id,
      detail.id,
      detail.kunden?.email,
      detail.kostentraeger,
      detail.status,
      detail.titel,
      hauptvertraegeFuerNachtrag.length,
      istAbgeschlossen,
      istBauprojekt,
      kundeTelefon,
      mailCompose,
      openAbnahme,
      openAngebotKorrektur,
      openNachtragErstellen,
      openNachunternehmervertrag,
      openRechnungErstellen,
      refresh,
      router,
      startTransition,
    ]
  )

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

  const hatAbnahme = Boolean(detail.abnahme_protokoll_url)
  const hatRechnung = rechnungenListe.length > 0
  const [offeneMaengelProtokoll, setOffeneMaengelProtokoll] = useState(0)
  const offeneMaengelPunch = useMemo(() => {
    const rows = detail.punch_list ?? []
    return rows.filter((p) => p.status === 'offen' || p.status === 'in_bearbeitung').length
  }, [detail.punch_list])
  const offeneMaengelCount = Math.max(offeneMaengelPunch, offeneMaengelProtokoll)

  useEffect(() => {
    void loadAbnahmeprotokollSummary(detail.id).then((s) => {
      setOffeneMaengelProtokoll(s ? countOffeneMaengel(s.maengel) : 0)
    })
  }, [detail.id, detail.abnahme_protokoll_url])

  const angebotHandwerker = useMemo((): AngebotHandwerkerRow[] => {
    const raw = detail.angebote as { angebot_handwerker?: AngebotHandwerkerRow[] | null } | null | undefined
    return raw?.angebot_handwerker ?? []
  }, [detail.angebote])

  const projektRegion = useMemo(() => {
    const plz = lead?.plz?.trim() || detail.kunden?.plz?.trim() || ''
    const ort =
      (lead?.funnel_daten as { ort?: string } | null | undefined)?.ort?.trim() ||
      detail.kunden?.ort?.trim() ||
      ''
    const area = detail.kunden?.ort?.trim() || ''
    return [area || ort, plz].filter(Boolean).join(' · ') || null
  }, [lead, detail.kunden])

  const stammdatenInhalt = <AuftragDetailTopCards detail={detail} team={team} />

  const detailsInhalt = (
    <div className="space-y-3">
      <MockProjektUebersichtCard
        projekt={projektName}
        region={projektRegion}
        preisMin={lead?.preis_min ?? null}
        preisMax={lead?.preis_max ?? null}
        quelle={
          (lead?.funnel_daten as { quelle?: string } | null | undefined)?.quelle?.trim() ||
          lead?.kanal?.trim() ||
          null
        }
        startDatum={detail.start_datum}
        endDatum={detail.end_datum}
        fortschritt={detail.fortschritt ?? null}
      />
      {leistungenPosBoard}
    </div>
  )

  const verlaufInhalt = (
    <MockVerlaufCard>
      <AuftragTimelineTab detail={detail} leadTimeline={leadTimeline} />
    </MockVerlaufCard>
  )

  const notizenInhalt = (
    <MockNotizenCard
      notes={
        auftragNotizen.trim()
          ? [{ text: auftragNotizen.trim(), autor: 'Interne Notiz', time: 'Auto-Save' }]
          : []
      }
      composer={
        <MockNotizComposer
          value={auftragNotizen}
          onChange={setAuftragNotizen}
          onSubmit={() => {}}
          placeholder="Interne Auftragsnotiz…"
        />
      }
    />
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

  const zahlplanInhalt = (
    <AuftragZahlungsplanSection
      auftragId={detail.id}
      zahlungsplanRaw={(detail as { zahlungsplan?: unknown }).zahlungsplan}
      gesamtNetto={auftragNettoSumme}
      rechnungen={rechnungenListe}
      onCreateInvoice={openRechnungErstellen}
    />
  )

  const bautagebuchInhalt = (
    <AuftragBautagebuchCard
      auftragId={detail.id}
      eintraege={detail.auftrag_bautagebuch ?? []}
      kundeName={name}
      positionen={detail.auftrag_positionen ?? []}
      gewerke={gewerke}
      onChanged={() => refresh()}
    />
  )

  const auftragDetailGroups = [
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
      count: posCount || undefined,
      render: () => detailsInhalt,
    },
    {
      id: 'zahlplan',
      label: ENTITY_DETAIL_TAB_LABELS.zahlplan,
      icon: 'calculator',
      render: () => zahlplanInhalt,
    },
    {
      id: 'bautagebuch',
      label: ENTITY_DETAIL_TAB_LABELS.bautagebuch,
      icon: 'clipboard-list',
      count: detail.auftrag_bautagebuch?.length || undefined,
      render: () => bautagebuchInhalt,
    },
    {
      id: 'verlauf',
      label: ENTITY_DETAIL_TAB_LABELS.verlauf,
      icon: 'history',
      count: timelineCount || undefined,
      render: () => verlaufInhalt,
    },
    {
      id: 'dokumente',
      label: ENTITY_DETAIL_TAB_LABELS.dokumente,
      icon: 'files',
      count: dokumenteCount || undefined,
      render: () => (
        <MockDokumenteCard count={dokumenteCount || undefined}>
          <AuftragDokumenteTab
            detail={detail}
            rechnungen={rechnungenListe}
            vertraege={vertraegeListe}
            onChanged={() => refresh()}
          />
        </MockDokumenteCard>
      ),
    },
    {
      id: 'notizen',
      label: ENTITY_DETAIL_TAB_LABELS.notizen,
      icon: 'messages',
      count: auftragNotizen.trim() ? 1 : undefined,
      render: () => notizenInhalt,
    },
  ]

  return (
    <EntityDetailLayout
      resolvedVorgang={resolvedVorgang}
      phase="auftrag"
      breadcrumbTitle={projektName}
      className="space-y-4 pb-0"
      head={{
        backHref,
        backLabel,
        title: name,
        badges: <StatusBadge variant={auftragStatus.variant} label={auftragStatus.label} />,
        meta: headMeta,
        actions: (
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
            <MockEntityRowMenu items={aktionenMenuItems} title="Auftrag" />
          </div>
        ),
      }}
    >

      {err ? (
        <p className="mb-3 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <MockDetailShell
        defaultGroup="stammdaten"
        activeGroup={mainTab}
        onActiveGroupChange={(id) => setMainTab(id as AuftragDetailTab)}
        groups={auftragDetailGroups}
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
                Aktiviert Bautagebuch und erweiterte Baufunktionen (wie im Partner-Portal).
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

      <AuftragLeistungZuweisungModal
        open={zuweisungModal.open}
        onClose={() => setZuweisungModal({ open: false, ids: [] })}
        auftragId={detail.id}
        positionIds={zuweisungModal.ids}
        positionen={detail.auftrag_positionen ?? []}
        onDone={() => {
          setZuweisungModal({ open: false, ids: [] })
          refresh()
        }}
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
    </EntityDetailLayout>
  )
}
