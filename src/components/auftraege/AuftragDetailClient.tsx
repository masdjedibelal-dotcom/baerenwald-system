'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { hubSpotStatusToMockBadgeKind, variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
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
import { AuftragZahlungsplanSection, type RechnungErstellenOpts } from '@/components/auftraege/AuftragZahlungsplanSection'
import { useKundenMailCompose } from '@/components/kommunikation/useKundenMailCompose'
import { mailComposeContextFromAuftrag } from '@/app/(dashboard)/kommunikation/actions'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import { AuftragTimelineTab } from '@/components/auftraege/AuftragTimelineTab'
import { AbschlussdokumentationModal } from '@/components/auftraege/AbschlussdokumentationModal'
import { AuftragAbschlussSection } from '@/components/auftraege/AuftragAbschlussSection'
import { AuftragVorOrtPanel, type VorOrtAbschnitt } from '@/components/auftraege/AuftragVorOrtPanel'
import { AuftragLeistungVorOrtTabelle } from '@/components/auftraege/AuftragLeistungVorOrtTabelle'
import { AuftragNotfallBanner } from '@/components/auftraege/AuftragNotfallBanner'
import { NotfallDirektBeauftragenModal } from '@/components/auftraege/NotfallDirektBeauftragenModal'
import { AuftragBaustelleTab } from '@/components/auftraege/AuftragBaustelleTab'
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
import { auftragSummenAusPositionen } from '@/lib/rechnungen/zahlungsplan'
import {
  defaultZahlungszielTage,
  type RechnungAuswahlZeile,
} from '@/lib/rechnungen/rechnung-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import { parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ACTIVITY_SECTIONS } from '@/lib/crm-labels'
import { VorgangFotosTab } from '@/components/crm/VorgangFotosTab'
import { ProjektHistorieTab } from '@/components/crm/ProjektHistorieTab'
import { collectVorgangFotos } from '@/lib/vorgang/vorgang-fotos'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { updateAuftragNotizen } from '@/app/(dashboard)/auftraege/actions'
import { loadAngebotKorrekturWizardBootstrap } from '@/app/(dashboard)/auftraege/angebot-korrektur-actions'
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

type AuftragDetailTab =
  | 'auftragdetails'
  | 'leistung'
  | 'stammdaten'
  | 'fotos'
  | 'ausfuehrung'
  | 'aktivitaet'
  | 'historie'
  | 'dokumente'
  | 'finanzen'
  | 'notizen'

const AUFTRAG_DETAIL_TAB_IDS = new Set<AuftragDetailTab>([
  'auftragdetails',
  'leistung',
  'stammdaten',
  'fotos',
  'ausfuehrung',
  'aktivitaet',
  'historie',
  'dokumente',
  'finanzen',
  'notizen',
])

function vorOrtAbschnittFromQuery(raw: string | null): VorOrtAbschnitt | null {
  const tab = (raw ?? '').trim().toLowerCase().replace(/^#/, '')
  if (
    tab === 'bautagebuch' ||
    tab === 'baustelle' ||
    tab === 'vor-ort-bautagebuch'
  ) {
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
    tab === 'vor-ort-abschluss'
  ) {
    return 'abschluss'
  }
  return null
}

/** Query-/Deep-Link-Aliase auf stabile interne IDs. */
function resolveAuftragDetailTabFromQuery(raw: string | null): AuftragDetailTab | null {
  const tab = (raw ?? '').trim().toLowerCase()
  if (!tab) return null
  if (tab === 'schritte' || tab === 'naechste-schritte' || tab === 'naechste_schritte') return 'stammdaten'
  if (
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
    tab === 'angebot-details'
  ) {
    return 'auftragdetails'
  }
  if (tab === 'positionen' || tab === 'leistung' || tab === 'leistungen') {
    return 'leistung'
  }
  if (tab === 'zahlplan') return 'finanzen'
  if (vorOrtAbschnittFromQuery(tab) || tab === 'ausfuehrung' || tab === 'vor-ort') {
    return 'ausfuehrung'
  }
  if (tab === 'verlauf') return 'aktivitaet'
  if (tab === 'historie' || tab === 'projekt-historie' || tab === 'phasen') return 'historie'
  if (tab === 'compliance' || tab === 'compliance-checkliste') return 'dokumente'
  if (tab === 'kommunikation') return 'notizen'
  if (tab === 'bilder' || tab === 'photos') return 'fotos'
  if (AUFTRAG_DETAIL_TAB_IDS.has(tab as AuftragDetailTab)) return tab as AuftragDetailTab
  return null
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

  const [mainTab, setMainTab] = useState<AuftragDetailTab>('auftragdetails')
  const [vorOrtFocus, setVorOrtFocus] = useState<VorOrtAbschnitt | null>(null)

  useEffect(() => {
    const rawTab = searchParams.get('tab')
    const tab = resolveAuftragDetailTabFromQuery(rawTab)
    const focus = vorOrtAbschnittFromQuery(rawTab)
    if (focus) setVorOrtFocus(focus)
    if (tab === 'notizen' && !initial.notizen?.trim()) {
      setMainTab('stammdaten')
      return
    }
    if (tab) setMainTab(tab)
  }, [searchParams, initial.notizen])
  const [abschlussModal, setAbschlussModal] = useState(false)
  const [notfallModalOpen, setNotfallModalOpen] = useState(false)
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
      // Legacy: oft Abschlussbericht gemeint
      setMainTab('ausfuehrung')
      setVorOrtFocus('abschluss')
      return
    }
    if (hash === 'compliance' || hash === 'compliance-checkliste') {
      setMainTab('dokumente')
      return
    }
    const focus = vorOrtAbschnittFromQuery(hash)
    if (focus) {
      setMainTab('ausfuehrung')
      setVorOrtFocus(focus)
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

  /** Nur Aktionen, die nicht schon über Header-CTA oder Detail-Tabs erreichbar sind */
  const aktionenMenuItems = useMemo(() => {
    const extras: EntityMenuItem[] = [
      {
        icon: 'alert-triangle',
        label: 'Direkt beauftragen (Notfall)',
        onClick: () => setNotfallModalOpen(true),
      },
      ...(detail.angebot_id
        ? ([
            {
              icon: 'file-pencil',
              label: 'Angebot korrigieren',
              onClick: openAngebotKorrektur,
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
    ]

    return entityMenuToActionItems(
      buildEntityMenu(
        'auftrag',
        {
          name: projektName,
          status: detail.status,
          customer: {
            name: detail.kunden?.name ?? undefined,
            mail: detail.kunden?.email?.trim() || undefined,
          },
        },
        {
          onCopy: () => runDuplicateAuftrag(detail.id, router),
          // Admin Login nur Partner-/Kunden-Detail (UX2-6)
          onPortalLink: () => {
            if (!detail.kunde_id) {
              toast.error('Kein Kunde verknüpft — Portal-Link nicht möglich.')
              return
            }
            setPortalLinkModalOpen(true)
          },
          mail: detail.kunden?.email?.trim() || null,
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
    mailCompose,
    hauptvertraegeFuerNachtrag.length,
    openAngebotKorrektur,
    openNachtragErstellen,
    openNachunternehmervertrag,
    router,
    refresh,
    startTransition,
    istBauprojekt,
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
    />
  )

  const abschlussInhalt = (
    <AuftragAbschlussSection
      auftragId={detail.id}
      istAbgeschlossen={istAbgeschlossen}
      abschlussUrl={detail.abschlussdokumentation_url}
      abschlussGesendetAt={detail.abschlussdokumentation_gesendet_at}
      onRefresh={() => refresh()}
      embedded
    />
  )

  const ausfuehrungInhalt = (
    <AuftragVorOrtPanel
      focus={vorOrtFocus}
      leistungTabelle={
        <AuftragLeistungVorOrtTabelle
          auftragId={detail.id}
          positionen={detail.auftrag_positionen ?? []}
          gewerke={gewerke}
          kundeName={name}
          onChanged={() => refresh()}
        />
      }
      abschluss={abschlussInhalt}
      baustellenExtras={
        istBauprojekt ? (
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
        ) : undefined
      }
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

  const notizenInhalt = (
    <AuftragNotizenPanel
      auftragId={detail.id}
      initial={detail.notizen ?? ''}
      onSaved={() => refresh()}
    />
  )

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'auftragdetails',
      label: 'Auftragdetails',
      icon: 'clipboard-list',
      render: () => auftragdetailsInhalt,
    },
    {
      id: 'leistung',
      label: 'Leistungen',
      icon: 'list-details',
      count: posCount || undefined,
      render: () => leistungInhalt,
    },
    {
      id: 'stammdaten',
      label: 'Stammdaten',
      icon: 'user',
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
      id: 'finanzen',
      label: 'Zahlung & Rechnung',
      icon: 'calculator',
      render: () => finanzenInhalt,
    },
    {
      id: 'ausfuehrung',
      label: 'Vor Ort & Abschluss',
      icon: 'clipboard-list',
      render: () => ausfuehrungInhalt,
    },
    {
      id: 'aktivitaet',
      label: ACTIVITY_SECTIONS.verlauf,
      icon: 'history',
      count: timelineCount || undefined,
      render: () => <AuftragTimelineTab detail={detail} leadTimeline={leadTimeline} />,
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
    {
      id: 'notizen',
      label: ACTIVITY_SECTIONS.notizen,
      icon: 'messages',
      render: () => notizenInhalt,
    },
  ]

  return (
    <EntityDetailLayout
      phase="auftrag"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=auftrag"
      crumbBackLabel="Zurück zu den Suchergebnissen"
      className="space-y-4 pb-0"
      nextStep={naechsterSchrittAuftrag({
        status: detail.status,
        istStorniert,
        istAbgeschlossen,
      })}
      head={{
        title: projektName,
        badges: (
          <MockBadge kind={variantToMockBadgeKind(auftragStatus.variant)}>{auftragStatus.label}</MockBadge>
        ),
        meta: headMeta,
        actions: (
          <DetailActionsBar
            sheetTitle="Auftrag"
            primary={
              !istStorniert
                ? {
                    label: 'Nächste Rechnung',
                    icon: 'file-invoice',
                    onClick: () => openRechnungErstellen({ naechsterAbschlag: true }),
                  }
                : null
            }
            secondary={
              !istAbgeschlossen && !istStorniert
                ? {
                    label: 'Auftrag abschließen',
                    icon: 'checks',
                    onClick: openAuftragAbschliessen,
                  }
                : null
            }
            menuItems={aktionenMenuItems}
          />
        ),
      }}
    >
      <AuftragNotfallBanner
        istNotfall={Boolean(detail.ist_notfall)}
        verguetung={detail.notfall_verguetung}
      />
      <DetailShell
        groups={detailShellGroups}
        value={mainTab}
        onChange={(id) => setMainTab(id as AuftragDetailTab)}
      />

      <NotfallDirektBeauftragenModal
        open={notfallModalOpen}
        onClose={() => setNotfallModalOpen(false)}
        auftragId={detail.id}
        leadId={detail.lead_id}
        gewerkName={detail.auftrag_positionen?.[0]?.gewerk_name}
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
