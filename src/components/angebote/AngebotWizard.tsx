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
import { angebotPositionenToWizardZeilen } from '@/lib/angebote/wizard-positionen-laden'
import {
  kannHinweis13bAngebot,
  kannHinweis19Angebot,
  kannHinweis35aAngebot,
} from '@/lib/angebote/angebot-rechtshinweise'
import { parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
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

const WIZARD_STEP_LABELS = ['Leistungen', 'Finalisieren'] as const
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
  const [projektUploading, setProjektUploading] = useState(false)
  const [angebotId, setAngebotId] = useState<string | null>(bootstrap?.angebotId ?? null)
  const [completedAngebotId, setCompletedAngebotId] = useState<string | null>(null)
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
      }),
    [zeilen, meta, dokumentTyp, projektbeschreibung, projektFotos, mitAnfahrt]
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
  const kleinunternehmer = parseKleinunternehmerSetting(firm.kleinunternehmer)
  const lohnNettoPdf =
    summenKostenaufstellungAusPositionen(
      dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke)
    )?.lohn_netto ?? 0
  const hinweis35aErlaubt = kannHinweis35aAngebot(kundeTyp, firm, lohnNettoPdf)
  const hinweis19Erlaubt = kannHinweis19Angebot(firm)
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
        fotos_urls: dokumentTyp === 'projekt' ? projektFotos : [],
        wichtige_hinweise:
          dokumentTyp === 'projekt' ? wichtigeHinweisePersist.trim() || null : undefined,
        varianten: dokumentTyp === 'projekt' ? variantenPersist : null,
        handwerker_zuweisungen: [],
        handwerker_aufgabe_notizen: {},
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
    ]
  )

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
    if (step >= WIZARD_TOTAL_STEPS) {
      await handleWizardFertig()
      return
    }
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

  async function handleWizardFertig() {
    setSaving(true)
    const id = await persistDraft({ notify: false })
    if (!id) {
      setSaving(false)
      return
    }
    const res = await sendAngebotWizard({ angebotId: id, lead_id: lead.id })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success('Angebot erstellt')
    onDone?.(id)
    setCompletedAngebotId(id)
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
          istKorrektur: bootstrap?.bereitsGesendet ?? false,
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
      mailBranding,
    ]
  )

  const pdfName = `Angebot_Baerenwald_${name.replace(/\s+/g, '_')}_${meta.gueltig_bis}.pdf`

  const angebotPreviewSrc = angebotId
    ? `/api/angebot-pdf?angebotId=${encodeURIComponent(angebotId)}&preview=html`
    : null

  useEffect(() => {
    if (step !== 2) return
    if (mailRecipientsInitRef.current) return
    const e = (rechnungsempfaenger.email || email || '').trim()
    if (e && isValidEmail(e)) setMailTo([e])
    setMailCc([])
    mailRecipientsInitRef.current = true
  }, [step, rechnungsempfaenger.email, email])

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

  const wizardMobileActions = (
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
        {step >= WIZARD_TOTAL_STEPS ? (
          <>
            <Send className="h-4 w-4" />
            Fertig
          </>
        ) : (
          <>
            Weiter
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </>
  )

  const wizardHeader = (
    <>
      <WizardMobileToolbar
        onClose={onClose}
        totalSteps={WIZARD_TOTAL_STEPS}
        currentStep={step}
        stepLabel={`Schritt ${step}: ${WIZARD_STEP_LABELS[step - 1]}`}
        actions={wizardMobileActions}
      />
      <div className="wizard-header-desktop hidden md:flex md:min-w-0 md:flex-1 md:items-center md:gap-4">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Schließen">
        <X className="h-4 w-4" />
      </button>
      <div className="h-6 w-px bg-bw-border" aria-hidden />
      <div className="title-block min-w-0 flex-1">
        <div className="ttl">Angebot erstellen</div>
        <div className="sub">
          Für Anfrage {lead.id.slice(0, 8).toUpperCase()} · {name}
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
      </nav>
      <div className="flex-1" />
      {step > 1 ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Zurück
        </Button>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-1.5"
        loading={saving}
        onClick={() => void handleEntwurfSpeichern()}
      >
        <Save className="h-4 w-4" aria-hidden />
        Speichern
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="gap-1.5"
        loading={saving}
        onClick={() => void handleWeiter()}
      >
        {step >= WIZARD_TOTAL_STEPS ? (
          <>
            <Send className="h-4 w-4" />
            Angebot erstellen
          </>
        ) : (
          <>
            Weiter
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </Button>
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
              <Card title="Anfrage-Daten">
                <div className="form-grid-2 grid gap-3 md:grid-cols-2">
                  <Detail label="Kunde" value={name} />
                  <Detail label="Projekt" value={projekt} />
                  <Detail
                    label="Region"
                    value={[leadState.plz, leadState.kunden?.ort].filter(Boolean).join(' · ') || '—'}
                  />
                  <Detail
                    label="Budget-Rahmen"
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
                  hinweis19Erlaubt={hinweis19Erlaubt}
                  hinweis13bErlaubt={hinweis13bErlaubt}
                  kleinunternehmer={kleinunternehmer}
                  lohnNettoPdf={lohnNettoPdf}
                />

                <Card className="border-dashed">
                  <p className="text-sm text-bw-text-muted">
                    Handwerker-Zuweisung ist optional und erfolgt nach dem Speichern im Angebot — auch
                    für freie Positionen ohne Gewerk. Bei Bedarf Partner dort anfragen, bevor Sie an den
                    Kunden senden.
                  </p>
                </Card>
              </div>
            </>
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
        {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : n}
      </span>
      <span>{label}</span>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-bw-text-muted">{label}</span>
      <p className="text-[13px] font-medium text-bw-text">{value}</p>
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
