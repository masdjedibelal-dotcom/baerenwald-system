'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { primaryCta } from '@/lib/vorgang/primary-cta'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { MockIcon, mockMenuIcon } from '@/components/mock-ui/MockIcon'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailActionsBar } from '@/components/layout/DetailActionsBar'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { buildEntityMenu, entityMenuToActionItems, type EntityMenuItem } from '@/lib/entity-menu'
import { runDuplicateAuftrag } from '@/lib/list-actions'
import { AuftragAuftragdetailsTab, AuftragLeistungenTab } from '@/components/auftraege/AuftragDetailsTab'
import { AuftragStammdatenCard } from '@/components/auftraege/AuftragStammdatenCard'
import { HandwerkerBewertungModal } from '@/components/auftraege/HandwerkerBewertungModal'
import { handwerkerAusAuftrag } from '@/lib/handwerker/handwerker-aus-auftrag'
import {
  VorgangZahlungTab,
  type RechnungErstellenOpts,
} from '@/components/vorgang/VorgangZahlungTab'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromAuftrag } from '@/app/(dashboard)/kommunikation/actions'
import { AuftragTimelineTab } from '@/components/auftraege/AuftragTimelineTab'
import { AuftragKundenUpdatePanel } from '@/components/auftraege/AuftragKundenUpdatePanel'
import { AuftragNotfallBanner } from '@/components/auftraege/AuftragNotfallBanner'
import { auftragIstBauprojekt } from '@/lib/auftraege/ist-bauprojekt'
import { AuftragDokumenteTab } from '@/components/auftraege/AuftragDokumenteTab'
import {
  AuftragComplianceTab,
} from '@/components/auftraege/AuftragComplianceTab'
import { zaehleAuftragDokumente } from '@/lib/auftraege/auftrag-dokumente-helpers'
import { erzeugeVersicherungsaktePdf } from '@/lib/org/hv-auftrag-actions'
import { auftragStatusDisplay } from '@/lib/status/status-display'
import { naechsterSchrittAuftrag } from '@/lib/crm/naechster-schritt'
import { formatAuftragsNr } from '@/lib/auftraege/auftrag-liste-helpers'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type {
  AngebotDetail,
  AuftragDetail,
  Gewerk,
  Lead,
  LeadDetail,
  LeadTimelineRow,
  Preisliste,
} from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
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
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import { auftragPositionenFuerSumme } from '@/lib/auftraege/auftrag-position-aktiv'
import { auftragHatZahlungOffen, auftragSummenAusPositionen } from '@/lib/rechnungen/zahlungsplan'
import {
  defaultZahlungszielTage,
  type RechnungAuswahlZeile,
} from '@/lib/rechnungen/rechnung-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import { parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'
import { entityDetailTabLabel } from '@/lib/entity-detail/entity-detail-tabs'
import { VorgangFotosTab } from '@/components/crm/VorgangFotosTab'
import { ProjektHistorieTab } from '@/components/crm/ProjektHistorieTab'
import { ZugehoerigListe } from '@/components/vorgang/ZugehoerigListe'
import { PhaseCardsBlock } from '@/components/vorgang/PhaseCard'
import { DetailSection } from '@/components/vorgang/DetailSection'
import { VorgangAkteTab } from '@/components/vorgang/VorgangAkteTab'
import {
  loadAbnahmeprotokolleListe,
  type AbnahmeprotokollListeEintrag,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { collectVorgangFotos } from '@/lib/vorgang/vorgang-fotos'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { updateAuftragNotizen, updateAuftragStatusFromUi } from '@/app/(dashboard)/auftraege/actions'
import {
  loadAngebotKorrekturWizardBootstrap,
  loadNachtragAngebotBootstrap,
} from '@/app/(dashboard)/auftraege/angebot-korrektur-actions'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'

const AngebotWizard = dynamic(
  () => import('@/components/angebote/AngebotWizard').then((mod) => ({ default: mod.AngebotWizard })),
  {
    ssr: false,
    loading: () => <CrmInlineLoading label="Angebot-Assistent wird geladen …" minHeight={120} />,
  }
)

type GewerkOpt = { id: string; name: string; slug: string }

function AuftragNotizenPanel({
  auftragId,
  initial,
  onSaved,
}: {
  auftragId: string
  initial: string
  onSaved: () => void
}) {
  const [val, setVal] = useState(initial)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setVal(initial)
  }, [initial])

  function speichern() {
    if (pending) return
    startTransition(async () => {
      const r = await updateAuftragNotizen(auftragId, val)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Notizen gespeichert')
      onSaved()
    })
  }

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">
          <MockIcon ctx="emphasis" n="messages" size={16} />
          Notizen
        </div>
        <div className="inline-edit-actions">
          <button
            type="button"
            className="btn ghost sm"
            disabled={pending || val === initial}
            onClick={() => setVal(initial)}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="btn primary sm"
            disabled={pending || val === initial}
            onClick={speichern}
          >
            Speichern
          </button>
        </div>
      </div>
      <div className="card-b">
        <textarea
          className="input ta"
          rows={8}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Interne Notizen zum Auftrag…"
          disabled={pending}
        />
      </div>
    </div>
  )
}

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

type AuftragDetailTab = 'uebersicht' | 'leistungen' | 'zahlung' | 'akte' | 'aktivitaet'

const AUFTRAG_DETAIL_TAB_IDS = new Set<AuftragDetailTab>([
  'uebersicht',
  'leistungen',
  'zahlung',
  'akte',
  'aktivitaet',
])

const AUFTRAG_DETAIL_DEFAULT_TAB: AuftragDetailTab = 'leistungen'

/** Legacy Deep-Link-Alias (kein eigener Tab mehr) → Leistungen. */
type VorOrtAbschnitt = 'bautagebuch' | 'abnahme' | 'abschluss'

function vorOrtAbschnittFromQuery(raw: string | null): VorOrtAbschnitt | null {
  const tab = (raw ?? '').trim().toLowerCase().replace(/^#/, '')
  if (tab === 'bautagebuch' || tab === 'baustelle' || tab === 'vor-ort-bautagebuch') {
    return 'bautagebuch'
  }
  if (
    tab === 'abnahme' ||
    tab === 'abnahmeprotokoll' ||
    tab === 'abnahmeprotokolle' ||
    tab === 'auftrag-abnahmeprotokoll' ||
    tab === 'vor-ort-abnahme'
  ) {
    return 'abnahme'
  }
  if (
    tab === 'abschluss' ||
    tab === 'abschlussdokumentation' ||
    tab === 'abschlussdoku' ||
    tab === 'abschlussbericht' ||
    tab === 'dokumentation' ||
    tab === 'vor-ort-abschluss' ||
    tab === 'nachtrag' ||
    tab === 'nachtraege'
  ) {
    return 'abschluss'
  }
  return null
}

type AuftragDetailTabDefaultContext = {
  status: string
  zahlungOffen?: boolean
}

function defaultAuftragDetailTabFromStatus(_ctx: AuftragDetailTabDefaultContext): AuftragDetailTab {
  return AUFTRAG_DETAIL_DEFAULT_TAB
}

function resolveAuftragDetailTabFromQuery(
  raw: string | null,
  defaultWhenEmpty?: AuftragDetailTabDefaultContext
): AuftragDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase()
  if (!tab) {
    return defaultWhenEmpty ? defaultAuftragDetailTabFromStatus(defaultWhenEmpty) : null
  }
  if (
    tab === 'zahlung' ||
    tab === 'zahlplan' ||
    tab === 'finanzen'
  ) {
    return 'zahlung'
  }
  if (
    tab === 'akte' ||
    tab === 'dokumente' ||
    tab === 'notizen' ||
    tab === 'compliance' ||
    tab === 'compliance-checkliste' ||
    tab === 'kommunikation'
  ) {
    return 'akte'
  }
  if (
    tab === 'leistungen' ||
    tab === 'leistung' ||
    tab === 'positionen' ||
    tab === 'ausfuehrung' ||
    tab === 'vor-ort' ||
    vorOrtAbschnittFromQuery(tab)
  ) {
    return 'leistungen'
  }
  if (
    tab === 'uebersicht' ||
    tab === 'stammdaten' ||
    tab === 'schritte' ||
    tab === 'naechste-schritte' ||
    tab === 'naechste_schritte' ||
    tab === 'auftragdetails' ||
    tab === 'auftrag-details' ||
    tab === 'auftragsdaten' ||
    tab === 'projektdetails' ||
    tab === 'projektinfos' ||
    tab === 'details' ||
    tab === 'auftrag' ||
    tab === 'anfrage' ||
    tab === 'anfrage-details' ||
    tab === 'angebot' ||
    tab === 'angebot-details' ||
    tab === 'fotos' ||
    tab === 'bilder' ||
    tab === 'photos'
  ) {
    return 'uebersicht'
  }
  if (
    tab === 'verlauf' ||
    tab === 'aktivitaet' ||
    tab === 'historie' ||
    tab === 'projekt-historie' ||
    tab === 'phasen'
  ) {
    return 'aktivitaet'
  }
  if (AUFTRAG_DETAIL_TAB_IDS.has(tab as AuftragDetailTab)) return tab as AuftragDetailTab
  return AUFTRAG_DETAIL_DEFAULT_TAB
}

function needsAkteAliasRedirect(rawTab: string | null): boolean {
  const tab = (rawTab ?? '').trim().toLowerCase()
  return (
    tab === 'finanzen' ||
    tab === 'zahlplan' ||
    tab === 'dokumente' ||
    tab === 'notizen' ||
    tab === 'stammdaten' ||
    tab === 'auftragdetails' ||
    tab === 'leistung' ||
    tab === 'fotos' ||
    tab === 'historie' ||
    tab === 'schritte' ||
    tab === 'ausfuehrung' ||
    tab === 'vor-ort'
  )
}

export function AuftragDetailClient({
  detail: initial,
  lead = null,
  leadDetail: _leadDetail = null,
  angebotDetail = null,
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
  /** Voller Lead für Anfrage-Details-Tab */
  leadDetail?: LeadDetail | null
  angebotDetail?: AngebotDetail | null
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

  const [mainTab, setMainTab] = useState<AuftragDetailTab>(AUFTRAG_DETAIL_DEFAULT_TAB)
  const [abnahmenListe, setAbnahmenListe] = useState<AbnahmeprotokollListeEintrag[]>([])
  // vorOrtFocus entfernt — kein Tagebuch-/Vor-Ort-Segment mehr (Phase 6)

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
  const [bewertungOpen, setBewertungOpen] = useState(false)
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

  const openNachtragAngebot = useCallback(() => {
    if (!detail.angebot_id || !detail.lead_id) {
      toast.error('Nachtrag braucht verknüpftes Angebot und Anfrage.')
      return
    }
    startTransition(async () => {
      const res = await loadNachtragAngebotBootstrap(detail.id)
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

  const leistungenMwstSatz = useMemo(() => {
    if (parseKleinunternehmerSetting(firm?.kleinunternehmer)) return 0
    return Math.max(0, parseInt(firm?.mwst_satz ?? '', 10) || DEFAULT_MWST_SATZ)
  }, [firm?.kleinunternehmer, firm?.mwst_satz])

  const openRechnungWizard = useCallback((bootstrap: RechnungWizardBootstrap) => {
    setRechnungWizardBootstrap(bootstrap)
    setRechnungWizardKey((k) => k + 1)
    setRechnungWizardOpen(true)
  }, [])

  const openAuftragAbschliessen = useCallback(() => {
    router.push(`/auftraege/${detail.id}/abnahme/erstellen`)
  }, [detail.id, router])

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

  const goZuNachtragAbschluss = useCallback(() => {
    setMainTab('leistungen')
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        document
          .getElementById('auftrag-nachtrag-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 160)
    })
  }, [])

  const openRechnungErstellen = useCallback(
    (opts?: RechnungErstellenOpts) => {
      if (isMobile) {
        const q = new URLSearchParams()
        if (opts?.zeileId) q.set('abschlag', opts.zeileId)
        if (opts?.voll) q.set('voll', '1')
        if (opts?.naechsterAbschlag) q.set('naechster', '1')
        const qs = q.toString()
        router.push(
          `/auftraege/${detail.id}/rechnungen-auswahl${qs ? `?${qs}` : ''}`
        )
        return
      }

      const startWizard = async () => {
        const res = await loadRechnungWizardBootstrapFromAuftrag(detail.id, {
          abschlagZeileId: opts?.zeileId,
          naechsterAbschlag: Boolean(opts?.naechsterAbschlag),
          vollOhnePlan: Boolean(opts?.voll),
        })
        if (!res.ok) {
          // Kein offener Abschlag → normale Rechnung / Plan im Wizard
          if (opts?.naechsterAbschlag) {
            const fallback = await loadRechnungWizardBootstrapFromAuftrag(detail.id, {})
            if (fallback.ok) {
              openRechnungWizard(fallback.bootstrap)
              return
            }
          }
          toast.error(res.message)
          return
        }
        openRechnungWizard(res.bootstrap)
      }

      if (rechnungenListe.length === 0 || opts?.zeileId || opts?.voll || opts?.naechsterAbschlag) {
        startTransition(() => {
          void startWizard()
        })
        return
      }
      setRechnungAuswahlOpen(true)
    },
    [detail.id, isMobile, openRechnungWizard, rechnungenListe.length, router]
  )

  useEffect(() => {
    setDetail(initial)
  }, [initial])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.replace(/^#/, '')
    if (hash === 'dokumentation') {
      setMainTab('leistungen')
      return
    }
    if (hash === 'compliance' || hash === 'compliance-checkliste') {
      setMainTab('akte')
      return
    }
    const focus = vorOrtAbschnittFromQuery(hash)
    if (focus) {
      setMainTab('leistungen')
    }
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
  const name =
    (_leadDetail && leadKontaktAnzeigeName(_leadDetail, '')) ||
    kunde?.name ||
    'Auftrag'
  const posCount = auftragPositionenFuerSumme(detail.auftrag_positionen).length

  const vorgangFotos = useMemo(
    () =>
      collectVorgangFotos({
        funnelDaten: _leadDetail?.funnel_daten ?? lead?.funnel_daten,
        angebotFotosRaw: angebotDetail?.fotos_urls,
      }),
    [_leadDetail?.funnel_daten, lead?.funnel_daten, angebotDetail?.fotos_urls]
  )

  const kundeAdresse = useMemo(() => {
    const ag = _leadDetail?.auftraggeber
    if (ag) {
      const str = [ag.strasse, ag.hausnummer].filter(Boolean).join(' ').trim()
      const ort = [ag.plz, ag.ort].filter(Boolean).join(' ').trim()
      return [str, ort].filter(Boolean).join(', ')
    }
    const str = [kunde?.strasse, kunde?.hausnummer].filter(Boolean).join(' ').trim()
    const ort = [kunde?.plz, kunde?.ort].filter(Boolean).join(' ').trim()
    return [str, ort].filter(Boolean).join(', ') || kunde?.adresse?.trim() || ''
  }, [kunde, _leadDetail])

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
  const headMeta = useMemo(() => {
    if (_leadDetail) {
      const hv = leadKontaktAnzeigeName(_leadDetail, '')
      if (hv) return hv
    }
    const name =
      detail.kunden?.name?.trim() ||
      [detail.kunden?.vorname, detail.kunden?.nachname].filter(Boolean).join(' ').trim() ||
      null
    return name
  }, [detail.kunden, _leadDetail])

  const istAbgeschlossen = detail.status === 'abgeschlossen'
  const istStorniert = detail.status === 'storniert'

  const nachtragCtaAktiv =
    istBauprojekt && hauptvertraegeFuerNachtrag.length > 0 && !istStorniert

  /** Nur Aktionen, die nicht schon über Header-CTA oder Detail-Tabs erreichbar sind */
  const aktionenMenuItems = useMemo(() => {
    const extras: EntityMenuItem[] = [
      ...(detail.angebot_id
        ? ([
            {
              icon: 'file-pencil',
              label: 'Angebot korrigieren',
              onClick: openAngebotKorrektur,
            },
            {
              icon: 'file-plus',
              label: 'Nachtrag erstellen',
              onClick: openNachtragAngebot,
            },
          ] as EntityMenuItem[])
        : []),
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
                    label: 'Nachträge (Abschluss)',
                    onClick: () => goZuNachtragAbschluss(),
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
      ...(!istAbgeschlossen && !istStorniert
        ? ([
            {
              icon: 'x',
              label: 'Auftrag stornieren',
              danger: true,
              onClick: () => {
                if (
                  !window.confirm(
                    'Auftrag wirklich stornieren? Der Status wird auf „storniert“ gesetzt.'
                  )
                ) {
                  return
                }
                startTransition(async () => {
                  const r = await updateAuftragStatusFromUi(detail.id, 'storniert')
                  if (!r.ok) {
                    toast.error(r.message)
                    return
                  }
                  toast.success('Auftrag storniert')
                  refresh()
                })
              },
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
          },
        },
        {
          onCopy: () => runDuplicateAuftrag(detail.id, router),
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
    detail.kunden?.name,
    detail.status,
    detail.kostentraeger,
    detail.lead_id,
    hauptvertraegeFuerNachtrag.length,
    openAngebotKorrektur,
    openNachtragAngebot,
    goZuNachtragAbschluss,
    openNachunternehmervertrag,
    router,
    refresh,
    startTransition,
    istBauprojekt,
    istAbgeschlossen,
    istStorniert,
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
    <AuftragStammdatenCard
      detail={detail}
      lead={_leadDetail ?? null}
      onSaved={() => refresh()}
    />
  )

  const auftragdetailsInhalt = (
    <AuftragAuftragdetailsTab
      detail={detail}
      lead={lead}
      team={team}
      editable={detail.status !== 'storniert'}
      onSaved={() => refresh()}
    />
  )

  const leistungInhalt = (
    <AuftragLeistungenTab
      detail={detail}
      lead={lead}
      gewerke={gewerke}
      angebotDetail={angebotDetail}
      editable={detail.status !== 'storniert'}
      mwstSatz={leistungenMwstSatz}
      onSaved={() => refresh()}
      onOpenDokument={openAngebotKorrektur}
      vertragNachtragVerfuegbar={hauptvertraegeFuerNachtrag.length > 0}
      onVertragNachtragErstellen={openNachtragErstellen}
    />
  )

  const auftragNettoSumme = useMemo(() => {
    const ap = auftragPositionenFuerSumme(detail.auftrag_positionen)
    if (ap.length) {
      // Auftrag: lohn_fix/material_fix/preis_fix sind Zeilensummen — erst in Stückpreise wandeln
      return auftragSummenAusPositionen(auftragPositionenToAngebotPositionen(ap)).netto
    }
    const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
    const raw = (ang as { positionen?: unknown } | null)?.positionen
    return auftragSummenAusPositionen(normalizeAngebotPositionen(raw)).netto
  }, [detail.auftrag_positionen, detail.angebote])

  const zahlungOffen = useMemo(
    () =>
      auftragHatZahlungOffen({
        auftragStatus: detail.status,
        rechnungen: rechnungenListe.map((r) => ({
          id: r.id,
          brutto: r.brutto,
          status: String(r.status),
          zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id ?? null,
          rechnung_art: r.rechnung_art ?? null,
          faellig_am: r.faellig_am ?? null,
        })),
        gesamtNetto: auftragNettoSumme,
      }),
    [detail.status, rechnungenListe, auftragNettoSumme]
  )

  useEffect(() => {
    void loadAbnahmeprotokolleListe(detail.id).then(setAbnahmenListe)
  }, [detail.id, generation])

  useEffect(() => {
    const rawTab = searchParams.get('tab')
    const hasExplicitTab = rawTab !== null && rawTab.trim() !== ''
    if (hasExplicitTab && needsAkteAliasRedirect(rawTab)) {
      const resolved = resolveAuftragDetailTabFromQuery(rawTab) ?? 'uebersicht'
      const q = new URLSearchParams(searchParams.toString())
      q.set('tab', resolved)
      q.delete('segment')
      // replace: History nicht mit Alias-Hops füllen
      router.replace(`/auftraege/${detail.id}?${q.toString()}`, { scroll: false })
      return
    }
    const tab = resolveAuftragDetailTabFromQuery(
      hasExplicitTab ? rawTab : null,
      hasExplicitTab ? undefined : { status: detail.status, zahlungOffen: zahlungOffen }
    )
    if (tab) setMainTab(tab)
    if (searchParams.has('segment')) {
      const q = new URLSearchParams(searchParams.toString())
      q.delete('segment')
      router.replace(`/auftraege/${detail.id}?${q.toString()}`, { scroll: false })
    }
  }, [searchParams, detail.status, detail.id, zahlungOffen, router])

  const finanzenInhalt = (
    <VorgangZahlungTab
      variant="auftrag"
      auftragId={detail.id}
      zahlungsplanRaw={
        (() => {
          const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
          return (ang as { zahlungsplan?: unknown } | null | undefined)?.zahlungsplan
        })()
      }
      gesamtNetto={auftragNettoSumme}
      rechnungen={rechnungenListe}
      onCreateInvoice={openRechnungErstellen}
      onOpenWizard={openRechnungWizard}
      onEditInvoice={(rechnungId) => {
        startTransition(async () => {
          const { loadRechnungWizardBootstrap } = await import(
            '@/app/(dashboard)/rechnungen/wizard-actions'
          )
          const res = await loadRechnungWizardBootstrap(rechnungId, detail.id)
          if (!res.ok) {
            toast.error(res.message)
            return
          }
          openRechnungWizard(res.bootstrap)
        })
      }}
      onRefresh={() => refresh()}
    />
  )

  const notizenInhalt = (
    <AuftragNotizenPanel
      auftragId={detail.id}
      initial={detail.notizen ?? ''}
      onSaved={() => refresh()}
    />
  )

  const uebersichtInhalt = (
    <div className="space-y-6">
      <PhaseCardsBlock
        kontext={projektKontext}
        fromRef={{ kind: 'auftrag', id: detail.id }}
      />
      {stammdatenInhalt}
      {auftragdetailsInhalt}
      {vorgangFotos.length > 0 ? (
        <DetailSection title="Fotos">
          <VorgangFotosTab fotos={vorgangFotos} />
        </DetailSection>
      ) : null}
      <ZugehoerigListe
        kontext={projektKontext}
        abnahmen={abnahmenListe}
        fromRef={{ kind: 'auftrag', id: detail.id }}
      />
    </div>
  )

  /** Phase 6: nur LeistungenTab — kein Tagebuch-Segment / Vor-Ort-Umschalter */
  const leistungenTabInhalt = <div className="space-y-6">{leistungInhalt}</div>

  const zahlungTabInhalt = <div className="space-y-6">{finanzenInhalt}</div>

  const akteInhalt = (
    <VorgangAkteTab
      dateien={
        <div className="space-y-4">
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
        </div>
      }
      notizen={notizenInhalt}
    />
  )

  /** Spec §4: Übersicht · Leistungen · Zahlung · Akte · Aktivität */
  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'uebersicht',
      label: entityDetailTabLabel('uebersicht'),
      icon: 'clipboard-list',
      render: () => uebersichtInhalt,
    },
    {
      id: 'leistungen',
      label: entityDetailTabLabel('leistungen'),
      icon: 'tool',
      count: posCount || undefined,
      render: () => leistungenTabInhalt,
    },
    {
      id: 'zahlung',
      label: entityDetailTabLabel('zahlung'),
      icon: 'receipt',
      render: () => zahlungTabInhalt,
    },
    {
      id: 'akte',
      label: entityDetailTabLabel('akte'),
      icon: 'files',
      count: dokumenteCount || undefined,
      render: () => akteInhalt,
    },
    {
      id: 'aktivitaet',
      label: entityDetailTabLabel('aktivitaet'),
      icon: 'history',
      count: timelineCount || undefined,
      render: () => (
        <div className="space-y-6">
          <AuftragKundenUpdatePanel
            detail={detail}
            leadStatus={_leadDetail?.status ?? null}
            onChanged={() => refresh()}
          />
          <AuftragTimelineTab detail={detail} leadTimeline={leadTimeline} />
          <ProjektHistorieTab kontext={projektKontext} />
        </div>
      ),
    },
  ]

  return (
    <EntityDetailLayout
      phase="auftrag"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=auftrag&lifecycle=offen"
      crumbBackLabel="Zurück zu Vorgängen"
      className="space-y-4 pb-0"
      wiedervorlageDatum={detail.wiedervorlage_datum}
      wiedervorlageNotiz={detail.wiedervorlage_notiz}
      wiedervorlageEntity="auftrag"
      wiedervorlageEntityId={detail.id}
      onWiedervorlageSaved={() => refresh()}
      nextStepMetrics={[
        { label: 'Positionen', value: String(posCount) },
        { label: 'Status', value: auftragStatus.label },
        { label: 'Zahlung', value: zahlungOffen ? 'offen' : 'ok' },
      ]}
      quickBar={[
        {
          id: 'call',
          label: 'Anrufen',
          icon: 'phone',
          disabled: !detail.kunden?.telefon?.trim() && !_leadDetail?.kontakt_telefon?.trim(),
          onClick: () => {
            const tel =
              detail.kunden?.telefon?.trim() || _leadDetail?.kontakt_telefon?.trim() || ''
            if (tel) window.open(`tel:${tel.replace(/\s/g, '')}`)
          },
        },
        {
          id: 'mail',
          label: 'Mail',
          icon: 'mail',
          disabled: !detail.kunden?.email?.trim(),
          onClick: () =>
            mailCompose.openCompose(() => mailComposeContextFromAuftrag(detail.id)),
        },
        {
          id: 'notiz',
          label: 'Notiz',
          icon: 'messages',
          onClick: () => setMainTab('akte'),
        },
        {
          id: 'foto',
          label: 'Foto',
          icon: 'camera',
          onClick: () => setMainTab('uebersicht'),
        },
      ]}
      nextStep={naechsterSchrittAuftrag({
        status: detail.status,
        istStorniert,
        istAbgeschlossen,
      })}
      head={{
        title: projektName,
        badges: (
          <>
            <StatusBadge status={detail.status} label={auftragStatus.label} />
            {zahlungOffen ? <StatusBadge status="gesendet" label="Zahlung offen" /> : null}
          </>
        ),
        meta: headMeta,
        actions: (
          <DetailActionsBar
            sheetTitle="Auftrag"
            primary={(() => {
              if (istStorniert) return null
              const cta = primaryCta('auftrag', detail.status, {
                abnahmeFaellig: detail.status === 'abnahme',
                rechnungBezahlt: !zahlungOffen && detail.status === 'abgeschlossen',
              })
              if (!cta) return null
              const onClick = () => {
                if (cta.id === 'abnahme_starten') {
                  router.push(`/auftraege/${detail.id}/abnahme/erstellen`)
                  return
                }
                if (cta.id === 'auftrag_abschliessen') {
                  openAuftragAbschliessen()
                  return
                }
                if (cta.id === 'rechnung_erstellen') {
                  openRechnungErstellen({ naechsterAbschlag: true })
                  return
                }
                if (cta.id === 'bewertung_einholen') {
                  setBewertungOpen(true)
                }
              }
              return { label: cta.label, icon: cta.icon, onClick }
            })()}
            secondary={null}
            menuItems={aktionenMenuItems}
          />
        ),
      }}
    >
      <AuftragNotfallBanner
        istNotfall={Boolean(detail.ist_notfall)}
        verguetung={detail.notfall_verguetung}
      />
      {nachtragCtaAktiv ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-[length:var(--fs-text)] text-muted">
            Mehrleistung oder Vertrags-Nachtrag — unter Leistungen · Abschluss.
          </p>
          <button
            type="button"
            className="btn ghost sm shrink-0"
            onClick={goZuNachtragAbschluss}
          >
            Zu Nachträge
          </button>
        </div>
      ) : null}
      <DetailShell
        groups={detailShellGroups}
        value={mainTab}
        onChange={(id) => setMainTab(id as AuftragDetailTab)}
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
            // Vorhandenen Abschlagsplan übernehmen (nächste offene Rate), sonst Plan im Wizard
            const res = await loadRechnungWizardBootstrapFromAuftrag(detail.id, {
              naechsterAbschlag: true,
            })
            if (res.ok) {
              openRechnungWizard(res.bootstrap)
              return
            }
            const fallback = await loadRechnungWizardBootstrapFromAuftrag(detail.id)
            if (!fallback.ok) {
              toast.error(res.message)
              return
            }
            openRechnungWizard(fallback.bootstrap)
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
        open={bewertungOpen}
        onClose={() => setBewertungOpen(false)}
        auftragId={detail.id}
        ziele={handwerkerAusAuftrag(detail)}
        onSaved={() => refresh()}
      />

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
