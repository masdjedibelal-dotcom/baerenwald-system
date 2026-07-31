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
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { DocActionBar } from '@/components/surfaces/primitives'
import { ActionIcon } from '@/components/ui/ActionIcon'
import { MockField } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockZahlfristSeg } from '@/components/mock-ui/MockZahlfristSeg'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { KundePickerSheet } from '@/components/kunden/KundePickerSheet'
import { PosBoard } from '@/components/posboard/PosBoard'
import { VorgangArtWiederkehrField } from '@/components/vorgang/VorgangArtWiederkehrField'
import { toast } from '@/components/ui/app-toast'
import { KUNDE_MAIL_BCC_HINT } from '@/lib/mail-constants'
import {
  normalizeVorgangWiederkehr,
  type VorgangWiederkehr,
} from '@/lib/vorgang/wiederkehrend'
import {
  finalizeAngebotWizardWithoutMail,
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
import {
  leadKontaktAnzeigeName,
  leadVertragsKundeId,
  resolveLeadKunde,
  resolveLeadPreisAnzeige,
} from '@/lib/lead-display-helpers'
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
  defaultAngebotEinleitungText,
  isDefaultAngebotEinleitung,
} from '@/lib/templates/angebot-mail'
import type { AngebotProjektFoto } from '@/lib/angebote/angebot-projekt-fotos'
import type { AngebotPosition, Gewerk, Handwerker, Kunde, KundenObjekt, LeadDetail, Preisliste } from '@/lib/types'
import { BEREICH_LABELS, formatDatum } from '@/lib/utils'
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

function regionLabel(lead: LeadDetail): string {
  const plz = lead.plz?.trim()
  const kundeOrt =
    lead.kunden && 'ort' in lead.kunden
      ? String((lead.kunden as { ort?: string | null }).ort ?? '').trim()
      : ''
  if (plz && kundeOrt) return `${kundeOrt} · ${plz}`
  if (plz) return plz
  if (kundeOrt) return kundeOrt
  return '—'
}

/**
 * Angebots-Wizard — DocumentCanvas 1:1 Mock:
 * links Positionen + Summen, rechts Meta-Crows → Sheets (Kunde/Dokument/Zahlung/Versand),
 * DocBar Vorschau · Senden · PDF|Speichern · Verwerfen; mobil Speichern in DocBar (kein Footer-CTA).
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
  const email = (
    isHv
      ? ag?.email ?? ''
      : melder?.email ?? leadState.kontakt_email ?? ''
  ).trim()
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
  const region = regionLabel(leadState)

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
  /** Neu: Typ zuerst wählen — entscheidet über Gewerke im PosBoard. */
  const needsTypGate = !bootstrap?.angebotId && !istAuftragKorrektur && !istNachtrag
  const [typConfirmed, setTypConfirmed] = useState(!needsTypGate)
  const [sheet, setSheet] = useState<WizardSheetId>(() => {
    const s = Number(initialStep)
    if (s === 4) return 'vorschau'
    if (s === 5) return 'versand'
    if (focusField === 'titel' || focusField === 'beschreibung') return 'dokument'
    return null
  })
  const [kundePickerOpen, setKundePickerOpen] = useState(false)
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
    email && isValidEmail(email) ? [email] : []
  )
  const [mailCc, setMailCc] = useState<string[]>([])
  const [mailBetreff, setMailBetreff] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const zahlfristInit = zahlfristSegFromAngebotMeta(meta)
  const [zahlfristSeg, setZahlfristSeg] = useState<ZahlfristSeg>(() => zahlfristInit.seg)
  const [zahlfristDatum, setZahlfristDatum] = useState(() => zahlfristInit.datum)

  useEffect(() => {
    if (mailTo.length) return
    if (email && isValidEmail(email)) setMailTo([email])
  }, [email, mailTo.length])

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
    async (opts?: { notify?: boolean }): Promise<string | null> => {
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

      setSaving(true)
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
        setSaving(false)
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

  function onKundePick(k: Kunde) {
    setLeadState((prev) => ({
      ...prev,
      kunde_id: k.id,
      kunden: k,
      kontakt_email: k.email?.trim() || prev.kontakt_email,
      kontakt_telefon: k.telefon?.trim() || prev.kontakt_telefon,
    }))
    const mail = k.email?.trim()
    if (mail && isValidEmail(mail)) setMailTo([mail])
    setKundePickerOpen(false)
  }

  async function handleCanvasClose() {
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

  async function handleFinishErstellen() {
    setSaving(true)
    try {
      const id = await persistDraft({ notify: false })
      if (!id) return
      const res = await finalizeAngebotWizardWithoutMail(id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        res.angebotsnr?.trim()
          ? `Angebot ${res.angebotsnr.trim()} erstellt · ${formatEurBetrag(mailSummen.bruttoMin)} brutto`
          : `Angebot erstellt · ${formatEurBetrag(mailSummen.bruttoMin)} brutto`
      )
      onDone?.(id, { mode: 'saved' })
      onClose()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erstellen fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  /** Korrektur: speichern + Auftrag synchronisieren, ohne Kunden-Mail (mündliche Zusage). */
  async function handleFinishKorrekturSpeichern() {
    setSaving(true)
    try {
      const id = await persistDraft({ notify: false })
      if (!id) return
      const res = await finalizeAngebotWizardWithoutMail(id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        'Korrektur übernommen — ohne Mail an den Kunden. Als Nächstes Abschlagsplan / Schlussrechnung prüfen.'
      )
      onDone?.(id, { mode: 'saved', auftragKorrektur: true })
      onClose()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  async function handleFinishVersenden() {
    const recipients =
      mailTo.length > 0
        ? mailTo
        : email && isValidEmail(email)
          ? [email]
          : []
    if (!recipients.length) {
      toast.error(
        istAuftragKorrektur
          ? 'Keine Kunden-E-Mail — nutze „Speichern & übernehmen“ ohne Versand.'
          : 'Keine Kunden-E-Mail hinterlegt — Versand nicht möglich. Nutze „Erstellen“ ohne Mail.'
      )
      return
    }
    setSaving(true)
    try {
      const id = await persistDraft({ notify: false })
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
  }

  function patchTitel(v: string) {
    setMeta((m) => {
      const altLu = m.leistungsumfang.trim() || projekt
      const patch: Partial<AngebotWizardMeta> = { titel: v }
      if (!m.leistungsumfang.trim()) {
        patch.leistungsumfang = v
      }
      if (isDefaultAngebotEinleitung(m.einleitung, altLu)) {
        const effAnrede = m.anrede ?? mailAnredeFromKundeTyp(kundeTyp)
        patch.einleitung = defaultAngebotEinleitungText(effAnrede, v.trim() || projekt)
      }
      return { ...m, ...patch }
    })
  }

  function patchProjektTitel(v: string) {
    setMeta((m) => {
      const patch: Partial<AngebotWizardMeta> = { leistungsumfang: v }
      if (!m.titel.trim() || m.titel === defaultMeta.titel) {
        patch.titel = v.trim() ? `Angebot ${v.trim()} — ${name}` : m.titel
      }
      return { ...m, ...patch }
    })
  }


  if (!mounted) return null

  const ustLabel = reverseChargeAktiv
    ? 'MwSt 0% (§13b)'
    : effektiverMwstSatz === 0
      ? 'MwSt 0%'
      : `MwSt ${effektiverMwstSatz}%`

  const dokumentCrowValue = [
    meta.titel.trim() || meta.leistungsumfang.trim() || 'Titel offen',
    dokumentTyp === 'projekt' ? 'Komplex' : 'Einfach',
  ].join(' · ')

  const zahlungCrowValue = [
    meta.gueltig_bis ? `bis ${formatDatum(meta.gueltig_bis)}` : 'Gültig offen',
    zahlfristText,
  ]
    .filter(Boolean)
    .join(' · ')

  const versandCrowValue = mailTo[0]?.trim() || email?.trim() || 'Empfänger ergänzen'

  const wizardSubtitle = name?.trim() && name !== '—' ? name.trim() : undefined

  const docActions = (
    <DocActionBar
      actions={[
        {
          id: 'save',
          label: saving ? 'Speichern…' : 'Speichern',
          onClick: () => {
            if (saving) return
            void persistDraft({ notify: true })
          },
          icon: <ActionIcon n="device-floppy" size={20} />,
        },
        {
          id: 'preview',
          label: 'Vorschau',
          onClick: () => void openVorschauSheet(),
          icon: <ActionIcon n="file-text" size={20} />,
        },
        {
          id: 'send',
          label: 'Senden',
          onClick: () => setSheet('versand'),
          icon: <ActionIcon n="send" size={20} />,
        },
      ]}
    />
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
      <MetaCrowButton label="Kunde" value={name} onClick={() => setSheet('kunde')} />
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

  const closeSheet = () => setSheet(null)

  const wizard = (
    <>
      <DocumentCanvas
        title={wizardTitel}
        subtitle={wizardSubtitle}
        onClose={handleRequestClose}
        onSave={() => void persistDraft({ notify: true })}
        saveBusy={saving}
        busy={saving}
        busyLabel="Wird gesendet…"
        onDiscard={() => onClose()}
        docActions={docActions}
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
          <button
            type="button"
            className="editor-sheet__confirm-text"
            onClick={() => setKundePickerOpen(true)}
          >
            Wechseln
          </button>
        }
      >
        <div className="gfc">
          <div className="gfc-row">
            <span className="gfc-l">Name</span>
            <span className="gfc-v">{name}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">Region</span>
            <span className="gfc-v">{region}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">E-Mail</span>
            <span className="gfc-v">{email || <em>fehlt</em>}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">Budget</span>
            <span className="gfc-v">{budgetAnzeige}</span>
          </div>
        </div>
      </EditorSheet>

      <KundePickerSheet
        open={kundePickerOpen}
        onClose={() => setKundePickerOpen(false)}
        onPick={onKundePick}
        context="canvas"
      />

      <EditorSheet
        open={sheet === 'dokument'}
        onClose={closeSheet}
        title="Dokument"
        context="canvas"
      >
        <div className="form-grid form-grid--sheet">
          {!istAuftragKorrektur ? (
            <div className="full">
              <VorgangArtWiederkehrField value={wiederkehr} onChange={setWiederkehr} />
            </div>
          ) : null}
          <MockField label="Angebotstitel" full>
            <input
              className="input"
              value={meta.titel}
              onChange={(e) => patchTitel(e.target.value)}
              autoFocus={focusField === 'titel'}
            />
          </MockField>
          <MockField label="Projekt-Titel" full>
            <input
              className="input"
              value={meta.leistungsumfang}
              onChange={(e) => patchProjektTitel(e.target.value)}
              placeholder="z.B. Badmodernisierung"
            />
          </MockField>
          <KiAssistFieldLabel
            label="Beschreibung"
            value={projektbeschreibung}
            onApply={setProjektbeschreibung}
            extraHint="Projektbeschreibung für das Angebot (kundensichtbar)."
          >
            <textarea
              className="input ta"
              rows={5}
              value={projektbeschreibung}
              onChange={(e) => setProjektbeschreibung(e.target.value)}
              autoFocus={focusField === 'beschreibung'}
            />
          </KiAssistFieldLabel>
          <div className="full">
            <div className="section-h" style={{ marginBottom: 10, textTransform: 'none', letterSpacing: 0 }}>
              Fotos · {projektFotos.length}
            </div>
            <div className="fotos-grid">
              {projektFotos.map((f) => (
                <div key={f.url} className="foto-card">
                  <div className="foto-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" />
                    <div className="foto-img-actions">
                      <MockBtn
                        sm
                        kind="ghost"
                        icon="trash"
                        title="Entfernen"
                        onClick={() =>
                          setProjektFotos((prev) => prev.filter((x) => x.url !== f.url))
                        }
                      />
                    </div>
                  </div>
                  <div className="foto-desc">
                    <textarea
                      className="input ta"
                      rows={2}
                      placeholder="Beschreibung (optional)"
                      value={f.beschreibung}
                      onChange={(e) =>
                        setProjektFotos((prev) =>
                          prev.map((x) =>
                            x.url === f.url ? { ...x, beschreibung: e.target.value } : x
                          )
                        )
                      }
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="foto-upload"
                disabled={projektUploading || saving}
                onClick={() => fotoInputRef.current?.click()}
              >
                <MockIcon ctx="default" n="plus" size={18} />
                <div>{projektUploading ? 'Wird hochgeladen…' : 'Fotos hinzufügen'}</div>
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
          </div>
        </div>
      </EditorSheet>

      <EditorSheet
        open={sheet === 'zahlung'}
        onClose={closeSheet}
        title="Zahlung"
        context="canvas"
      >
        <div className="form-grid form-grid--sheet">
          <MockField label="Gültig bis">
            <input
              type="date"
              className="input"
              value={meta.gueltig_bis}
              onChange={(e) => setMeta((m) => ({ ...m, gueltig_bis: e.target.value }))}
            />
          </MockField>
          <MockField
            label="Leistungszeitraum von"
            hint={istAuftragKorrektur ? 'Ausführungszeitraum am Auftrag' : undefined}
          >
            <input
              type="date"
              className="input"
              value={meta.leistungszeitraum_von ?? ''}
              onChange={(e) =>
                setMeta((m) => ({ ...m, leistungszeitraum_von: e.target.value }))
              }
            />
          </MockField>
          <MockField label="Leistungszeitraum bis">
            <input
              type="date"
              className="input"
              value={meta.leistungszeitraum_bis ?? ''}
              onChange={(e) =>
                setMeta((m) => ({ ...m, leistungszeitraum_bis: e.target.value }))
              }
            />
          </MockField>
          <MockField label="Zahlfrist" full hint="Zahlungsziel nach Rechnungsstellung">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <MockZahlfristSeg value={zahlfristSeg} onChange={(v) => applyZahlfrist(v)} />
              {zahlfristSeg === 'datum' ? (
                <div style={{ width: 180 }}>
                  <input
                    type="date"
                    className="input"
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
        compose
        composeLabel={saving ? '…' : 'Senden'}
        onConfirm={() => void handleFinishVersenden()}
        confirmDisabled={saving}
        confirmBusy={saving}
        footer={
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            {istAuftragKorrektur ? (
              <MockBtn
                kind="ghost"
                disabled={saving}
                onClick={() => void handleFinishKorrekturSpeichern()}
              >
                {saving ? '…' : 'Übernehmen'}
              </MockBtn>
            ) : (
              <MockBtn kind="ghost" disabled={saving} onClick={() => void handleFinishErstellen()}>
                {saving ? '…' : 'Erstellen'}
              </MockBtn>
            )}
          </div>
        }
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
          <KiAssistFieldLabel
            label="Betreff"
            value={mailBetreff || defaultMailBetreff}
            onApply={setMailBetreff}
            extraHint="Mail-Betreff für den Angebotsversand an den Kunden."
            multiline={false}
            disabled={saving}
          >
            <input
              className="input"
              value={mailBetreff || defaultMailBetreff}
              onChange={(e) => setMailBetreff(e.target.value)}
              disabled={saving}
            />
          </KiAssistFieldLabel>
          <div className="full">
            <KiAssistFieldLabel
              label="Einleitung"
              value={meta.einleitung}
              onApply={(text) => setMeta((m) => ({ ...m, einleitung: text }))}
              extraHint="Anschreiben in der Mail und auf dem Angebot."
            >
              <textarea
                className="input ta"
                rows={5}
                value={meta.einleitung}
                onChange={(e) => setMeta((m) => ({ ...m, einleitung: e.target.value }))}
              />
            </KiAssistFieldLabel>
          </div>
          <div className="full">
            <KiAssistFieldLabel
              label="Schlusstext"
              value={meta.schluss}
              onApply={(text) => setMeta((m) => ({ ...m, schluss: text }))}
              extraHint="Schlusstext in der Mail und auf dem Angebot."
            >
              <textarea
                className="input ta"
                rows={4}
                value={meta.schluss}
                onChange={(e) => setMeta((m) => ({ ...m, schluss: e.target.value }))}
              />
            </KiAssistFieldLabel>
          </div>
          <div className="full">
            <AngebotWizardMailPreview
              angebotId={angebotId}
              betreff={mailBetreff.trim() || defaultMailBetreff}
              einleitung={meta.einleitung}
              schluss={meta.schluss}
              leistungsumfang={meta.leistungsumfang.trim() || projekt}
              empfaengerHint={mailTo[0] || email || undefined}
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
        title="Angebotstyp"
        context="canvas"
        manageHistory={false}
      >
        <p
          style={{
            margin: '0 0 14px',
            fontSize: 'var(--fs-meta)',
            color: 'var(--text-3)',
            lineHeight: 1.45,
          }}
        >
          Entscheidet, ob du nur Positionen oder zusätzlich Gewerke anlegen kannst.
        </p>
        <div className="doctype-row doctype-row--stack">
          <button
            type="button"
            className="doctype-radio-opt doctype-radio-opt--block"
            onClick={() => {
              setDokumentTyp('einfach')
              setTypConfirmed(true)
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
              setTypConfirmed(true)
            }}
          >
            <span className="dot" />
            <span className="doctype-radio-opt__copy">
              <span className="lbl">Komplex</span>
              <span className="hint">Mit Gewerken — z. B. Sanitär, Elektro, Maler</span>
            </span>
          </button>
        </div>
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
