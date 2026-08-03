'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { AngebotWizardMailPreview } from '@/components/angebote/AngebotWizardMailPreview'
import { AngebotWizardPdfPreview } from '@/components/angebote/AngebotWizardPdfPreview'
import { AngebotWizardRechtlicheHinweiseCard } from '@/components/angebote/AngebotWizardRechtlicheHinweiseCard'
import {
  buildGewerkHandwerkerZuweisungen,
  gewerkHandwerkerZuweisungenToMaps,
  type GewerkHandwerkerZuweisung,
} from '@/components/angebote/AngebotWizardHandwerkerStep'
import {
  MetaCrowButton,
  TotBand,
} from '@/components/angebote/AngebotWizardCanvasMeta'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { MockField } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { ACTION_ICON_STROKE } from '@/components/ui/ActionIcon'
import { Check, FileText } from 'lucide-react'
import { MockZahlfristSeg } from '@/components/mock-ui/MockZahlfristSeg'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { KundeModal } from '@/components/kunden/KundeModal'
import { DateInput } from '@/components/ui/DateInput'
import { Modal } from '@/components/ui/Modal'
import { PosBoard } from '@/components/posboard/PosBoard'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import { KUNDE_MAIL_BCC_HINT } from '@/lib/mail-constants'
import {
  normalizeVorgangWiederkehr,
  WIEDERKEHR_TURNUS_LABELS,
  WIEDERKEHR_TURNUS_VALUES,
  type VorgangWiederkehr,
  type WiederkehrTurnus,
} from '@/lib/vorgang/wiederkehrend'
import {
  saveAngebotWizardDraft,
  sendAngebotWizard,
} from '@/app/(dashboard)/angebote/wizard-actions'
import { createAnfrageFuerKunde } from '@/app/(dashboard)/neu/fab-neu-actions'
import { angebotWizardPositionenFromLead } from '@/lib/angebote/angebot-positionen-from-lead'
import {
  angebotMetaPatchFromZahlfrist,
  angebotZahlfristText,
  zahlfristSegFromAngebotMeta,
} from '@/lib/angebote/angebot-zahlfrist'
import {
  defaultProjektBeschreibungText,
  defaultWizardMeta,
  initialDokumentTypFromLead,
  resolveAngebotKundeTyp,
  syncProjektTitelInBeschreibung,
  wizardPositionenAlsFestpreis,
  type AngebotDokumentTyp,
  type AngebotVariantenPersistJson,
  type AngebotWizardBootstrap,
  type AngebotWizardMeta,
  type WizardPosition,
} from '@/lib/angebote/angebot-wizard-types'
import {
  summenAusPositionen,
  summenKostenaufstellungAusPositionen,
} from '@/lib/angebot-positionen'
import {
  kannHinweis13bAngebot,
  kannHinweis35aAngebot,
} from '@/lib/angebote/angebot-rechtshinweise'
import { kundeZeigt35a, parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import { angebotPositionenToWizardZeilen } from '@/lib/angebote/wizard-positionen-laden'
import { findAnfahrtZeilen } from '@/lib/anfahrt-angebot'
import {
  dokumentArtikelToWizardPosition,
  dokumentZeilenToAngebotPositionen,
  formatEurBetrag,
  neueArtikelZeile,
  wizardPositionToDokumentZeile,
  type DokumentArtikelZeile,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import { isValidEmail } from '@/lib/email-recipients'
import { fetchKundenObjekte } from '@/app/actions/kunden-objekte'
import {
  kundentypLabel,
  leadKontaktAnzeigeName,
  leadVertragsKundeId,
  resolveLeadKunde,
  resolveLeadPreisAnzeige,
} from '@/lib/lead-display-helpers'
import { normalizeKundeNamen } from '@/lib/kunde-namen'
import {
  istKundeFirmaPflichtTyp,
  kundeStrasseHausnummerZeile,
} from '@/lib/kunde-stammdaten'
import { kundenObjektKurzlabel } from '@/lib/kunden-objekte'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { mailAnredeFromKundeTyp } from '@/lib/mail/anrede'
import {
  dokumentZeilenToPosBoardLines,
  posBoardLinesToDokumentZeilen,
  type PosBoardLine,
} from '@/lib/posboard/pos-board-line'
import type { Zahlungsplan } from '@/lib/rechnungen/zahlungsplan'
import {
  ANGEBOT_MAIL_BOX_MARKER,
  angebotMailFullTextForEditor,
  defaultAngebotEinleitungText,
  isDefaultAngebotEinleitung,
  parseAngebotMailFullTextFromEditor,
} from '@/lib/templates/angebot-mail'
import type { KundeAnredeKontext } from '@/lib/kunde-rechnungsempfaenger'
import type { AngebotProjektFoto } from '@/lib/angebote/angebot-projekt-fotos'
import type { AngebotPosition, Gewerk, Handwerker, Kunde, KundenObjekt, LeadDetail, Preisliste } from '@/lib/types'
import { BEREICH_LABELS, cn, formatDatum } from '@/lib/utils'
import type { ZahlfristSeg } from '@/lib/zahlfrist'

function kundenName(lead: LeadDetail) {
  return leadKontaktAnzeigeName(lead)
}

type WizardSheetId =
  | 'kunde'
  | 'dokument'
  | 'zahlung'
  | 'versand'
  | 'vorschau'
  | null

/** Bestehende HW-Zuweisung aus Bootstrap-Positionen (handwerker_id pro Gewerk). */
function zuweisungenFromBootstrapPositionen(
  positionen: AngebotPosition[] | null | undefined
): GewerkHandwerkerZuweisung[] {
  if (!positionen?.length) return []
  const seen = new Set<string>()
  const out: GewerkHandwerkerZuweisung[] = []
  for (const p of positionen) {
    const gid = p.gewerk_id?.trim()
    const hid = p.handwerker_id?.trim()
    if (!gid || !hid || seen.has(gid)) continue
    seen.add(gid)
    out.push({
      gewerk_id: gid,
      gewerk_name: p.gewerk_name?.trim() || 'Gewerk',
      handwerker_id: hid,
      aufgabe_notiz: '',
    })
  }
  return out
}

function projektLabel(lead: LeadDetail) {
  const bereiche = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  if (bereiche.length) return bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
  return leadSituationDisplay(lead.situation) || 'Projekt'
}

/**
 * Angebots-Wizard — DocumentCanvas 1:1 Mock:
 * links Positionen + Summen, rechts Meta-Crows → Sheets (Kunde/Dokument/Zahlung/Versand),
 * Header: Vorschau · ✓ (Popover Speichern/Senden); X schließt (kein Footer-DocBar).
 */
export function AngebotWizard({
  lead,
  gewerke,
  preislisten,
  handwerker: _handwerker = [],
  firm: firmProp,
  bootstrap = null,
  deferredLeadCreate = false,
  initialStep,
  focusField,
  onClose,
  onDone,
  onSaved,
}: {
  lead: LeadDetail
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  /** @deprecated HW-Schritt entfernt — Prop bleibt für Aufrufer-Kompatibilität */
  handwerker?: Handwerker[]
  firm?: FirmenEinstellungen
  kundenObjekte?: KundenObjekt[]
  bootstrap?: AngebotWizardBootstrap | null
  /**
   * FAB „Neues Angebot“: Lead-ID ist zunächst leer.
   * Anfrage wird erst beim ersten Speichern/Fertigstellen angelegt.
   */
  deferredLeadCreate?: boolean
  /** Deep-Link vom Assistenten: 1–5 */
  initialStep?: number | null
  /** Deep-Link Fokus: titel | beschreibung | positionen */
  focusField?: string | null
  onClose: () => void
  onDone?: (
    angebotId: string,
    meta?: { mode: 'saved' | 'sent'; auftragKorrektur?: boolean }
  ) => void
  onSaved?: (angebotId: string) => void
}) {
  void _handwerker
  const router = useRouter()
  const firm = firmProp ?? defaultFirmenEinstellungen()
  const [leadState, setLeadState] = useState(lead)

  useEffect(() => {
    setLeadState(lead)
  }, [lead])

  const name = kundenName(leadState)
  const projekt = projektLabel(leadState)
  const melder = resolveLeadKunde(leadState.kunden)
  const ag = leadState.auftraggeber
  const isHv = Boolean(leadState.auftraggeber_kunde_id || ag?.id)
  const kundeId = leadVertragsKundeId(leadState)
  const sheetKunde = (isHv ? ag : melder) ?? null
  const leistungsumfangInitial =
    bereicheFuerAnzeige(leadState.bereiche, leadState.situation)
      .map((b) => BEREICH_LABELS[b] ?? b)
      .join(' & ') || projekt
  const kundeTyp = resolveAngebotKundeTyp(
    isHv ? ag?.typ ?? 'hausverwaltung' : melder?.typ,
    isHv ? 'hausverwaltung' : leadState.kundentyp
  )
  const budgetAnzeige = resolveLeadPreisAnzeige(
    leadState.kanal,
    leadState.budget_ca,
    leadState.preis_min,
    leadState.preis_max,
    leadState.funnel_daten
  )
  const sheetNamen = normalizeKundeNamen({
    typ: sheetKunde?.typ ?? kundeTyp,
    name: sheetKunde?.name,
    vorname: sheetKunde?.vorname,
    nachname: sheetKunde?.nachname,
    funnelDaten: leadState.funnel_daten,
    kontaktName: leadState.kontakt_name,
  })
  const sheetFirma = istKundeFirmaPflichtTyp(sheetKunde?.typ ?? kundeTyp)
    ? (
        (isHv ? ag?.org_anzeigename?.trim() : null) ||
        sheetKunde?.name?.trim() ||
        sheetNamen.name.trim() ||
        ''
      )
    : ''
  const sheetAnschrift = sheetKunde ? kundeStrasseHausnummerZeile(sheetKunde) : null
  const sheetStadt = [sheetKunde?.plz?.trim(), sheetKunde?.ort?.trim()]
    .filter(Boolean)
    .join(' ')
  const sheetEmail = (
    sheetKunde?.email ?? leadState.kontakt_email ?? ''
  ).trim()
  const sheetTelefon = (
    sheetKunde?.telefon ?? leadState.kontakt_telefon ?? ''
  ).trim()
  const sheetKundentypLabel = kundentypLabel(sheetKunde?.typ ?? kundeTyp)
  const crowKundeValue =
    sheetFirma ||
    [sheetNamen.vorname, sheetNamen.nachname].filter(Boolean).join(' ') ||
    name

  const leadZeilen = useMemo(
    () =>
      wizardPositionenAlsFestpreis(
        angebotWizardPositionenFromLead(leadState, gewerke, preislisten)
      ).map(wizardPositionToDokumentZeile),
    [leadState, gewerke, preislisten]
  )

  const bootstrapZeilen = useMemo(() => {
    if (!bootstrap?.positionen?.length) return null
    return angebotPositionenToWizardZeilen(bootstrap.positionen, preislisten, gewerke)
  }, [bootstrap, preislisten, gewerke])

  const initialZeilen = bootstrapZeilen?.length ? bootstrapZeilen : leadZeilen

  const defaultMeta = useMemo(
    () =>
      defaultWizardMeta(name, projekt, leistungsumfangInitial, undefined, kundeTyp, firm),
    [name, projekt, leistungsumfangInitial, kundeTyp, firm]
  )

  const [mounted, setMounted] = useState(false)
  const istAuftragKorrektur = Boolean(bootstrap?.auftragKorrektur?.auftragId)
  const istNachtrag = Boolean(bootstrap?.nachtragZu?.auftragId)
  /**
   * Neu: zuerst Art (Einmalig/Wiederkehrend), bei Einmalig dann Layout (Einfach/Komplex).
   * Wiederkehrend (Wartung/Winterdienst) → immer Einfach, ohne Komplex-Schritt.
   */
  const needsTypGate = !bootstrap?.angebotId && !istAuftragKorrektur && !istNachtrag
  const [typGateStep, setTypGateStep] = useState<'art' | 'layout' | null>(
    () => (needsTypGate ? 'art' : null)
  )
  const typConfirmed = typGateStep === null
  const [sheet, setSheet] = useState<WizardSheetId>(() => {
    const s = Number(initialStep)
    if (s === 4) return 'vorschau'
    if (s === 5) return 'versand'
    if (focusField === 'titel' || focusField === 'beschreibung') return 'dokument'
    return null
  })
  const [kundeEditOpen, setKundeEditOpen] = useState(false)
  const [hvObjekte, setHvObjekte] = useState<KundenObjekt[]>([])
  const [fotoLightboxUrl, setFotoLightboxUrl] = useState<string | null>(null)
  const [mailBodyDraft, setMailBodyDraft] = useState('')
  const [, setPositions] = useState<WizardPosition[]>(() =>
    initialZeilen
      .filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      .map(dokumentArtikelToWizardPosition)
  )
  const [zeilen, setZeilen] = useState<DokumentZeile[]>(() => initialZeilen)
  const [hwZuweisungen, setHwZuweisungen] = useState<GewerkHandwerkerZuweisung[]>(() =>
    buildGewerkHandwerkerZuweisungen(
      initialZeilen,
      zuweisungenFromBootstrapPositionen(bootstrap?.positionen)
    )
  )
  const [mitAnfahrt, setMitAnfahrt] = useState(() => findAnfahrtZeilen(initialZeilen).length > 0)
  const [meta, setMeta] = useState<AngebotWizardMeta>(() => {
    const base = bootstrap?.meta ?? defaultMeta
    if (bootstrap?.meta?.kunde_objekt_id) return base
    if (leadState.kunde_objekt_id) {
      return { ...base, kunde_objekt_id: leadState.kunde_objekt_id }
    }
    return base
  })
  const [dokumentTyp, setDokumentTyp] = useState<AngebotDokumentTyp>(
    () => bootstrap?.dokumentTyp ?? initialDokumentTypFromLead(leadState.bereiche, leadState.situation)
  )
  const [wiederkehr, setWiederkehr] = useState<VorgangWiederkehr>(() =>
    normalizeVorgangWiederkehr(
      bootstrap
        ? {
            ist_wiederkehrend: bootstrap.ist_wiederkehrend,
            wiederkehr_turnus: bootstrap.wiederkehr_turnus,
          }
        : {
            ist_wiederkehrend: lead.ist_wiederkehrend,
            wiederkehr_turnus: lead.wiederkehr_turnus,
          }
    )
  )
  const [projektbeschreibung, setProjektbeschreibung] = useState(() =>
    bootstrap?.projektbeschreibung?.trim() ||
      defaultProjektBeschreibungText(
        bootstrap?.meta.leistungsumfang?.trim() || leistungsumfangInitial
      )
  )
  const [projektFotos, setProjektFotos] = useState<AngebotProjektFoto[]>(
    () => bootstrap?.projektFotos ?? []
  )
  const [projektUploading, setProjektUploading] = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const [variantenPersist] = useState<AngebotVariantenPersistJson | null>(
    () => bootstrap?.varianten ?? null
  )
  const [wichtigeHinweisePersist] = useState(() => bootstrap?.wichtige_hinweise?.trim() ?? '')
  const [zahlungsplan] = useState<Zahlungsplan | null>(() => bootstrap?.zahlungsplan ?? null)
  const [angebotId, setAngebotId] = useState<string | null>(bootstrap?.angebotId ?? null)
  const auftragKorrekturId = bootstrap?.auftragKorrektur?.auftragId ?? null
  const wizardTitel = istNachtrag ? 'Nachtrag' : 'Angebot'
  const [saving, setSaving] = useState(false)
  const [draftDirty, setDraftDirty] = useState(() => !bootstrap?.angebotId)
  const savedSnapshotRef = useRef<string | null>(null)
  const draftSnapshotRef = useRef('')

  const [mailTo, setMailTo] = useState<string[]>(() =>
    sheetEmail && isValidEmail(sheetEmail) ? [sheetEmail] : []
  )
  const [mailCc, setMailCc] = useState<string[]>([])
  const [mailBetreff, setMailBetreff] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const zahlfristInit = zahlfristSegFromAngebotMeta(meta)
  const [zahlfristSeg, setZahlfristSeg] = useState<ZahlfristSeg>(() => zahlfristInit.seg)
  const [zahlfristDatum, setZahlfristDatum] = useState(() => zahlfristInit.datum)

  useEffect(() => {
    if (mailTo.length) return
    if (sheetEmail && isValidEmail(sheetEmail)) setMailTo([sheetEmail])
  }, [sheetEmail, mailTo.length])

  useEffect(() => {
    if (sheet !== 'kunde' || !isHv) {
      setHvObjekte([])
      return
    }
    const hvId = (ag?.id || leadState.auftraggeber_kunde_id || '').trim()
    if (!hvId) {
      setHvObjekte([])
      return
    }
    let cancelled = false
    void fetchKundenObjekte(hvId).then((rows) => {
      if (!cancelled) setHvObjekte(rows)
    })
    return () => {
      cancelled = true
    }
  }, [sheet, isHv, ag?.id, leadState.auftraggeber_kunde_id])

  const mailAnrede = meta.anrede ?? mailAnredeFromKundeTyp(kundeTyp)
  const mailKundeKontext = useMemo((): KundeAnredeKontext => {
    const k = sheetKunde
    return {
      name: k?.name?.trim() || name,
      vorname: k?.vorname ?? sheetNamen.vorname,
      nachname: k?.nachname ?? sheetNamen.nachname,
      typ: k?.typ ?? kundeTyp,
      ansprechpartner:
        k && 'ansprechpartner' in k
          ? (k as { ansprechpartner?: string | null }).ansprechpartner
          : null,
    }
  }, [sheetKunde, name, sheetNamen.vorname, sheetNamen.nachname, kundeTyp])

  useEffect(() => {
    if (sheet !== 'versand') return
    setMailBodyDraft(
      angebotMailFullTextForEditor(
        meta.einleitung,
        meta.schluss,
        mailAnrede,
        meta.leistungsumfang.trim() || projekt,
        mailKundeKontext
      )
    )
    // Nur beim Öffnen des Versand-Sheets neu aufbauen — nicht bei jedem Tastendruck.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open sync
  }, [sheet])

  const defaultMailBetreff = `Ihr Angebot — ${meta.titel.trim() || projekt}`
  useEffect(() => {
    setMailBetreff((prev) => {
      if (!prev.trim()) return defaultMailBetreff
      if (prev.startsWith('Ihr Angebot — ')) return defaultMailBetreff
      return prev
    })
  }, [defaultMailBetreff])

  const draftSnapshot = useMemo(
    () =>
      JSON.stringify({
        zeilen,
        meta,
        dokumentTyp,
        wiederkehr,
        projektbeschreibung,
        projektFotos,
        mitAnfahrt,
        zahlungsplan,
        zahlfristSeg,
        zahlfristDatum,
        hwZuweisungen,
      }),
    [
      zeilen,
      meta,
      dokumentTyp,
      wiederkehr,
      projektbeschreibung,
      projektFotos,
      mitAnfahrt,
      zahlungsplan,
      zahlfristSeg,
      zahlfristDatum,
      hwZuweisungen,
    ]
  )
  draftSnapshotRef.current = draftSnapshot

  useEffect(() => {
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = draftSnapshot
      return
    }
    setDraftDirty(draftSnapshot !== savedSnapshotRef.current)
  }, [draftSnapshot])

  const positionenFuerSummen = useMemo(
    () => dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke),
    [zeilen, firm, gewerke]
  )
  const lohnNettoPdf = useMemo(() => {
    const ka = summenKostenaufstellungAusPositionen(positionenFuerSummen)
    return ka?.lohn_netto ?? 0
  }, [positionenFuerSummen])
  const hinweis13bErlaubt = kannHinweis13bAngebot(kundeTyp, firm)
  const hinweis35aErlaubt = kannHinweis35aAngebot(kundeTyp, firm, lohnNettoPdf)
  const reverseChargeAktiv = Boolean(meta.hinweis_13b && hinweis13bErlaubt)
  const firmMwstSatz = Math.max(
    0,
    parseInt(String(firm.mwst_satz ?? '19'), 10) || DEFAULT_MWST_SATZ
  )
  const effektiverMwstSatz =
    reverseChargeAktiv || parseKleinunternehmerSetting(firm.kleinunternehmer)
      ? 0
      : firmMwstSatz
  const mailSummen = useMemo(
    () => summenAusPositionen(positionenFuerSummen, effektiverMwstSatz),
    [positionenFuerSummen, effektiverMwstSatz]
  )

  useEffect(() => {
    setMeta((m) => {
      let next = m
      if (m.hinweis_13b && !hinweis13bErlaubt) {
        next = { ...next, hinweis_13b: false }
      }
      if (
        m.hinweis_35a &&
        (!kundeZeigt35a(kundeTyp) || parseKleinunternehmerSetting(firm.kleinunternehmer))
      ) {
        next = { ...next, hinweis_35a: false }
      }
      return next === m ? m : next
    })
  }, [kundeTyp, firm, hinweis13bErlaubt])

  useEffect(() => {
    const hat = findAnfahrtZeilen(zeilen).length > 0
    setMitAnfahrt((prev) => (prev === hat ? prev : hat))
    setMeta((m) => (m.mit_anfahrt === hat ? m : { ...m, mit_anfahrt: hat }))
  }, [zeilen])

  useEffect(() => {
    setHwZuweisungen((prev) => buildGewerkHandwerkerZuweisungen(zeilen, prev))
  }, [zeilen])

  function syncZeilenToPositions(next: DokumentZeile[]) {
    setZeilen(next)
    setPositions(
      next
        .filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
        .map(dokumentArtikelToWizardPosition)
    )
  }

  function onPosBoardChange(next: PosBoardLine[]) {
    syncZeilenToPositions(posBoardLinesToDokumentZeilen(next, zeilen))
  }

  const posBoardLines = useMemo(() => dokumentZeilenToPosBoardLines(zeilen), [zeilen])

  const posSuggestContext = useMemo(() => {
    const text = [
      meta.leistungsumfang,
      projektbeschreibung,
      leadSituationDisplay(leadState.situation),
      bereicheFuerAnzeige(leadState.bereiche, leadState.situation).join(' '),
    ]
      .map((s) => String(s ?? '').trim())
      .filter(Boolean)
      .join('\n')
    if (!text.trim()) return null
    return {
      text,
      gewerkHints: bereicheFuerAnzeige(leadState.bereiche, leadState.situation),
    }
  }, [
    meta.leistungsumfang,
    projektbeschreibung,
    leadState.situation,
    leadState.bereiche,
  ])
  const gewerkNamen = useMemo(
    () => gewerke.map((g) => g.name).filter(Boolean),
    [gewerke]
  )

  const zahlfristText = useMemo(
    () => zahlfristAnzeigeFromLocal(zahlfristSeg, zahlfristDatum),
    [zahlfristSeg, zahlfristDatum]
  )

  /** PosBoard-Titel = Angebotstitel (wie Rechnungstitel), kein „Positionen · …“. */
  const angebotTitel =
    meta.titel.trim() ||
    (dokumentTyp === 'projekt'
      ? meta.leistungsumfang.trim() || projekt
      : projekt)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function applyZahlfrist(seg: ZahlfristSeg, datum = zahlfristDatum) {
    setZahlfristSeg(seg)
    if (seg === 'datum') setZahlfristDatum(datum)
    setMeta((m) => ({ ...m, ...angebotMetaPatchFromZahlfrist(seg, datum) }))
  }

  async function uploadProjektFotoFiles(files: File[]) {
    if (!files.length) return
    setProjektUploading(true)
    try {
      const leadId = await ensureLeadId()
      if (!leadId) return
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`/api/anfragen/${leadId}/angebot-projekt-foto`, {
          method: 'POST',
          body: fd,
        })
        const js = (await res.json().catch(() => ({}))) as { url?: unknown; error?: unknown }
        if (!res.ok) {
          toast.error(typeof js.error === 'string' ? js.error : 'Foto-Upload fehlgeschlagen')
          break
        }
        if (typeof js.url === 'string') {
          const url = js.url
          setProjektFotos((prev) =>
            prev.some((f) => f.url === url) ? prev : [...prev, { url, beschreibung: '' }]
          )
        }
      }
    } finally {
      setProjektUploading(false)
    }
  }

  const ensureLeadId = useCallback(async (): Promise<string | null> => {
    const existing = leadState.id?.trim()
    if (existing) return existing
    if (!deferredLeadCreate) {
      toast.error('Keine Anfrage verknüpft.')
      return null
    }
    const kid = leadVertragsKundeId(leadState)?.trim()
    if (!kid) {
      toast.error('Kein Kunde verknüpft — Anfrage kann nicht angelegt werden.')
      return null
    }
    const r = await createAnfrageFuerKunde(kid)
    if (!r.ok) {
      toast.error(r.message)
      return null
    }
    setLeadState((prev) => ({ ...prev, id: r.leadId }))
    return r.leadId
  }, [deferredLeadCreate, leadState])

  const persistDraft = useCallback(
    async (opts?: { notify?: boolean; manageBusy?: boolean }): Promise<string | null> => {
      if (!kundeId) {
        toast.error('Kein Kunde verknüpft — Angebot kann nicht gespeichert werden.')
        return null
      }
      const leadId = await ensureLeadId()
      if (!leadId) return null
      const titelOk = meta.titel.trim() || meta.leistungsumfang.trim()
      if (!titelOk) {
        toast.error('Bitte einen Angebotstitel angeben.')
        return null
      }
      const artikelA = zeilen.filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      if (!artikelA.length) {
        toast.error('Mindestens eine Artikel-Position erforderlich.')
        return null
      }
      if (artikelA.some((z) => !z.bezeichnung.trim())) {
        toast.error('Bitte bei allen Artikel-Positionen eine Bezeichnung eintragen.')
        return null
      }

      const metaPersist: AngebotWizardMeta = {
        ...meta,
        ...angebotMetaPatchFromZahlfrist(zahlfristSeg, zahlfristDatum),
        leistungsumfang: meta.leistungsumfang.trim() || meta.titel.trim() || projekt,
        mit_anfahrt: mitAnfahrt,
      }

      const manageBusy = opts?.manageBusy !== false
      if (manageBusy) {
        setSaving(true)
        actionBusy.show('Wird gespeichert…')
      }
      try {
        const { positionQueues, notizenByGewerk } = gewerkHandwerkerZuweisungenToMaps(hwZuweisungen)
        const res = await saveAngebotWizardDraft({
          angebotId,
          lead_id: leadId,
          kunde_id: kundeId,
          positionen: dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke),
          artikelFuerPreislisteSync: artikelA,
          meta: metaPersist,
          dokument_typ: dokumentTyp,
          projektbeschreibung: projektbeschreibung.trim() || null,
          fotos_urls: projektFotos,
          wichtige_hinweise:
            dokumentTyp === 'projekt' ? wichtigeHinweisePersist.trim() || null : undefined,
          varianten: dokumentTyp === 'projekt' ? variantenPersist : null,
          handwerker_zuweisungen: positionQueues,
          handwerker_aufgabe_notizen: notizenByGewerk,
          zahlungsplan:
            metaPersist.zahlungsbedingungen === 'abschlagsplan' ||
            metaPersist.zahlungsbedingungen === 'anzahlung_50'
              ? zahlungsplan
              : null,
          auftragKorrekturId: istAuftragKorrektur ? auftragKorrekturId : null,
          nachtragZuAuftragId: istNachtrag ? bootstrap?.nachtragZu?.auftragId ?? null : null,
          ist_wiederkehrend: wiederkehr.ist_wiederkehrend,
          wiederkehr_turnus: wiederkehr.wiederkehr_turnus,
        })
        if (!res.ok) {
          toast.error(res.message)
          return null
        }
        setAngebotId(res.angebotId)
        setMeta(metaPersist)
        savedSnapshotRef.current = draftSnapshotRef.current
        setDraftDirty(false)
        onSaved?.(res.angebotId)
        if (opts?.notify) {
          toast.success(
            res.angebotsnr?.trim()
              ? `Entwurf gespeichert (${res.angebotsnr.trim()})`
              : 'Entwurf gespeichert'
          )
        }
        return res.angebotId
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
        return null
      } finally {
        if (manageBusy) {
          setSaving(false)
          actionBusy.hide()
        }
      }
    },
    [
      angebotId,
      dokumentTyp,
      firm,
      kundeId,
      ensureLeadId,
      meta,
      mitAnfahrt,
      zeilen,
      projektbeschreibung,
      projektFotos,
      variantenPersist,
      wichtigeHinweisePersist,
      onSaved,
      istAuftragKorrektur,
      auftragKorrekturId,
      zahlungsplan,
      projekt,
      gewerke,
      zahlfristSeg,
      zahlfristDatum,
      wiederkehr,
      hwZuweisungen,
      istNachtrag,
      bootstrap?.nachtragZu?.auftragId,
    ]
  )

  async function ensureDraftForPreview(): Promise<string | null> {
    if (angebotId && !draftDirty) return angebotId
    setPreviewLoading(true)
    try {
      return await persistDraft({ notify: false })
    } finally {
      setPreviewLoading(false)
    }
  }

  async function openVorschauSheet() {
    const id = await ensureDraftForPreview()
    if (!id) {
      toast.error(
        'Entwurf noch nicht gespeichert — Vorschau ggf. leer. Pflichtfelder vor Senden prüfen.'
      )
    }
    setSheet('vorschau')
  }

  const kundeZumBearbeiten: Kunde | null =
    isHv && ag?.id ? (ag as Kunde) : melder

  function onKundeSaved(_id?: string, saved?: Partial<Kunde>) {
    setKundeEditOpen(false)
    if (!saved) return
    setLeadState((prev) => {
      if (isHv) {
        const prevAg = prev.auftraggeber
        return {
          ...prev,
          auftraggeber: { ...(prevAg ?? {}), ...saved } as LeadDetail['auftraggeber'],
          kontakt_email: saved.email?.trim() || prev.kontakt_email,
          kontakt_telefon: saved.telefon?.trim() || prev.kontakt_telefon,
        }
      }
      const prevKunde = resolveLeadKunde(prev.kunden)
      return {
        ...prev,
        kunden: { ...(prevKunde ?? {}), ...saved } as Kunde,
        kontakt_email: saved.email?.trim() || prev.kontakt_email,
        kontakt_telefon: saved.telefon?.trim() || prev.kontakt_telefon,
        kundentyp: saved.typ?.trim() || prev.kundentyp,
      }
    })
    const mail = saved.email?.trim()
    if (mail && isValidEmail(mail)) setMailTo([mail])
  }

  async function handleCanvasClose() {
    setKundeEditOpen(false)
    if (draftDirty && !saving) {
      /* S9: X speichert best-effort — ohne Validierungs-Toasts bei leerem Entwurf */
      const artikelA = zeilen.filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      const titelOk = meta.titel.trim() || meta.leistungsumfang.trim()
      const canSilentSave =
        Boolean(kundeId) &&
        Boolean(titelOk) &&
        artikelA.length > 0 &&
        !artikelA.some((z) => !z.bezeichnung.trim())
      if (canSilentSave) {
        try {
          await persistDraft({ notify: false })
        } catch {
          /* ignore */
        }
      }
    }
    onClose()
  }

  function handleRequestClose() {
    void handleCanvasClose()
  }

  async function handleFinishVersenden() {
    const recipients =
      mailTo.length > 0
        ? mailTo
        : sheetEmail && isValidEmail(sheetEmail)
          ? [sheetEmail]
          : []
    if (!recipients.length) {
      toast.error('Keine Kunden-E-Mail — bitte unter Versand ergänzen.')
      setSheet('versand')
      return
    }
    await actionBusy.run('Wird gesendet…', async () => {
      setSaving(true)
      try {
        const id = await persistDraft({ notify: false, manageBusy: false })
        if (!id) return
        const leadId = await ensureLeadId()
        if (!leadId) return
        const res = await sendAngebotWizard({
          angebotId: id,
          lead_id: leadId,
          mailTo: recipients,
          mailCc,
          betreff: mailBetreff.trim() || undefined,
          auftragKorrektur: istAuftragKorrektur,
        })
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        toast.success(
          istAuftragKorrektur
            ? 'Korrektur gespeichert und an den Kunden versendet'
            : `Angebot „${(meta.titel || projekt || 'Angebot').trim()}“ versendet · ${formatEurBetrag(mailSummen.bruttoMin)} brutto`
        )
        onDone?.(id, {
          mode: 'sent',
          auftragKorrektur: istAuftragKorrektur || undefined,
        })
        onClose()
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Versand fehlgeschlagen.')
      } finally {
        setSaving(false)
      }
    })
  }

  function patchProjektTitel(v: string) {
    const oldTitel = meta.leistungsumfang
    setMeta((m) => {
      const lu = v.trim()
      const altLu = m.leistungsumfang.trim() || projekt
      const patch: Partial<AngebotWizardMeta> = {
        leistungsumfang: v,
        /** Angebotstitel bleibt Standard und folgt dem Projekttitel. */
        titel: lu ? `Angebot ${lu} — ${name}` : m.titel,
      }
      if (isDefaultAngebotEinleitung(m.einleitung, altLu)) {
        const effAnrede = m.anrede ?? mailAnredeFromKundeTyp(kundeTyp)
        patch.einleitung = defaultAngebotEinleitungText(effAnrede, lu || projekt)
      }
      return { ...m, ...patch }
    })
    setProjektbeschreibung((prev) => syncProjektTitelInBeschreibung(prev, oldTitel, v))
  }


  if (!mounted) return null

  const ustLabel = reverseChargeAktiv
    ? 'MwSt 0% (§13b)'
    : effektiverMwstSatz === 0
      ? 'MwSt 0%'
      : `MwSt ${effektiverMwstSatz}%`

  const dokumentCrowValue = [
    meta.leistungsumfang.trim() || meta.titel.trim() || 'Titel offen',
    dokumentTyp === 'projekt' ? 'Komplex' : 'Einfach',
  ].join(' · ')

  const zahlungCrowValue = [
    meta.gueltig_bis ? `bis ${formatDatum(meta.gueltig_bis)}` : 'Gültig offen',
    zahlfristText,
  ]
    .filter(Boolean)
    .join(' · ')

  const versandCrowValue = mailTo[0]?.trim() || sheetEmail?.trim() || 'Empfänger ergänzen'

  const wizardSubtitle = name?.trim() && name !== '—' ? name.trim() : undefined

  const headerEnd = (
    <>
      <button
        type="button"
        className="editor-sheet__icon-btn"
        disabled={saving}
        onClick={() => void openVorschauSheet()}
        aria-label="Vorschau"
        title="Vorschau"
      >
        <FileText className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
      </button>
      <ActionsMenu
        sheetTitle="Angebot"
        align="right"
        trigger={
          <span
            className={cn('editor-sheet__confirm', saving && 'opacity-50')}
            aria-label="Speichern oder senden"
            title="Speichern oder senden"
          >
            <Check className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
          </span>
        }
        items={[
          {
            label: saving ? 'Speichern…' : 'Speichern',
            icon: <MockIcon ctx="btn" n="device-floppy" size={16} />,
            onClick: () => {
              if (saving) return
              void persistDraft({ notify: true })
            },
          },
          {
            label: saving ? 'Senden…' : 'Senden',
            icon: <MockIcon ctx="btn" n="send" size={16} />,
            hint: 'Speichert und versendet',
            onClick: () => {
              if (saving) return
              void handleFinishVersenden()
            },
          },
        ]}
      />
    </>
  )

  const documentColumn = (
    <div className="dc-doc flex flex-col gap-4">
      <PosBoard
        title={angebotTitel || 'Angebot'}
        positionen={posBoardLines}
        onChange={onPosBoardChange}
        showUst
        showTotals={false}
        gewerke={gewerkNamen}
        preislisten={preislisten}
        hideAddGewerk={dokumentTyp === 'einfach'}
        suggestContext={istAuftragKorrektur ? null : posSuggestContext}
        badgeOf={(p) =>
          p.regieSchein
            ? { kind: 'warn', icon: 'paperclip', label: 'nach Aufwand' }
            : p.kind === 'freitext'
              ? { kind: 'neutral', icon: 'align-left', label: 'Freitext' }
              : p.kind === 'nachlass'
                ? { kind: 'warn', icon: 'percent', label: 'Nachlass' }
                : null
        }
      />

      <TotBand
        className="totband--green"
        netto={mailSummen.nettoMin}
        ust={mailSummen.mwstBetragMin}
        brutto={mailSummen.bruttoMin}
        ustLabel={ustLabel}
      />
    </div>
  )

  const metaColumn = (
    <div className="dc-meta-stack">
      <MetaCrowButton label="Kunde" value={crowKundeValue} onClick={() => setSheet('kunde')} />
      <MetaCrowButton
        label="Dokument"
        value={dokumentCrowValue}
        onClick={() => setSheet('dokument')}
      />
      <MetaCrowButton
        label="Zahlung"
        value={zahlungCrowValue}
        onClick={() => setSheet('zahlung')}
      />
      <MetaCrowButton
        label="Versand"
        value={versandCrowValue}
        onClick={() => setSheet('versand')}
      />
    </div>
  )

  const closeSheet = () => {
    setKundeEditOpen(false)
    setFotoLightboxUrl(null)
    setSheet(null)
  }

  const wizard = (
    <>
      <DocumentCanvas
        title={wizardTitel}
        subtitle={wizardSubtitle}
        onClose={handleRequestClose}
        headerEnd={headerEnd}
        busy={saving}
        busyLabel="Bitte warten…"
        document={documentColumn}
        meta={metaColumn}
        className="wizard-flow"
        manageHistory={false}
      />

      <EditorSheet
        open={sheet === 'kunde'}
        onClose={closeSheet}
        title="Kunde"
        context="canvas"
        headerEnd={
          kundeZumBearbeiten ? (
            <button
              type="button"
              className="editor-sheet__confirm-text"
              onClick={() => setKundeEditOpen(true)}
            >
              Bearbeiten
            </button>
          ) : null
        }
      >
        <div className="gfc">
          <div className="gfc-row">
            <span className="gfc-l">Kundentyp</span>
            <span className="gfc-v">{sheetKundentypLabel || '—'}</span>
          </div>
          {sheetFirma ? (
            <div className="gfc-row">
              <span className="gfc-l">Firma</span>
              <span className="gfc-v">{sheetFirma}</span>
            </div>
          ) : null}
          <div className="gfc-row">
            <span className="gfc-l">{sheetFirma ? 'Vorname (Ansprechpartner)' : 'Vorname'}</span>
            <span className="gfc-v">{sheetNamen.vorname || '—'}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">{sheetFirma ? 'Nachname (Ansprechpartner)' : 'Nachname'}</span>
            <span className="gfc-v">{sheetNamen.nachname || '—'}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">Anschrift</span>
            <span className="gfc-v">{sheetAnschrift || '—'}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">Stadt</span>
            <span className="gfc-v">{sheetStadt || '—'}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">E-Mail</span>
            <span className="gfc-v">{sheetEmail || <em>fehlt</em>}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">Telefon</span>
            <span className="gfc-v">{sheetTelefon || <em>fehlt</em>}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">Budget</span>
            <span className="gfc-v">{budgetAnzeige}</span>
          </div>
          {isHv ? (
            hvObjekte.length === 0 ? (
              <div className="gfc-row">
                <span className="gfc-l">Objekte</span>
                <span className="gfc-v">—</span>
              </div>
            ) : (
              hvObjekte.map((o, i) => (
                <div key={o.id} className="gfc-row">
                  <span className="gfc-l">{i === 0 ? 'Objekte' : ''}</span>
                  <span className="gfc-v">
                    {kundenObjektKurzlabel(o)}
                    {leadState.kunde_objekt_id === o.id ? ' · aktiv' : ''}
                  </span>
                </div>
              ))
            )
          ) : null}
        </div>
      </EditorSheet>

      <KundeModal
        open={kundeEditOpen}
        onClose={() => setKundeEditOpen(false)}
        editKunde={kundeZumBearbeiten}
        leadFunnelDaten={leadState.funnel_daten}
        stayOnPage
        revalidateAnfrageId={leadState.id}
        context="canvas"
        onSaved={onKundeSaved}
      />

      <EditorSheet
        open={sheet === 'dokument'}
        onClose={closeSheet}
        title="Dokument"
        context="canvas"
      >
        <div className="form-grid form-grid--sheet">
          <SheetEditableField
            label="Projekt-Titel"
            value={meta.leistungsumfang}
            onSave={patchProjektTitel}
            placeholder="z.B. Badmodernisierung"
            autoOpen={sheet === 'dokument' && focusField === 'titel'}
            disabled={saving}
          />
          <SheetEditableField
            label="Beschreibung"
            value={projektbeschreibung}
            onSave={setProjektbeschreibung}
            multiline
            kiExtraHint="Projektbeschreibung für das Angebot (kundensichtbar)."
            placeholder="Projektbeschreibung…"
            autoOpen={sheet === 'dokument' && focusField === 'beschreibung'}
            disabled={saving}
          />
          <div className="full wizard-dok-fotos">
            <div className="section-h" style={{ marginBottom: 10, textTransform: 'none', letterSpacing: 0 }}>
              Fotos · {projektFotos.length}
            </div>
            {projektFotos.length > 0 ? (
              <div className="wizard-dok-fotos__grid">
                {projektFotos.map((f) => (
                  <div key={f.url} className="wizard-dok-fotos__item">
                    <button
                      type="button"
                      className="wizard-dok-fotos__thumb"
                      onClick={() => setFotoLightboxUrl(f.url)}
                      aria-label="Foto vergrößern"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt="" />
                    </button>
                    <button
                      type="button"
                      className="wizard-dok-fotos__remove"
                      title="Entfernen"
                      aria-label="Foto entfernen"
                      onClick={() => {
                        setProjektFotos((prev) => prev.filter((x) => x.url !== f.url))
                        if (fotoLightboxUrl === f.url) setFotoLightboxUrl(null)
                      }}
                    >
                      <MockIcon ctx="default" n="trash" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className="wizard-dok-fotos__upload"
              disabled={projektUploading || saving}
              onClick={() => fotoInputRef.current?.click()}
            >
              <MockIcon ctx="default" n="plus" size={16} />
              <span>{projektUploading ? 'Wird hochgeladen…' : 'Fotos hinzufügen'}</span>
            </button>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : []
                e.target.value = ''
                void uploadProjektFotoFiles(files)
              }}
            />
          </div>
          <Modal
            open={Boolean(fotoLightboxUrl)}
            onClose={() => setFotoLightboxUrl(null)}
            title="Foto"
            size="xl"
          >
            {fotoLightboxUrl ? (
              <div className="wizard-dok-fotos__lightbox">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoLightboxUrl} alt="Foto" />
                <label className="wizard-dok-fotos__lightbox-cap">
                  <span>Beschreibung (optional)</span>
                  <textarea
                    className="input ta"
                    rows={3}
                    placeholder="z. B. Istzustand…"
                    value={
                      projektFotos.find((x) => x.url === fotoLightboxUrl)?.beschreibung ?? ''
                    }
                    onChange={(e) =>
                      setProjektFotos((prev) =>
                        prev.map((x) =>
                          x.url === fotoLightboxUrl
                            ? { ...x, beschreibung: e.target.value }
                            : x
                        )
                      )
                    }
                  />
                </label>
              </div>
            ) : null}
          </Modal>
        </div>
      </EditorSheet>

      <EditorSheet
        open={sheet === 'zahlung'}
        onClose={closeSheet}
        title="Zahlung"
        context="canvas"
      >
        <div className="form-grid form-grid--sheet">
          <div className="full wizard-zahlung-dates">
            <MockField label="Gültig bis">
              <DateInput
                size="sm"
                value={meta.gueltig_bis}
                onChange={(e) => setMeta((m) => ({ ...m, gueltig_bis: e.target.value }))}
              />
            </MockField>
            <MockField
              label="Leistungszeitraum von"
              hint={istAuftragKorrektur ? 'Ausführungszeitraum am Auftrag' : undefined}
            >
              <DateInput
                size="sm"
                value={meta.leistungszeitraum_von ?? ''}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, leistungszeitraum_von: e.target.value }))
                }
              />
            </MockField>
            <MockField label="Leistungszeitraum bis">
              <DateInput
                size="sm"
                value={meta.leistungszeitraum_bis ?? ''}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, leistungszeitraum_bis: e.target.value }))
                }
              />
            </MockField>
          </div>
          <MockField label="Zahlfrist" full hint="Zahlungsziel nach Rechnungsstellung">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <MockZahlfristSeg value={zahlfristSeg} onChange={(v) => applyZahlfrist(v)} />
              {zahlfristSeg === 'datum' ? (
                <div style={{ width: 160 }}>
                  <DateInput
                    size="sm"
                    value={zahlfristDatum}
                    onChange={(e) => applyZahlfrist('datum', e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </MockField>
          <AngebotWizardRechtlicheHinweiseCard
            embedded
            meta={meta}
            onMetaChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
            hinweis35aErlaubt={hinweis35aErlaubt}
            hinweis13bErlaubt={hinweis13bErlaubt}
            lohnNettoPdf={lohnNettoPdf}
          />
        </div>
      </EditorSheet>

      <EditorSheet
        open={sheet === 'vorschau'}
        onClose={closeSheet}
        title="Vorschau"
        context="canvas"
        size="lg"
      >
        <AngebotWizardPdfPreview
          angebotId={angebotId}
          loading={previewLoading || saving || !angebotId}
          kundeName={name}
        />
      </EditorSheet>

      <EditorSheet
        open={sheet === 'versand'}
        onClose={closeSheet}
        title="Versand"
        context="canvas"
      >
        <div className="form-grid form-grid--sheet">
          <EmailPillsField
            label="An"
            required
            emails={mailTo}
            onChange={setMailTo}
            placeholder="kunde@beispiel.de"
            hint="Mindestens eine Empfänger-Adresse"
            disabled={saving}
          />
          <EmailPillsField
            label="Cc"
            emails={mailCc}
            onChange={setMailCc}
            placeholder="optional"
            hint={`Optional — ${KUNDE_MAIL_BCC_HINT}`}
            disabled={saving}
          />
          <SheetEditableField
            label="Betreff"
            value={mailBetreff || defaultMailBetreff}
            onSave={setMailBetreff}
            kiExtraHint="Mail-Betreff für den Angebotsversand an den Kunden."
            disabled={saving}
            sheetContext="detail"
          />
          <SheetEditableField
            label="E-Mail-Text"
            value={mailBodyDraft}
            multiline
            rows={14}
            disabled={saving}
            sheetContext="detail"
            kiExtraHint={`Kompletter Mail-Text inkl. Begrüßung. Die Zeile „${ANGEBOT_MAIL_BOX_MARKER}“ nicht löschen — dort erscheinen Angebotsnummer, Preis und Gültigkeit.`}
            placeholder="E-Mail-Text…"
            onSave={(text) => {
              setMailBodyDraft(text)
              const parsed = parseAngebotMailFullTextFromEditor(
                text,
                mailAnrede,
                meta.leistungsumfang.trim() || projekt,
                mailKundeKontext
              )
              setMeta((m) => ({ ...m, einleitung: parsed.einleitung, schluss: parsed.schluss }))
            }}
          />
          <div className="full">
            <AngebotWizardMailPreview
              angebotId={angebotId}
              betreff={mailBetreff.trim() || defaultMailBetreff}
              einleitung={meta.einleitung}
              schluss={meta.schluss}
              leistungsumfang={meta.leistungsumfang.trim() || projekt}
              gesamtBrutto={mailSummen.bruttoMin}
              gesamtNetto={mailSummen.nettoMin}
              gueltigBis={meta.gueltig_bis}
              empfaengerHint={mailTo[0] || sheetEmail || undefined}
            />
          </div>
        </div>
      </EditorSheet>
    </>
  )

  return createPortal(
    !typConfirmed ? (
      <EditorSheet
        open
        onClose={onClose}
        title={typGateStep === 'layout' ? 'Angebotslayout' : 'Art der Leistung'}
        context="canvas"
        manageHistory={false}
      >
        {typGateStep === 'art' ? (
          <>
            <p
              style={{
                margin: '0 0 14px',
                fontSize: 'var(--fs-meta)',
                color: 'var(--text-3)',
                lineHeight: 1.45,
              }}
            >
              Einmalig = Projekt/Auftrag mit Abschluss. Wiederkehrend = Bestand wie Wartung,
              Winterdienst oder Hausmeisterservice.
            </p>
            <div className="doctype-row doctype-row--stack">
              <button
                type="button"
                className="doctype-radio-opt doctype-radio-opt--block"
                onClick={() => {
                  setWiederkehr({ ist_wiederkehrend: false, wiederkehr_turnus: null })
                  setTypGateStep('layout')
                }}
              >
                <span className="dot" />
                <span className="doctype-radio-opt__copy">
                  <span className="lbl">Einmalig</span>
                  <span className="hint">Projekt oder einmaliger Auftrag</span>
                </span>
              </button>
              <button
                type="button"
                className={
                  wiederkehr.ist_wiederkehrend
                    ? 'doctype-radio-opt doctype-radio-opt--block on'
                    : 'doctype-radio-opt doctype-radio-opt--block'
                }
                onClick={() =>
                  setWiederkehr({
                    ist_wiederkehrend: true,
                    wiederkehr_turnus: wiederkehr.wiederkehr_turnus ?? 'monatlich',
                  })
                }
              >
                <span className="dot" />
                <span className="doctype-radio-opt__copy">
                  <span className="lbl">Wiederkehrend</span>
                  <span className="hint">Wartung, Winterdienst, Pflege — Bestand</span>
                </span>
              </button>
            </div>
            {wiederkehr.ist_wiederkehrend ? (
              <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                <label className="field">
                  <span className="field-label">Zeitintervall</span>
                  <select
                    className="sel"
                    value={wiederkehr.wiederkehr_turnus ?? 'monatlich'}
                    onChange={(e) =>
                      setWiederkehr({
                        ist_wiederkehrend: true,
                        wiederkehr_turnus: e.target.value as WiederkehrTurnus,
                      })
                    }
                  >
                    {WIEDERKEHR_TURNUS_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {WIEDERKEHR_TURNUS_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setDokumentTyp('einfach')
                    setTypGateStep(null)
                  }}
                >
                  Weiter
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p
              style={{
                margin: '0 0 14px',
                fontSize: 'var(--fs-meta)',
                color: 'var(--text-3)',
                lineHeight: 1.45,
              }}
            >
              Entscheidet, ob du nur Positionen oder zusätzlich Gewerke anlegen kannst — nur bei
              einmaligen Projekten relevant.
            </p>
            <div className="doctype-row doctype-row--stack">
              <button
                type="button"
                className="doctype-radio-opt doctype-radio-opt--block"
                onClick={() => {
                  setDokumentTyp('einfach')
                  setTypGateStep(null)
                }}
              >
                <span className="dot" />
                <span className="doctype-radio-opt__copy">
                  <span className="lbl">Einfach</span>
                  <span className="hint">Nur Positionen — ohne Gewerk-Abschnitte</span>
                </span>
              </button>
              <button
                type="button"
                className="doctype-radio-opt doctype-radio-opt--block"
                onClick={() => {
                  setDokumentTyp('projekt')
                  setTypGateStep(null)
                }}
              >
                <span className="dot" />
                <span className="doctype-radio-opt__copy">
                  <span className="lbl">Komplex</span>
                  <span className="hint">Mit Gewerken — z. B. Sanitär, Elektro, Maler</span>
                </span>
              </button>
            </div>
            <button
              type="button"
              className="btn ghost"
              style={{ marginTop: 12 }}
              onClick={() => setTypGateStep('art')}
            >
              Zurück
            </button>
          </>
        )}
      </EditorSheet>
    ) : (
      wizard
    ),
    document.body
  )
}


function zahlfristAnzeigeFromLocal(seg: ZahlfristSeg, datum: string): string {
  return angebotZahlfristText({
    ...angebotMetaPatchFromZahlfrist(seg, datum),
  })
}
