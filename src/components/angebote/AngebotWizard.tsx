'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { AngebotWizardMailPreview } from '@/components/angebote/AngebotWizardMailPreview'
import { AngebotWizardPdfPreview } from '@/components/angebote/AngebotWizardPdfPreview'
import {
  AngebotWizardHandwerkerStep,
  buildGewerkHandwerkerZuweisungen,
  gewerkHandwerkerZuweisungenToMaps,
  type GewerkHandwerkerZuweisung,
} from '@/components/angebote/AngebotWizardHandwerkerStep'
import { WizardShell } from '@/components/layout/WizardShell'
import { MockField } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockZahlfristSeg } from '@/components/mock-ui/MockZahlfristSeg'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { PosBoard } from '@/components/posboard/PosBoard'
import { PosTotals } from '@/components/posboard/PosTotals'
import { toast } from '@/components/ui/app-toast'
import { KUNDE_MAIL_BCC_HINT } from '@/lib/mail-constants'
import {
  saveAngebotWizardDraft,
  sendAngebotWizard,
} from '@/app/(dashboard)/angebote/wizard-actions'
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
import { summenAusPositionen } from '@/lib/angebot-positionen'
import { angebotPositionenToWizardZeilen } from '@/lib/angebote/wizard-positionen-laden'
import { findAnfahrtZeilen } from '@/lib/anfahrt-angebot'
import {
  dokumentArtikelToWizardPosition,
  dokumentZeilenToAngebotPositionen,
  formatEurBetrag,
  wizardPositionToDokumentZeile,
  type DokumentArtikelZeile,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import { isValidEmail } from '@/lib/email-recipients'
import {
  leadKontaktAnzeigeName,
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
import type { AngebotPosition, Gewerk, Handwerker, KundenObjekt, LeadDetail, Preisliste } from '@/lib/types'
import { BEREICH_LABELS, formatDatum } from '@/lib/utils'
import type { ZahlfristSeg } from '@/lib/zahlfrist'

function kundenName(lead: LeadDetail) {
  return leadKontaktAnzeigeName(lead)
}

const WIZARD_STEP_LABELS = [
  'Typ & Projekt',
  'Positionen',
  'Handwerker',
  'Finalisieren',
  'Vorschau',
  'Versenden',
] as const
const WIZARD_TOTAL_STEPS = WIZARD_STEP_LABELS.length

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
 * Angebots-Wizard:
 * Typ & Projekt → Positionen → Handwerker → Finalisieren → Vorschau → Versenden
 */
export function AngebotWizard({
  lead,
  gewerke,
  preislisten,
  handwerker = [],
  firm: firmProp,
  bootstrap = null,
  onClose,
  onDone,
  onSaved,
}: {
  lead: LeadDetail
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  handwerker?: Handwerker[]
  firm?: FirmenEinstellungen
  kundenObjekte?: KundenObjekt[]
  bootstrap?: AngebotWizardBootstrap | null
  onClose: () => void
  onDone?: (angebotId: string) => void
  onSaved?: (angebotId: string) => void
}) {
  const router = useRouter()
  const firm = firmProp ?? defaultFirmenEinstellungen()
  const [leadState, setLeadState] = useState(lead)

  useEffect(() => {
    setLeadState(lead)
  }, [lead])

  const name = kundenName(leadState)
  const projekt = projektLabel(leadState)
  const kunde = resolveLeadKunde(leadState.kunden)
  const kundeId = kunde?.id ?? leadState.kunde_id
  const email = (kunde?.email ?? leadState.kontakt_email ?? '').trim()
  const leistungsumfangInitial =
    bereicheFuerAnzeige(leadState.bereiche, leadState.situation)
      .map((b) => BEREICH_LABELS[b] ?? b)
      .join(' & ') || projekt
  const kundeTyp = resolveAngebotKundeTyp(kunde?.typ, leadState.kundentyp)
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
  const [step, setStep] = useState(1)
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
  const istAuftragKorrektur = Boolean(bootstrap?.auftragKorrektur?.auftragId)
  const auftragKorrekturId = bootstrap?.auftragKorrektur?.auftragId ?? null
  const wizardTitel = istAuftragKorrektur ? 'Angebot korrigieren' : 'Angebot erstellen'
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

  const mailSummen = useMemo(
    () => summenAusPositionen(dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke), 19),
    [zeilen, firm, gewerke]
  )

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
  const gewerkNamen = useMemo(
    () => gewerke.map((g) => g.name).filter(Boolean),
    [gewerke]
  )

  const zahlfristText = useMemo(
    () => zahlfristAnzeigeFromLocal(zahlfristSeg, zahlfristDatum),
    [zahlfristSeg, zahlfristDatum]
  )

  const positionenKopf =
    dokumentTyp === 'projekt'
      ? meta.leistungsumfang.trim() || meta.titel.trim() || projekt
      : projekt

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
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`/api/anfragen/${lead.id}/angebot-projekt-foto`, {
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

  const persistDraft = useCallback(
    async (opts?: { notify?: boolean }): Promise<string | null> => {
      if (!kundeId) {
        toast.error('Kein Kunde verknüpft — Angebot kann nicht gespeichert werden.')
        return null
      }
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
      const { positionQueues, notizenByGewerk } = gewerkHandwerkerZuweisungenToMaps(hwZuweisungen)
      const res = await saveAngebotWizardDraft({
        angebotId,
        lead_id: lead.id,
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
      })
      setSaving(false)
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
    },
    [
      angebotId,
      dokumentTyp,
      firm,
      kundeId,
      lead.id,
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
      hwZuweisungen,
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

  /** Weiter — vor Vorschau Entwurf speichern für PDF */
  async function handleWeiter() {
    if (step === 4) {
      const id = await ensureDraftForPreview()
      if (!id) return
    }
    setStep((s) => Math.min(WIZARD_TOTAL_STEPS, s + 1))
  }

  function handleRequestClose() {
    if (draftDirty && !saving) {
      const verwerfen = window.confirm(
        'Es gibt ungespeicherte Änderungen. Wizard schließen und Änderungen verwerfen?'
      )
      if (!verwerfen) return
    }
    onClose()
  }

  async function handleFinishVersenden() {
    const recipients =
      mailTo.length > 0
        ? mailTo
        : email && isValidEmail(email)
          ? [email]
          : []
    if (!recipients.length) {
      toast.error('Keine Kunden-E-Mail hinterlegt — Versand nicht möglich.')
      return
    }
    setSaving(true)
    const id = await persistDraft({ notify: false })
    if (!id) {
      setSaving(false)
      return
    }
    const res = await sendAngebotWizard({
      angebotId: id,
      lead_id: lead.id,
      mailTo: recipients,
      mailCc,
      betreff: mailBetreff.trim() || undefined,
      auftragKorrektur: istAuftragKorrektur,
    })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(
      istAuftragKorrektur
        ? 'Korrektur gespeichert und an den Kunden versendet'
        : `Angebot „${(meta.titel || projekt || 'Angebot').trim()}“ versendet · ${formatEurBetrag(mailSummen.bruttoMin)} brutto`
    )
    onDone?.(id)
    onClose()
    router.refresh()
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

  const wizardSteps = WIZARD_STEP_LABELS.map((label, i) => ({ id: i + 1, label }))
  const brand = firm.firmenname?.trim() || 'Bärenwald München'
  const finishLabel = istAuftragKorrektur ? 'Korrektur an Kunden senden' : 'Angebot versenden'

  const wizardDesktopActions = (
    <div className="wizard-nav-actions">
      {step > 1 ? (
        <MockBtn kind="ghost" icon="chevron-left" onClick={() => setStep((s) => s - 1)}>
          Zurück
        </MockBtn>
      ) : null}
      {step < WIZARD_TOTAL_STEPS ? (
        <MockBtn
          kind="primary"
          icon="chevron-right"
          disabled={saving || previewLoading}
          onClick={() => void handleWeiter()}
        >
          Weiter
        </MockBtn>
      ) : (
        <MockBtn kind="primary" icon="send" disabled={saving} onClick={() => void handleFinishVersenden()}>
          {finishLabel}
        </MockBtn>
      )}
    </div>
  )

  const wizardMobileActions =
    step < WIZARD_TOTAL_STEPS ? (
      <>
        {step > 1 ? (
          <MockBtn sm kind="ghost" icon="chevron-left" onClick={() => setStep((s) => s - 1)} title="Zurück" />
        ) : null}
        <MockBtn
          sm
          kind="primary"
          disabled={saving || previewLoading}
          onClick={() => void handleWeiter()}
        >
          Weiter
        </MockBtn>
      </>
    ) : (
      <>
        <MockBtn sm kind="ghost" icon="chevron-left" onClick={() => setStep((s) => s - 1)} title="Zurück" />
        <MockBtn
          sm
          kind="primary"
          icon="send"
          disabled={saving}
          onClick={() => void handleFinishVersenden()}
        >
          Senden
        </MockBtn>
      </>
    )

  const wizard = (
    <WizardShell
      className="wizard-flow"
      title={wizardTitel}
      subtitle={
        istAuftragKorrektur
          ? `Korrektur für laufenden Auftrag · ${name}`
          : undefined
      }
      steps={wizardSteps}
      currentStep={step}
      onClose={handleRequestClose}
      mobileActions={wizardMobileActions}
      desktopActions={wizardDesktopActions}
    >
      {step === 1 ? (
        <>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>
              Welche Art von Angebot?
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
              Bestimmt Aufbau und Inhalt des Dokuments
            </div>
          </div>
          <div className="wz-overview" style={{ marginBottom: 20 }}>
            <div>
              <span className="k">Kunde</span>
              <b>{name}</b>
            </div>
            <div>
              <span className="k">Projekt</span>
              <b>{projekt}</b>
            </div>
            <div>
              <span className="k">Region</span>
              <b>{region}</b>
            </div>
            <div>
              <span className="k">Budget-Rahmen</span>
              <b>{budgetAnzeige}</b>
            </div>
          </div>
          <div className="doctype-row">
            <label
              className={`doctype-radio-opt${dokumentTyp === 'einfach' ? ' on' : ''}`}
              onClick={() => setDokumentTyp('einfach')}
            >
              <span className="dot" />
              <MockIcon ctx="default" n="file-text" size={16} />
              <span className="lbl">Einfaches Angebot</span>
              <span className="hint">Positionen & Preise — direkt zur Kalkulation</span>
            </label>
            <label
              className={`doctype-radio-opt${dokumentTyp === 'projekt' ? ' on' : ''}`}
              onClick={() => setDokumentTyp('projekt')}
            >
              <span className="dot" />
              <MockIcon ctx="default" n="checklist" size={16} />
              <span className="lbl">Komplexes Angebot</span>
              <span className="hint">Projekttitel, Beschreibung, Fotos & Gewerke</span>
            </label>
          </div>
          <div className="h-sep" />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
              Projekt-Beschreibung
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
              Titel, Beschreibung und Fotodokumentation für das Angebot
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
            <MockField label="Projekt-Titel" required>
              <input
                className="input"
                value={meta.leistungsumfang}
                onChange={(e) => patchProjektTitel(e.target.value)}
                placeholder="z.B. Badmodernisierung & Projektkoordination"
              />
            </MockField>
            <MockField
              label="Beschreibung"
              hint="Erscheint als einleitende Projekt-Beschreibung im Angebot"
            >
              <textarea
                className="input ta"
                rows={5}
                value={projektbeschreibung}
                onChange={(e) => setProjektbeschreibung(e.target.value)}
                placeholder="Beschreibe Umfang, Ausführung, Koordination..."
              />
            </MockField>
          </div>
          <div className="h-sep" />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div className="section-h" style={{ marginBottom: 0 }}>
              Fotodokumentation{' '}
              <span
                style={{
                  color: 'var(--text-4, var(--text-3))',
                  fontWeight: 400,
                  textTransform: 'none',
                  letterSpacing: 0,
                  marginLeft: 6,
                }}
              >
                {projektFotos.length} Foto{projektFotos.length === 1 ? '' : 's'}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MockIcon ctx="default" n="info-circle" size={12} /> Erscheint im Angebot zwischen
              Beschreibung und Leistungen
            </span>
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
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div
            className="section-h"
            style={{
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              textTransform: 'none',
              letterSpacing: 0,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            <span>Positionen · {positionenKopf}</span>
            <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 12 }}>{name}</span>
          </div>
          <PosBoard
            positionen={posBoardLines}
            onChange={onPosBoardChange}
            showUst
            gewerke={gewerkNamen}
            preislisten={preislisten}
          />
        </>
      ) : null}

      {step === 3 ? (
        <AngebotWizardHandwerkerStep
          zeilen={zeilen}
          gewerke={gewerke}
          handwerker={handwerker}
          zuweisungen={hwZuweisungen}
          onChange={setHwZuweisungen}
          disabled={saving}
        />
      ) : null}

      {step === 4 ? (
        <div className="form-grid form-grid--sheet">
          <MockField label="Angebotstitel" full>
            <input
              className="input"
              value={meta.titel}
              onChange={(e) => patchTitel(e.target.value)}
            />
          </MockField>
          <MockField label="Gültig bis">
            <input
              type="date"
              className="input"
              value={meta.gueltig_bis}
              onChange={(e) => setMeta((m) => ({ ...m, gueltig_bis: e.target.value }))}
            />
          </MockField>
          <div />
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
          <MockField label="Einleitung" full>
            <textarea
              className="input ta"
              rows={3}
              value={meta.einleitung}
              onChange={(e) => setMeta((m) => ({ ...m, einleitung: e.target.value }))}
            />
          </MockField>
          <MockField label="Schlusstext" full>
            <textarea
              className="input ta"
              rows={3}
              value={meta.schluss}
              onChange={(e) => setMeta((m) => ({ ...m, schluss: e.target.value }))}
            />
          </MockField>
          <div className="full">
            <PosTotals
              netto={mailSummen.nettoMin}
              ust={mailSummen.mwstBetragMin}
              brutto={mailSummen.bruttoMin}
            />
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <AngebotWizardPdfPreview
          angebotId={angebotId}
          loading={previewLoading || saving || !angebotId}
          kundeName={name}
        />
      ) : null}

      {step === 6 ? (
        <div style={{ display: 'grid', gap: 18, maxWidth: 720, margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>Versenden</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
              Empfänger und Betreff prüfen — E-Mail-Vorschau wie beim Kunden
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                label="CC"
                emails={mailCc}
                onChange={setMailCc}
                placeholder="weitere@beispiel.de"
                hint={`Optional — ${KUNDE_MAIL_BCC_HINT}`}
                disabled={saving}
              />
              <MockField label="Betreff" full required>
                <input
                  className="txt"
                  value={mailBetreff}
                  onChange={(e) => setMailBetreff(e.target.value)}
                  disabled={saving}
                  placeholder={defaultMailBetreff}
                />
              </MockField>
            </div>
            <div className="wz-overview" style={{ marginTop: 14 }}>
              <div>
                <span className="k">Gültig bis</span>
                <b>{meta.gueltig_bis ? formatDatum(meta.gueltig_bis) : '—'}</b>
              </div>
              <div>
                <span className="k">Zahlfrist</span>
                <b>{zahlfristText}</b>
              </div>
              <div>
                <span className="k">Gesamt</span>
                <b>{formatEurBetrag(mailSummen.bruttoMin)} brutto</b>
              </div>
            </div>
          </div>

          <div
            className="section-h"
            style={{
              marginBottom: 0,
              textTransform: 'none',
              letterSpacing: 0,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            E-Mail-Vorschau
          </div>
          <AngebotWizardMailPreview
            brand={brand}
            titel={mailBetreff.trim() || meta.titel.trim() || `Angebot ${projekt}`}
            gueltigBis={meta.gueltig_bis}
            einleitung={meta.einleitung}
            schluss={meta.schluss}
            positionen={posBoardLines}
            netto={mailSummen.nettoMin}
            ust={mailSummen.mwstBetragMin}
            brutto={mailSummen.bruttoMin}
            empfaengerMail={mailTo[0] || email || 'kunde@beispiel.de'}
            komplex={dokumentTyp === 'projekt'}
            projektTitel={meta.leistungsumfang.trim() || projekt}
            projektBeschreibung={projektbeschreibung}
            fotos={projektFotos}
            zahlfristText={zahlfristText}
          />

          <div
            style={{
              fontSize: 12.5,
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <MockIcon ctx="default" n="info-circle" size={14} />
            Mit „Angebot versenden“ wird das Angebot als PDF per E-Mail zugestellt.
          </div>
        </div>
      ) : null}
    </WizardShell>
  )

  return createPortal(wizard, document.body)
}

function zahlfristAnzeigeFromLocal(seg: ZahlfristSeg, datum: string): string {
  return angebotZahlfristText({
    ...angebotMetaPatchFromZahlfrist(seg, datum),
  })
}
