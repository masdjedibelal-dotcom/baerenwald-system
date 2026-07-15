'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ListChecks,
  Pencil,
  Save,
  Send,
  X,
} from 'lucide-react'
import { AngebotWizardComplete } from '@/components/angebote/AngebotWizardComplete'
import { AngebotWizardVersandEmpfaengerCard } from '@/components/angebote/AngebotWizardVersandEmpfaengerCard'
import { AppFlowScreen, WizardMobileToolbar } from '@/components/layout/app'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import {
  saveAngebotWizardDraft,
  sendAngebotWizard,
} from '@/app/(dashboard)/angebote/wizard-actions'
import {
  angebotWizardPositionenFromLead,
} from '@/lib/angebote/angebot-positionen-from-lead'
import {
  defaultWizardMeta,
  resolveAngebotKundeTyp,
  formatEurRange,
  initialDokumentTypFromLead,
  leadHatProjektEmpfehlung,
  defaultProjektBeschreibungText,
  isDefaultProjektBeschreibung,
  wizardPositionenAlsFestpreis,
  type AngebotDokumentTyp,
  type AngebotVariantenPersistJson,
  type AngebotWizardBootstrap,
  type AngebotWizardMeta,
  type WizardPosition,
} from '@/lib/angebote/angebot-wizard-types'
import { summenAusPositionen, summenKostenaufstellungAusPositionen } from '@/lib/angebot-positionen'
import {
  zahlungsplanVorlage50_50,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import { angebotPositionenToWizardZeilen } from '@/lib/angebote/wizard-positionen-laden'
import {
  kannHinweis13bAngebot,
  kannHinweis35aAngebot,
} from '@/lib/angebote/angebot-rechtshinweise'
import {
  buildAngebotMail,
  defaultAngebotEinleitungText,
  isDefaultAngebotEinleitung,
  resolveAngebotMailEinleitung,
  resolveAngebotMailSchluss,
} from '@/lib/templates/angebot-mail'
import { AngebotWizardFotodokumentation } from '@/components/angebote/AngebotWizardFotodokumentation'
import { AngebotWizardVizBlock } from '@/components/angebote/AngebotWizardVizBlock'
import { AngebotWizardPositionenByGewerk } from '@/components/angebote/AngebotWizardPositionenByGewerk'
import { AngebotWizardAngebotDetailsCard } from '@/components/angebote/AngebotWizardAngebotDetailsCard'
import { AngebotWizardMailTexteCard } from '@/components/angebote/AngebotWizardMailTexteCard'
import { AngebotWizardRechtlicheHinweiseCard } from '@/components/angebote/AngebotWizardRechtlicheHinweiseCard'
import { AngebotWizardProjektBeschreibungCard } from '@/components/angebote/AngebotWizardProjektBeschreibungCard'
import { isValidEmail } from '@/lib/email-recipients'
import { KundeModal } from '@/components/kunden/KundeModal'
import type { AngebotProjektFoto } from '@/lib/angebote/angebot-projekt-fotos'
import {
  dokumentArtikelToWizardPosition,
  dokumentZeilenToAngebotPositionen,
  formatEurBetrag,
  wizardPositionToDokumentZeile,
  type DokumentArtikelZeile,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import { leadKontaktAnzeigeName, resolveLeadKunde } from '@/lib/lead-display-helpers'
import { BEREICH_LABELS, cn } from '@/lib/utils'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { kundeRechnungsempfaengerAusStammdaten } from '@/lib/kunde-rechnungsempfaenger'
import { istKundeGewerbeTyp } from '@/lib/kunde-stammdaten'
import { KundenObjekteCard } from '@/components/kunden/KundenObjekteCard'
import { fetchKundenObjekte, setLeadKundeObjekt } from '@/app/actions/kunden-objekte'
import type { KundenObjekt } from '@/lib/types'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { findAnfahrtZeilen } from '@/lib/anfahrt-angebot'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import { firmenEinstellungenToMailBranding } from '@/lib/mail-branding'
import { mailAnredeFromKundeTyp } from '@/lib/mail/anrede'
import type { Gewerk, Handwerker, LeadDetail, Preisliste } from '@/lib/types'

function kundenName(lead: LeadDetail) {
  return leadKontaktAnzeigeName(lead)
}

function WizardProjektDivider() {
  return <hr className="wizard-projekt-divider" aria-hidden />
}

function WizardProjektSection({ children }: { children: ReactNode }) {
  return <section className="wizard-projekt-section">{children}</section>
}

const WIZARD_STEP_LABELS = ['Leistungen', 'Finalisieren', 'Versenden'] as const
const WIZARD_TOTAL_STEPS = WIZARD_STEP_LABELS.length

function WizardSection({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('wizard-section-gap', className)}>{children}</div>
}

function projektLabel(lead: LeadDetail) {
  const bereiche = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  if (bereiche.length) return bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
  return leadSituationDisplay(lead.situation) || 'Projekt'
}

function formatEntwurfGespeichertZeit(d: Date): string {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatGueltigBisDe(ymd: string): string {
  if (!ymd?.trim()) return '—'
  try {
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim()) ? `${ymd.trim()}T12:00:00` : ymd)
    return d.toLocaleDateString('de-DE')
  } catch {
    return ymd
  }
}

function istBildAnhangUrl(url: string): boolean {
  const u = url.split('?')[0].toLowerCase()
  if (u.includes('/lead-notizen-fotos/')) return true
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(u)
}

export function AngebotWizard({
  lead,
  gewerke,
  preislisten,
  firm: firmProp,
  kundenObjekte = [],
  handwerker = [],
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
  /** Vorbefüllung beim Weiterbearbeiten eines Entwurfs (kein neues Angebot anlegen). */
  bootstrap?: AngebotWizardBootstrap | null
  onClose: () => void
  onDone?: (angebotId: string) => void
  /** Nach Entwurf-Speichern (Liste/Dokumente aktualisieren). */
  onSaved?: (angebotId: string) => void
}) {
  const router = useRouter()
  const firm = firmProp ?? defaultFirmenEinstellungen()
  const [leadState, setLeadState] = useState(lead)
  const [stammdatenModalOpen, setStammdatenModalOpen] = useState(false)
  const [mailTo, setMailTo] = useState<string[]>([])
  const [mailCc, setMailCc] = useState<string[]>([])
  const mailRecipientsInitRef = useRef(false)

  useEffect(() => {
    setLeadState(lead)
  }, [lead])

  const name = kundenName(leadState)
  const projekt = projektLabel(leadState)
  const kunde = resolveLeadKunde(leadState.kunden)
  const kundeId = kunde?.id ?? leadState.kunde_id
  const email = kunde?.email ?? leadState.kontakt_email ?? ''
  const leistungsumfangInitial =
    bereicheFuerAnzeige(leadState.bereiche, leadState.situation)
      .map((b) => BEREICH_LABELS[b] ?? b)
      .join(' & ') || projekt
  const kundeTyp = resolveAngebotKundeTyp(kunde?.typ, leadState.kundentyp)
  const zeigeObjektAuswahl = Boolean(kundeId) && istKundeGewerbeTyp(kundeTyp)
  const [objekteListe, setObjekteListe] = useState<KundenObjekt[]>(kundenObjekte)

  useEffect(() => {
    if (!zeigeObjektAuswahl || !kundeId) {
      setObjekteListe([])
      return
    }
    if (kundenObjekte.length > 0) {
      setObjekteListe(kundenObjekte)
      return
    }
    let cancelled = false
    void fetchKundenObjekte(kundeId).then((rows) => {
      if (!cancelled) setObjekteListe(rows)
    })
    return () => {
      cancelled = true
    }
  }, [zeigeObjektAuswahl, kundeId, kundenObjekte])

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
  }, [bootstrap, preislisten])

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
  const [mitAnfahrt, setMitAnfahrt] = useState(() => findAnfahrtZeilen(initialZeilen).length > 0)
  const [meta, setMeta] = useState<AngebotWizardMeta>(() => {
    const base = bootstrap?.meta ?? defaultMeta
    if (bootstrap?.meta?.kunde_objekt_id) return base
    if (leadState.kunde_objekt_id) {
      return { ...base, kunde_objekt_id: leadState.kunde_objekt_id }
    }
    return base
  })

  function waehleAngebotObjekt(objektId: string | null) {
    setMeta((m) => ({ ...m, kunde_objekt_id: objektId }))
    void setLeadKundeObjekt(leadState.id, objektId)
    setLeadState((l) => ({ ...l, kunde_objekt_id: objektId }))
  }
  const [dokumentTyp, setDokumentTyp] = useState<AngebotDokumentTyp>(
    () => bootstrap?.dokumentTyp ?? initialDokumentTypFromLead(leadState.bereiche, leadState.situation)
  )
  const empfohleneProjektAuswahl = useMemo(
    () => leadHatProjektEmpfehlung(leadState.bereiche, leadState.situation),
    [leadState.bereiche, leadState.situation]
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
  const [variantenPersist] = useState<AngebotVariantenPersistJson | null>(
    () => bootstrap?.varianten ?? null
  )
  const [wichtigeHinweisePersist] = useState(() => bootstrap?.wichtige_hinweise?.trim() ?? '')
  const [zahlungsplan, setZahlungsplan] = useState<Zahlungsplan | null>(
    () => bootstrap?.zahlungsplan ?? null
  )
  const [projektUploading, setProjektUploading] = useState(false)
  const [angebotId, setAngebotId] = useState<string | null>(bootstrap?.angebotId ?? null)
  const istAuftragKorrektur = Boolean(bootstrap?.auftragKorrektur?.auftragId)
  const auftragKorrekturId = bootstrap?.auftragKorrektur?.auftragId ?? null
  const wizardTitel = istAuftragKorrektur ? 'Angebot korrigieren' : 'Angebot erstellen'
  const [completedAngebotId, setCompletedAngebotId] = useState<string | null>(null)
  const [versendetErfolg, setVersendetErfolg] = useState(false)
  const [angebotsnr, setAngebotsnr] = useState(bootstrap?.angebotsnr?.trim() || 'Entwurf')

  function patchProjektTitel(neu: string) {
    setMeta((m) => {
      const altLu = m.leistungsumfang.trim() || projekt
      const nextLu = neu.trim() || projekt
      const patch: Partial<AngebotWizardMeta> = { leistungsumfang: neu }
      if (isDefaultAngebotEinleitung(m.einleitung, altLu)) {
        const effAnrede = m.anrede ?? mailAnredeFromKundeTyp(kundeTyp)
        patch.einleitung = defaultAngebotEinleitungText(effAnrede, nextLu)
      }
      return { ...m, ...patch }
    })
    setProjektbeschreibung((prev) => {
      const altTitel = meta.leistungsumfang.trim() || projekt
      if (isDefaultProjektBeschreibung(prev, altTitel)) {
        return defaultProjektBeschreibungText(neu.trim() || projekt)
      }
      return prev
    })
  }
  const [saving, setSaving] = useState(false)
  const [vizFotoLoading, setVizFotoLoading] = useState<string | null>(null)
  const [draftDirty, setDraftDirty] = useState(() => !bootstrap?.angebotId)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() =>
    bootstrap?.angebotId ? new Date() : null
  )
  const savedSnapshotRef = useRef<string | null>(null)
  const draftSnapshotRef = useRef('')

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
      }),
    [zeilen, meta, dokumentTyp, projektbeschreibung, projektFotos, mitAnfahrt, zahlungsplan]
  )

  draftSnapshotRef.current = draftSnapshot

  useEffect(() => {
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = draftSnapshot
      return
    }
    setDraftDirty(draftSnapshot !== savedSnapshotRef.current)
  }, [draftSnapshot])

  const rechnungsempfaenger = useMemo(
    () =>
      kundeRechnungsempfaengerAusStammdaten(leadState.kunden, {
        plz: leadState.plz,
        kontakt_name: leadState.kontakt_name,
        kontakt_email: leadState.kontakt_email,
        kontakt_telefon: leadState.kontakt_telefon,
        funnel_daten: leadState.funnel_daten,
      }),
    [
      leadState.kunden,
      leadState.plz,
      leadState.kontakt_name,
      leadState.kontakt_email,
      leadState.kontakt_telefon,
      leadState.funnel_daten,
    ]
  )

  const mailSummen = useMemo(
    () => summenAusPositionen(dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke), 19),
    [zeilen, firm, gewerke]
  )
  const lohnNettoPdf =
    summenKostenaufstellungAusPositionen(
      dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke)
    )?.lohn_netto ?? 0
  const hinweis35aErlaubt = kannHinweis35aAngebot(kundeTyp, firm, lohnNettoPdf)
  const hinweis13bErlaubt = kannHinweis13bAngebot(kundeTyp, firm)

  useEffect(() => {
    const hat = findAnfahrtZeilen(zeilen).length > 0
    setMitAnfahrt((prev) => (prev === hat ? prev : hat))
    setMeta((m) => (m.mit_anfahrt === hat ? m : { ...m, mit_anfahrt: hat }))
  }, [zeilen])

  function syncZeilenToPositions(next: DokumentZeile[]) {
    setZeilen(next)
    setPositions(
      next
        .filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
        .map(dokumentArtikelToWizardPosition)
    )
  }

  const notizFotos = useMemo(
    () =>
      (lead.lead_notizen ?? [])
        .map((n) => n.datei_url?.trim())
        .filter((u): u is string => Boolean(u && istBildAnhangUrl(u)))
        .map((url) => ({ url })),
    [lead.lead_notizen]
  )

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

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
          const url = js.url as string
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
      if (!meta.leistungsumfang.trim()) {
        toast.error('Bitte einen Projekt-Titel angeben.')
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

      setSaving(true)
      const res = await saveAngebotWizardDraft({
        angebotId,
        lead_id: lead.id,
        kunde_id: kundeId,
        positionen: dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke),
        artikelFuerPreislisteSync: artikelA,
        meta: { ...meta, mit_anfahrt: mitAnfahrt },
        dokument_typ: dokumentTyp,
        projektbeschreibung: projektbeschreibung.trim() || null,
        fotos_urls: projektFotos,
        wichtige_hinweise:
          dokumentTyp === 'projekt' ? wichtigeHinweisePersist.trim() || null : undefined,
        varianten: dokumentTyp === 'projekt' ? variantenPersist : null,
        handwerker_zuweisungen: [],
        handwerker_aufgabe_notizen: {},
        zahlungsplan:
          meta.zahlungsbedingungen === 'abschlagsplan' ||
          meta.zahlungsbedingungen === 'anzahlung_50'
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
      if (res.angebotsnr?.trim()) setAngebotsnr(res.angebotsnr.trim())
      savedSnapshotRef.current = draftSnapshotRef.current
      setDraftDirty(false)
      setLastSavedAt(new Date())
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
    ]
  )

  function handleRequestClose() {
    if (draftDirty && !saving) {
      const verwerfen = window.confirm(
        'Es gibt ungespeicherte Änderungen. Wizard schließen und Änderungen verwerfen?'
      )
      if (!verwerfen) return
    }
    onClose()
  }

  async function handleEntwurfSpeichern() {
    await persistDraft({ notify: true })
  }

  const handleVisualisierenFoto = useCallback(
    async (fotoUrl: string) => {
      setVizFotoLoading(fotoUrl)
      try {
        let id = angebotId
        if (!id) {
          id = await persistDraft({ notify: false })
          if (!id) {
            toast.error(
              'Entwurf konnte nicht gespeichert werden — bitte Titel und mindestens eine Position prüfen.'
            )
            return
          }
          toast.success('Entwurf gespeichert — Visualisierung wird geöffnet')
        }
        const params = new URLSearchParams({ ist_url: fotoUrl })
        window.open(
          `/angebote/${id}/visualisierung?${params.toString()}`,
          '_blank',
          'noopener,noreferrer'
        )
      } finally {
        setVizFotoLoading(null)
      }
    },
    [angebotId, persistDraft]
  )

  async function handleWeiter() {
    if (step === 1) {
      const artikelA = zeilen.filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      if (!artikelA.length) {
        toast.error('Bitte mindestens eine Artikel-Position anlegen.')
        return
      }
      if (artikelA.some((z) => !z.bezeichnung.trim())) {
        toast.error('Bitte bei allen Artikel-Positionen eine Bezeichnung eintragen.')
        return
      }
      if (!meta.leistungsumfang.trim()) {
        toast.error('Bitte einen Projekt-Titel angeben.')
        return
      }
    }
    const id = await persistDraft({ notify: true })
    if (!id) return
    setStep((s) => Math.min(WIZARD_TOTAL_STEPS, s + 1))
  }

  const todayYmd = new Date().toISOString().slice(0, 10)

  async function handlePdf() {
    const id = angebotId ?? (await persistDraft())
    if (!id) return
    try {
      const res = await fetch('/api/angebot-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angebotId: id }),
      })
      if (!res.ok) {
        let msg = await res.text()
        try {
          const j = JSON.parse(msg) as { error?: string }
          if (j.error) msg = j.error
        } catch {
          /* Roh-Text */
        }
        toast.error(msg || 'PDF konnte nicht erzeugt werden')
        return
      }
      const blob = await res.blob()
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u
      a.download = `Angebot_Baerenwald_${name.replace(/\s+/g, '_')}_${meta.gueltig_bis}.pdf`
      a.click()
      URL.revokeObjectURL(u)
      toast.success('PDF heruntergeladen')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download fehlgeschlagen')
    }
  }

  async function handleWizardErstellen() {
    setSaving(true)
    const id = await persistDraft({ notify: false })
    setSaving(false)
    if (!id) return
    toast.success(
      istAuftragKorrektur
        ? 'Angebot gespeichert — Auftrag wurde aktualisiert'
        : 'Angebot erstellt'
    )
    setVersendetErfolg(false)
    setCompletedAngebotId(id)
    router.refresh()
  }

  async function handleWizardErstellenUndVersenden() {
    if (!mailTo.length) {
      toast.error('Bitte mindestens eine E-Mail-Adresse unter „An“ angeben.')
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
      mailTo,
      mailCc,
      auftragKorrektur: istAuftragKorrektur,
    })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(
      istAuftragKorrektur
        ? 'Korrektur gespeichert und an den Kunden gesendet'
        : 'Angebot erstellt und versendet'
    )
    setVersendetErfolg(true)
    setCompletedAngebotId(id)
    onDone?.(id)
    router.refresh()
  }

  const leistungsumfangMail =
    meta.leistungsumfang.trim() || meta.titel.trim() || projekt

  const mailBranding = useMemo(() => firmenEinstellungenToMailBranding(firm), [firm])

  const previewAnrede = meta.anrede ?? mailAnredeFromKundeTyp(kundeTyp)

  const mailHtmlPreview = useMemo(
    () =>
      buildAngebotMail(
        {
          name: rechnungsempfaenger.name,
          vorname: rechnungsempfaenger.vorname,
          nachname: rechnungsempfaenger.nachname,
          ansprechpartner: rechnungsempfaenger.ansprechpartner,
          typ: rechnungsempfaenger.typ,
          angebotsnr,
          leistungsumfang: leistungsumfangMail,
          gesamt_brutto: mailSummen.bruttoMin,
          gueltig_bis: formatGueltigBisDe(meta.gueltig_bis),
          anrede: previewAnrede,
          einleitung: resolveAngebotMailEinleitung(
            meta.einleitung,
            previewAnrede,
            leistungsumfangMail
          ),
          schluss: resolveAngebotMailSchluss(meta.schluss, previewAnrede),
          istKorrektur: bootstrap?.bereitsGesendet ?? istAuftragKorrektur ?? false,
        },
        mailBranding
      ),
    [
      rechnungsempfaenger,
      angebotsnr,
      leistungsumfangMail,
      mailSummen.bruttoMin,
      meta.gueltig_bis,
      meta.einleitung,
      meta.schluss,
      meta.anrede,
      previewAnrede,
      kundeTyp,
      bootstrap?.bereitsGesendet,
      istAuftragKorrektur,
      mailBranding,
    ]
  )

  const pdfName = `Angebot_Baerenwald_${name.replace(/\s+/g, '_')}_${meta.gueltig_bis}.pdf`

  const angebotPreviewSrc = angebotId
    ? `/api/angebot-pdf?angebotId=${encodeURIComponent(angebotId)}&preview=html`
    : null

  useEffect(() => {
    if (step !== 3) return
    if (mailRecipientsInitRef.current) return
    const e = (rechnungsempfaenger.email || email || '').trim()
    if (e && isValidEmail(e)) setMailTo([e])
    setMailCc([])
    mailRecipientsInitRef.current = true
  }, [step, rechnungsempfaenger.email, email])

  useEffect(() => {
    if (step !== 3 || angebotId || saving) return
    void persistDraft({ notify: false })
  }, [step, angebotId, saving, persistDraft])

  const entwurfStatusHint = saving
    ? 'Entwurf wird gespeichert…'
    : draftDirty
      ? angebotId
        ? 'Ungespeicherte Änderungen'
        : 'Noch nicht als Entwurf gespeichert'
      : lastSavedAt
        ? `Entwurf gespeichert · ${formatEntwurfGespeichertZeit(lastSavedAt)}${angebotsnr !== 'Entwurf' ? ` · ${angebotsnr}` : ''}`
        : angebotId
          ? `Entwurf ${angebotsnr}`
          : null

  if (!mounted) return null

  const wizardMobileActions =
    step < WIZARD_TOTAL_STEPS ? (
      <>
        {step > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="wizard-mobile-toolbar__back shrink-0 px-2"
            onClick={() => setStep((s) => s - 1)}
            aria-label="Zurück"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="wizard-mobile-toolbar__save shrink-0 px-2.5"
          loading={saving}
          onClick={() => void handleEntwurfSpeichern()}
          aria-label="Entwurf speichern"
          title="Entwurf speichern"
        >
          <Save className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="wizard-mobile-toolbar__next shrink-0 gap-1 px-2.5"
          loading={saving}
          onClick={() => void handleWeiter()}
        >
          Weiter
          <ChevronRight className="h-4 w-4" />
        </Button>
      </>
    ) : (
      <>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="wizard-mobile-toolbar__back shrink-0 px-2"
          onClick={() => setStep((s) => s - 1)}
          aria-label="Zurück"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="wizard-mobile-toolbar__save shrink-0 px-2.5"
          loading={saving}
          onClick={() => void handleWizardErstellen()}
          aria-label={istAuftragKorrektur ? 'Speichern und Auftrag aktualisieren' : 'Angebot erstellen'}
        >
          <Check className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="wizard-mobile-toolbar__next shrink-0 gap-1 px-2.5"
          loading={saving}
          onClick={() => void handleWizardErstellenUndVersenden()}
        >
          <Send className="h-4 w-4" />
          {istAuftragKorrektur ? 'Korrektur senden' : 'Senden'}
        </Button>
      </>
    )

  const wizardHeader = (
    <>
      <WizardMobileToolbar
        onClose={handleRequestClose}
        totalSteps={WIZARD_TOTAL_STEPS}
        currentStep={step}
        stepLabel={`Schritt ${step}: ${WIZARD_STEP_LABELS[step - 1]}`}
        actions={wizardMobileActions}
      />
      <div className="wizard-header-desktop hidden md:flex md:min-w-0 md:flex-1 md:items-center">
      <button type="button" className="btn btn-ghost btn-sm" onClick={handleRequestClose} aria-label="Schließen">
        <X className="h-4 w-4" />
      </button>
      <div className="h-6 w-px shrink-0 bg-bw-border" aria-hidden />
      <div className="title-block min-w-0">
        <div className="ttl">{wizardTitel}</div>
        <div className="sub">
          {istAuftragKorrektur ? (
            <>
              Korrektur für laufenden Auftrag · {name}
              <span className="block text-[12px] text-bw-text-muted">
                Keine erneute Annahme — Änderungen gelten für Rechnung und Ausführung.
              </span>
            </>
          ) : (
            <>
              Für Anfrage {lead.id.slice(0, 8).toUpperCase()} · {name}
            </>
          )}
          {entwurfStatusHint ? (
            <span
              className={cn(
                'wizard-save-status',
                draftDirty && !saving && 'wizard-save-status--dirty',
                saving && 'wizard-save-status--saving'
              )}
            >
              {' '}
              · {entwurfStatusHint}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex-1" />
      <nav className="stepper" aria-label="Fortschritt">
        <Step n={1} label="Leistungen" active={step === 1} done={step > 1} />
        <ChevronRight className="step-arrow h-3.5 w-3.5" aria-hidden />
        <Step n={2} label="Finalisieren" active={step === 2} done={step > 2} />
        <ChevronRight className="step-arrow h-3.5 w-3.5" aria-hidden />
        <Step n={3} label="Versenden" active={step === 3} done={false} />
      </nav>
      <div className="flex-1" />
      <div className="wizard-nav-actions">
      {step > 1 ? (
        <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Zurück
        </Button>
      ) : null}
      {step < WIZARD_TOTAL_STEPS ? (
        <>
          <Button
            type="button"
            variant="secondary"
            className="gap-1.5"
            loading={saving}
            onClick={() => void handleEntwurfSpeichern()}
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            Speichern
          </Button>
          <Button
            type="button"
            variant="primary"
            className="gap-1.5"
            loading={saving}
            onClick={() => void handleWeiter()}
          >
            Weiter
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="secondary"
            className="gap-1.5"
            loading={saving}
            onClick={() => void handleWizardErstellen()}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            {istAuftragKorrektur ? 'Speichern & Auftrag aktualisieren' : 'Angebot erstellen'}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="gap-1.5"
            loading={saving}
            onClick={() => void handleWizardErstellenUndVersenden()}
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
            {istAuftragKorrektur ? 'Korrektur an Kunden senden' : 'Erstellen und versenden'}
          </Button>
        </>
      )}
      </div>
      </div>
    </>
  )

  const wizard = (
    <AppFlowScreen
      className="wizard-flow"
      header={completedAngebotId ? undefined : wizardHeader}
    >
      {completedAngebotId ? (
        <AngebotWizardComplete
          angebotId={completedAngebotId}
          kundeName={name}
          versendet={versendetErfolg}
          onClose={() => {
            setCompletedAngebotId(null)
            onClose()
          }}
        />
      ) : (
      <>
      <div className="wizard-inner">
          {step === 1 ? (
            <>
              <WizardSection>
              <Card title="Anfrage-Daten" collapsible={false}>
                <div className="props">
                  <PropRow label="Kunde" value={name} />
                  <PropRow label="Projekt" value={projekt} />
                  <PropRow
                    label="Region"
                    value={[leadState.plz, leadState.kunden?.ort].filter(Boolean).join(' · ') || '—'}
                  />
                  <PropRow
                    label="Preisrahmen"
                    value={
                      lead.preis_min != null && lead.preis_max != null
                        ? formatEurRange(lead.preis_min, lead.preis_max)
                        : '—'
                    }
                  />
                </div>
              </Card>
              </WizardSection>

              {zeigeObjektAuswahl && kundeId ? (
                <WizardSection>
                <KundenObjekteCard
                  key={kundeId}
                  variant="select"
                  kundeId={kundeId}
                  objekte={objekteListe}
                  selectedId={meta.kunde_objekt_id ?? leadState.kunde_objekt_id}
                  onSelect={waehleAngebotObjekt}
                  onChanged={() => {
                    router.refresh()
                  }}
                />
                </WizardSection>
              ) : null}

              <WizardSection>
                <h2 className="wizard-step-heading">Dokumenttyp</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label
                    className={cn(
                      'block cursor-pointer rounded-lg border p-4 transition-colors',
                      dokumentTyp === 'einfach'
                        ? 'border-bw-primary bg-bw-green-bg'
                        : 'border-bw-border bg-surface hover:bg-bw-hover/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="bw_dokument_typ"
                      className="sr-only"
                      checked={dokumentTyp === 'einfach'}
                      onChange={() => setDokumentTyp('einfach')}
                    />
                    <div className="flex items-center gap-2 text-[14px] font-medium text-bw-text">
                      <FileText className="h-4 w-4 shrink-0 text-bw-primary" aria-hidden />
                      Einfaches Angebot
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-bw-text-muted">
                      Positionen & Preise — schnell für einfache Einzelleistungen
                    </p>
                  </label>
                  <label
                    className={cn(
                      'block cursor-pointer rounded-lg border p-4 transition-colors',
                      dokumentTyp === 'projekt'
                        ? 'border-bw-primary bg-bw-green-bg'
                        : 'border-bw-border bg-surface hover:bg-bw-hover/50'
                    )}
                  >
                    <input
                      type="radio"
                      name="bw_dokument_typ"
                      className="sr-only"
                      checked={dokumentTyp === 'projekt'}
                      onChange={() => setDokumentTyp('projekt')}
                    />
                    <div className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-bw-text">
                      <ListChecks className="h-4 w-4 shrink-0 text-bw-primary" aria-hidden />
                      Projekt-Angebot
                      {empfohleneProjektAuswahl ? (
                        <span className="rounded bg-bw-primary px-1.5 py-px text-[10px] font-medium text-white">
                          empfohlen
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-bw-text-muted">
                      Mit Projektbeschreibung, Fotodokumentation und professionellem Layout
                    </p>
                  </label>
                </div>
              </WizardSection>

              {dokumentTyp === 'projekt' ? (
                <div className="wizard-projekt-flow">
              <AngebotWizardProjektBeschreibungCard
                titel={meta.leistungsumfang}
                onTitelChange={patchProjektTitel}
                beschreibung={projektbeschreibung}
                onBeschreibungChange={setProjektbeschreibung}
                beschreibungPlaceholder="Kurzbeschreibung für das PDF…"
                disabled={saving}
              />

              <WizardProjektDivider />

              <WizardProjektSection>
                <AngebotWizardPositionenByGewerk
                  zeilen={zeilen}
                  onChange={syncZeilenToPositions}
                  gewerke={gewerke}
                  preislisten={preislisten}
                  firm={firm}
                  titel="Positionen"
                  untertitel="Pro Gewerk eigener Abschnitt — Anfahrt je Gewerk separat"
                />
              </WizardProjektSection>
                </div>
              ) : dokumentTyp === 'einfach' ? (
                <div className="wizard-projekt-flow">
                  <AngebotWizardProjektBeschreibungCard
                    titel={meta.leistungsumfang}
                    onTitelChange={patchProjektTitel}
                    beschreibung={projektbeschreibung}
                    onBeschreibungChange={setProjektbeschreibung}
                    beschreibungPlaceholder="Kurzbeschreibung für das PDF…"
                    disabled={saving}
                  />

                  <WizardProjektDivider />

                  <WizardProjektSection>
                    <AngebotWizardPositionenByGewerk
                      zeilen={zeilen}
                      onChange={syncZeilenToPositions}
                      gewerke={gewerke}
                      preislisten={preislisten}
                      firm={firm}
                      titel="Positionen"
                      untertitel="Gewerk-Titel und Beschreibung bearbeiten, Positionen darunter erfassen"
                      hideGewerkAddRow
                      ensureInitialGewerkBlock
                      defaultGewerkTitel={meta.leistungsumfang.trim() || projekt}
                    />
                  </WizardProjektSection>
                </div>
              ) : null}

              {dokumentTyp === 'projekt' || dokumentTyp === 'einfach' ? (
                <>
                  <WizardProjektDivider />

                  <AngebotWizardFotodokumentation
                    fotos={projektFotos}
                    onChange={setProjektFotos}
                    notizFotos={notizFotos}
                    uploading={projektUploading}
                    disabled={saving}
                    onUploadFiles={(files) => void uploadProjektFotoFiles(files)}
                    onVisualisierenFoto={handleVisualisierenFoto}
                    visualisierenFotoUrl={vizFotoLoading}
                  />

                  <WizardProjektDivider />

                  <AngebotWizardVizBlock angebotId={angebotId} disabled={saving} />
                </>
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="wizard-projekt-flow">
                <AngebotWizardAngebotDetailsCard
                  meta={meta}
                  onMetaChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
                  dokumentTyp={dokumentTyp}
                  todayYmd={todayYmd}
                  zahlungsplan={zahlungsplan}
                  onZahlungsplanChange={setZahlungsplan}
                  gesamtNetto={mailSummen.nettoMin}
                />

                <WizardProjektDivider />

                <AngebotWizardMailTexteCard
                  leistungsumfangMail={leistungsumfangMail}
                  einleitung={meta.einleitung}
                  schluss={meta.schluss}
                  onEinleitungSchlussChange={(einleitung, schluss) =>
                    setMeta((m) => ({ ...m, einleitung, schluss }))
                  }
                  mailHtmlPreview={mailHtmlPreview}
                  disabled={saving}
                />

                <WizardProjektDivider />

                <AngebotWizardRechtlicheHinweiseCard
                  meta={meta}
                  onMetaChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
                  hinweis35aErlaubt={hinweis35aErlaubt}
                  hinweis13bErlaubt={hinweis13bErlaubt}
                  lohnNettoPdf={lohnNettoPdf}
                />
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <div>
              <Card
                title="Rechnungsempfänger (Stammdaten)"
                action={
                  leadState.kunden ? (
                    <button
                      type="button"
                      onClick={() => setStammdatenModalOpen(true)}
                      className="btn btn-ghost btn-sm"
                      aria-label="Stammdaten bearbeiten"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null
                }
              >
                {rechnungsempfaenger.fehlendeRechnungsfelder.length > 0 ? (
                  <p className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-950">
                    Für Rechnungen fehlen: {rechnungsempfaenger.fehlendeRechnungsfelder.join(', ')}.
                  </p>
                ) : null}
                <div className="props">
                  {rechnungsempfaenger.kundennummer ? (
                    <PropRow label="Kundennr." value={rechnungsempfaenger.kundennummer} />
                  ) : null}
                  <PropRow label="Name" value={rechnungsempfaenger.name} bold />
                  <PropRow
                    label="E-Mail"
                    value={rechnungsempfaenger.email || email || '—'}
                    link={Boolean(rechnungsempfaenger.email || email)}
                  />
                  <PropRow label="Anhang" value={pdfName} />
                </div>
              </Card>

              <div className="mt-4">
                <AngebotWizardVersandEmpfaengerCard
                  mailTo={mailTo}
                  onMailToChange={setMailTo}
                  mailCc={mailCc}
                  onMailCcChange={setMailCc}
                  disabled={saving}
                />
              </div>

              <Card
                title="Angebots-Vorschau"
                flush
                bodyClassName="p-0"
                className="mt-4"
                action={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!angebotId || saving}
                    onClick={() => void handlePdf()}
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                }
              >
                {angebotPreviewSrc ? (
                  <iframe
                    src={angebotPreviewSrc}
                    title="Angebots-Vorschau"
                    className="wizard-angebot-preview rounded-none border-0"
                  />
                ) : (
                  <p className="px-4 py-8 text-center text-[13px] text-bw-text-muted">
                    Entwurf wird vorbereitet…
                  </p>
                )}
              </Card>

              <Card className="mt-4 border-dashed">
                <p className="text-sm text-bw-text-muted">
                  {istAuftragKorrektur ? (
                    <>
                      Mit <strong>Speichern & Auftrag aktualisieren</strong> werden Angebot und
                      Auftragspositionen angepasst — ohne erneute Kundenannahme. Mit{' '}
                      <strong>Korrektur an Kunden senden</strong> geht zusätzlich die aktualisierte
                      Angebots-PDF per E-Mail raus.
                    </>
                  ) : (
                    <>
                      Mit <strong>Angebot erstellen</strong> speichern Sie nur den Entwurf. Mit{' '}
                      <strong>Erstellen und versenden</strong> wird das Angebot direkt an den Kunden
                      geschickt. Handwerker-Zuweisung ist optional und kann danach im Angebot erfolgen.
                    </>
                  )}
                </p>
              </Card>
            </div>
          ) : null}
        </div>

      {leadState.kunden ? (
        <KundeModal
          open={stammdatenModalOpen}
          onClose={() => setStammdatenModalOpen(false)}
          editKunde={leadState.kunden}
          leadFunnelDaten={leadState.funnel_daten}
          stayOnPage
          revalidateAnfrageId={leadState.id}
          onSaved={() => {
            toast.success('Stammdaten gespeichert')
            setStammdatenModalOpen(false)
            router.refresh()
          }}
        />
      ) : null}
      </>
      )}
    </AppFlowScreen>
  )

  return createPortal(wizard, document.body)
}

function Step({
  n,
  label,
  active,
  done,
}: {
  n: number
  label: string
  active: boolean
  done: boolean
}) {
  return (
    <div className={cn('step', active && 'active', done && 'done')}>
      <span className="step-n">
        {done ? <Check strokeWidth={3} aria-hidden /> : n}
      </span>
      <span>{label}</span>
    </div>
  )
}

function PropRow({
  label,
  value,
  bold,
  link,
}: {
  label: string
  value: string
  bold?: boolean
  link?: boolean
}) {
  return (
    <div className="prop">
      <div className="prop-l">{label}</div>
      <div className={cn('prop-v', link && 'link', bold && 'font-medium')}>{value}</div>
    </div>
  )
}
