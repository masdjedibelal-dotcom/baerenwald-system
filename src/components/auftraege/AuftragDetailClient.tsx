'use client'
import { useTransition } from '@/components/ui/action-busy'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { primaryCta } from '@/lib/vorgang/primary-cta'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailActionsBar } from '@/components/layout/DetailActionsBar'
import { PortalLoginIconButton } from '@/components/portal/PortalLoginIconButton'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { AuftragLeistungenTab } from '@/components/auftraege/AuftragDetailsTab'
import { AuftragAbschliessenSheet } from '@/components/auftraege/AuftragAbschliessenSheet'
import { AuftragStammdatenCard } from '@/components/auftraege/AuftragStammdatenCard'
import { HandwerkerBewertungModal } from '@/components/auftraege/HandwerkerBewertungModal'
import { handwerkerAusAuftrag } from '@/lib/handwerker/handwerker-aus-auftrag'
import { VorgangPhasenVerlauf } from '@/components/vorgang/VorgangPhasenVerlauf'
import {
  gewichteterFortschrittProzent,
  normalizeLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import { formatEurKurz } from '@/lib/vorgang/projekt-kontext-labels'
import {
  VorgangZahlungTab,
  type RechnungErstellenOpts,
} from '@/components/vorgang/VorgangZahlungTab'
import { useDetailQuickActions } from '@/components/vorgang/DetailQuickActions'
import { AuftragTimelineTab } from '@/components/auftraege/AuftragTimelineTab'
import { AuftragNotfallBanner } from '@/components/auftraege/AuftragNotfallBanner'
import { auftragIstBauprojekt } from '@/lib/auftraege/ist-bauprojekt'
import { AuftragDokumenteTab } from '@/components/auftraege/AuftragDokumenteTab'
import {
  AuftragComplianceTab,
} from '@/components/auftraege/AuftragComplianceTab'
import { zaehleAuftragDokumente } from '@/lib/auftraege/auftrag-dokumente-helpers'
import { auftragStatusDisplay } from '@/lib/status/status-display'
import { formatAuftragsNr, auftragFortschritt } from '@/lib/auftraege/auftrag-liste-helpers'
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
  loadNachtragBootstrap,
  type ProjektVertragWizardBootstrap,
} from '@/app/(dashboard)/vertraege/wizard-actions'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import { istHauptvertragFuerNachtrag } from '@/lib/vertraege/vertrag-nachtrag-helpers'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import { auftragPositionenFuerSumme } from '@/lib/auftraege/auftrag-position-aktiv'
import {
  auftragHatZahlungOffen,
  auftragSummenAusPositionen,
  berechneZahlungsplan,
  hatAktivenAbschlagsplan,
  naechsteAbschlagZumVersenden,
  parseZahlungsplan,
  zahlplanAbgerechnetAusLinks,
} from '@/lib/rechnungen/zahlungsplan'
import {
  defaultZahlungszielTage,
  type RechnungAuswahlZeile,
} from '@/lib/rechnungen/rechnung-wizard-types'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import { parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
import { useIsMobile } from '@/hooks/useIsMobile'
import { entityDetailTabLabel } from '@/lib/entity-detail/entity-detail-tabs'
import { VorgangAkteTab } from '@/components/vorgang/VorgangAkteTab'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { updateAuftragNotizen } from '@/app/(dashboard)/auftraege/actions'
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
  const isMobile = useIsMobile()

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

  const text = initial.trim()

  if (isMobile) {
    return (
      <div className="card">
        <div className="card-h">
          <div className="card-title title">
            <MockIcon ctx="emphasis" n="messages" size={16} />
            Notizen
          </div>
        </div>
        <div className="card-b">
          {text ? (
            <p className="akte-notiz-readonly whitespace-pre-wrap text-[length:var(--fs-text)] text-bw-text">
              {text}
            </p>
          ) : (
            <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
              Noch keine Notizen. Über „Notiz“ oben hinzufügen.
            </p>
          )}
        </div>
      </div>
    )
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

const AUFTRAG_DETAIL_DEFAULT_TAB: AuftragDetailTab = 'uebersicht'

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
  if (tab === 'todos' || tab === 'todo' || tab === 'aufgaben') return 'uebersicht'
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
  const { refresh } = useCrmRefresh()
  const isMobile = useIsMobile()
  const [detail, setDetail] = useState(initial)
  const [pending, startTransition] = useTransition()

  const kundeTel =
    detail.kunden?.telefon?.trim() || _leadDetail?.kontakt_telefon?.trim() || ''
  const kundeEmail =
    detail.kunden?.email?.trim() || _leadDetail?.kontakt_email?.trim() || ''
  const { quickBar, sheets: quickActionSheets } = useDetailQuickActions({
    telefon: kundeTel,
    email: kundeEmail,
    notiz: {
      kind: 'auftrag',
      auftragId: detail.id,
      initial: detail.notizen ?? '',
    },
    dokument: { kind: 'auftrag', auftragId: detail.id },
    onSaved: () => refresh(),
  })

  const [mainTab, setMainTab] = useState<AuftragDetailTab>(AUFTRAG_DETAIL_DEFAULT_TAB)
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
  const [abschliessenOpen, setAbschliessenOpen] = useState(false)
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
    setAbschliessenOpen(true)
  }, [])

  const openVertragWizard = useCallback((bootstrap: ProjektVertragWizardBootstrap) => {
    setVertragWizardBootstrap(bootstrap)
    setVertragWizardKey((k) => k + 1)
    setVertragWizardOpen(true)
  }, [])

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
    const parts: string[] = []
    if (projektName) parts.push(projektName)
    if (detail.created_at) parts.push(`erstellt ${formatDatum(detail.created_at)}`)
    return parts.filter(Boolean).join(' · ')
  }, [projektName, detail.created_at])

  const freigabeAusstehend = (_leadDetail?.org_freigabe_status ?? '').trim() === 'ausstehend'

  const positionenAktiv = useMemo(
    () => auftragPositionenFuerSumme(detail.auftrag_positionen),
    [detail.auftrag_positionen]
  )
  const leistungenErledigt = useMemo(
    () =>
      positionenAktiv.filter((p) => normalizeLeistungStatus(p.leistung_status) === 'erledigt')
        .length,
    [positionenAktiv]
  )
  const fortschrittPct = useMemo(() => {
    if (positionenAktiv.length) return gewichteterFortschrittProzent(positionenAktiv)
    return auftragFortschritt(detail)
  }, [positionenAktiv, detail])

  const auftragWertLabel = useMemo(() => {
    const ap = auftragPositionenFuerSumme(detail.auftrag_positionen)
    let netto = 0
    if (ap.length) {
      netto = auftragSummenAusPositionen(auftragPositionenToAngebotPositionen(ap)).netto
    } else {
      const ang0 = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
      const raw = (ang0 as { positionen?: unknown } | null)?.positionen
      netto = auftragSummenAusPositionen(normalizeAngebotPositionen(raw)).netto
    }
    const brutto = netto > 0 ? netto * (1 + leistungenMwstSatz / 100) : 0
    return formatEurKurz(brutto > 0 ? brutto : null)
  }, [detail.auftrag_positionen, detail.angebote, leistungenMwstSatz])

  const handwerkerKurz = useMemo(() => {
    const list = handwerkerAusAuftrag(detail)
    if (!list.length) return null
    return list[0]?.firma?.trim() || list[0]?.name || null
  }, [detail])

  const auftragDatumRange = useMemo(() => {
    const start = detail.start_datum ? formatDatum(detail.start_datum) : null
    const end = detail.end_datum
      ? formatDatum(detail.end_datum)
      : detail.created_at
        ? formatDatum(detail.created_at)
        : null
    if (start && detail.end_datum) return `${start}–${formatDatum(detail.end_datum)}`
    if (start && end && start !== end) return `${start}–${end}`
    if (start) return start
    if (detail.created_at) return formatDatum(detail.created_at)
    return null
  }, [detail.start_datum, detail.end_datum, detail.created_at])

  const phasenExtras = useMemo(() => {
    const auftragKopfParts = [auftragDatumRange, handwerkerKurz].filter(Boolean)
    const aktiveRe = (projektKontext?.rechnungen ?? []).filter(
      (r) => String(r.status).toLowerCase() !== 'storniert'
    )
    const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
    const plan = parseZahlungsplan(
      (ang as { zahlungsplan?: unknown } | null | undefined)?.zahlungsplan
    )
    const geplant = plan?.zeilen?.length ?? 0
    const gestellt = aktiveRe.length
    let rechnungKopf: string | undefined
    if (gestellt > 0 && geplant > 0) rechnungKopf = `${gestellt} von ${geplant} gestellt`
    else if (gestellt > 0) rechnungKopf = `${gestellt} gestellt`

    const statusParts = Array.from(
      new Set(
        aktiveRe
          .map((r) => {
            const s = String(r.status).toLowerCase()
            if (s === 'bezahlt') return 'Bezahlt'
            if (s === 'gesendet' || s === 'versendet') return 'Versendet'
            if (s === 'entwurf') return 'Entwurf'
            if (s === 'ueberfaellig' || s === 'überfällig') return 'Überfällig'
            return null
          })
          .filter(Boolean)
      )
    ) as string[]

    const reBetrag = aktiveRe.reduce((s, r) => s + (r.brutto ?? 0), 0)

    return {
      auftrag: {
        kopf: auftragKopfParts.length
          ? auftragKopfParts.join(' · ')
          : undefined,
        sub:
          positionenAktiv.length > 0
            ? `${leistungenErledigt} von ${positionenAktiv.length} Leistungen erledigt`
            : undefined,
        betrag: auftragWertLabel !== '—' ? auftragWertLabel : null,
        props: [
          { k: 'Titel', v: detail.titel?.trim() || projektName || '—' },
          {
            k: 'Zeitraum',
            v: auftragDatumRange || (detail.created_at ? formatDatum(detail.created_at) : '—'),
          },
          { k: 'Status', v: auftragStatus.label },
          ...(handwerkerKurz ? [{ k: 'Handwerker', v: handwerkerKurz }] : []),
          {
            k: 'Leistungen',
            v: positionenAktiv.length
              ? `${leistungenErledigt} von ${positionenAktiv.length} erledigt`
              : '—',
          },
          { k: 'Auftragswert', v: auftragWertLabel },
        ],
      },
      rechnung: {
        kopf: rechnungKopf,
        sub: statusParts.length ? statusParts.join(' · ') : undefined,
        betrag: gestellt > 0 ? formatEurKurz(reBetrag) : null,
      },
    }
  }, [
    auftragDatumRange,
    handwerkerKurz,
    projektKontext?.rechnungen,
    detail.angebote,
    detail.titel,
    detail.created_at,
    positionenAktiv.length,
    leistungenErledigt,
    auftragWertLabel,
    auftragStatus.label,
    projektName,
  ])

  const istStorniert = detail.status === 'storniert'


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
      initialLeistungenView={
        vorOrtAbschnittFromQuery(searchParams.get('tab')) === 'bautagebuch'
          ? 'bautagebuch'
          : 'leistungen'
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

  const zahlungsplanParsed = useMemo(() => {
    const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
    return parseZahlungsplan(
      (ang as { zahlungsplan?: unknown } | null | undefined)?.zahlungsplan
    )
  }, [detail.angebote])

  /** Nächste Abschlags-Rate zum Versenden (Entwurf bevorzugt). */
  const naechsterAbschlagVersand = useMemo(() => {
    if (!hatAktivenAbschlagsplan(zahlungsplanParsed) || !zahlungsplanParsed) return null
    const links = rechnungenListe.map((r) => ({
      id: r.id,
      status: String(r.status),
      zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id ?? null,
      rechnung_art: r.rechnung_art ?? null,
      brutto: r.brutto,
      beleg_typ: r.beleg_typ ?? null,
    }))
    const kontext = berechneZahlungsplan(
      zahlungsplanParsed,
      auftragNettoSumme,
      19,
      zahlplanAbgerechnetAusLinks(links)
    )
    return naechsteAbschlagZumVersenden(kontext, links)
  }, [zahlungsplanParsed, rechnungenListe, auftragNettoSumme])

  /** Offener RE-Entwurf → Primary „Senden/Bearbeiten“ statt erneut „Erstellen“. */
  const offenerRechnungEntwurfId = useMemo(() => {
    if (naechsterAbschlagVersand?.rechnungId) return naechsterAbschlagVersand.rechnungId
    const draft = rechnungenListe.find((r) => {
      if (String(r.status) !== 'entwurf') return false
      if (String(r.beleg_typ ?? '') === 'gutschrift') return false
      return true
    })
    return draft?.id ?? null
  }, [rechnungenListe, naechsterAbschlagVersand])

  const hatAbschlagZumSenden = Boolean(
    naechsterAbschlagVersand && !zahlungOffen && detail.status === 'abgeschlossen'
  )

  const openRechnungBearbeiten = useCallback(
    (rechnungId: string) => {
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
    },
    [detail.id, openRechnungWizard]
  )

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
      onEditInvoice={openRechnungBearbeiten}
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
      {stammdatenInhalt}
      <VorgangPhasenVerlauf
        kontext={projektKontext}
        fromRef={{ kind: 'auftrag', id: detail.id }}
        lead={_leadDetail}
        extras={phasenExtras}
        onSaved={() => refresh()}
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
      render: () => <AuftragTimelineTab detail={detail} leadTimeline={leadTimeline} />,
    },
  ]

  return (
    <EntityDetailLayout
      phase="auftrag"
      projektKontext={projektKontext}
      crumbBackHref="/vorgaenge?tab=auftrag&lifecycle=offen"
      crumbBackLabel="Zurück zu den Suchergebnissen"
      crumbSectionLabel="Aufträge"
      breadcrumbTitle={projektName}
      className="space-y-4 pb-0"
      wiedervorlageDatum={detail.wiedervorlage_datum}
      wiedervorlageNotiz={detail.wiedervorlage_notiz}
      wiedervorlageEntity="auftrag"
      wiedervorlageEntityId={detail.id}
      onWiedervorlageSaved={() => refresh()}
      banner={
        <AuftragNotfallBanner
          istNotfall={Boolean(detail.ist_notfall)}
          verguetung={detail.notfall_verguetung}
        />
      }
      quickBar={quickBar}
      head={{
        title: name,
        titleBadges: freigabeAusstehend ? (
          <StatusBadge status="termin" label="Wartet auf Freigabe" />
        ) : null,
        badges: (
          <StatusBadge status={detail.status} label={auftragStatus.label} />
        ),
        meta: headMeta,
        titleTrailing: (
          <PortalLoginIconButton
            kundeId={detail.kunde_id ?? detail.kunden?.id}
            label="Kundenportal öffnen"
          />
        ),
        actions: (
          <DetailActionsBar
            sheetTitle="Auftrag"
            primary={(() => {
              if (istStorniert) return null
              const cta = primaryCta('auftrag', detail.status, {
                abnahmeFaellig: detail.status === 'abnahme',
                rechnungBezahlt: !zahlungOffen && detail.status === 'abgeschlossen',
                naechsterAbschlagSenden: hatAbschlagZumSenden,
              })
              if (!cta) return null
              if (cta.id === 'rechnung_erstellen' && offenerRechnungEntwurfId) {
                return {
                  label: hatAbschlagZumSenden
                    ? 'Nächsten Abschlag senden'
                    : 'Rechnung bearbeiten',
                  icon: hatAbschlagZumSenden ? 'send' : 'pencil',
                  onClick: () => openRechnungBearbeiten(offenerRechnungEntwurfId),
                }
              }
              const onClick = () => {
                if (cta.id === 'abnahme_starten' || cta.id === 'auftrag_abschliessen') {
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
            secondary={
              !istStorniert && detail.angebot_id
                ? {
                    label: 'Auftrag bearbeiten',
                    icon: 'pencil',
                    onClick: openAngebotKorrektur,
                    disabled: pending,
                  }
                : null
            }
            menuItems={[]}
          />
        ),
      }}
    >
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

      <AuftragAbschliessenSheet
        open={abschliessenOpen}
        onClose={() => setAbschliessenOpen(false)}
        auftragId={detail.id}
        positionen={detail.auftrag_positionen ?? []}
        onDone={() => refresh()}
        onNachRechnung={() => openRechnungErstellen({ naechsterAbschlag: true })}
      />

      {quickActionSheets}

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
