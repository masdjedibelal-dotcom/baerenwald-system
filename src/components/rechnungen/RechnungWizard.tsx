'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  AngebotKiAssistentButton,
  type AngebotKiApplyPayload,
} from '@/components/angebote/AngebotKiAssistent'
import { WizardShell } from '@/components/layout/WizardShell'
import { MockField } from '@/components/mock-ui/MockForm'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockZahlfristSeg } from '@/components/mock-ui/MockZahlfristSeg'
import { PosBoard } from '@/components/posboard/PosBoard'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { RechnungWizardMailPreview } from '@/components/rechnungen/RechnungWizardMailPreview'
import { VorgangArtWiederkehrField } from '@/components/vorgang/VorgangArtWiederkehrField'
import { toast } from '@/components/ui/app-toast'
import {
  createAllAbschlagRechnungenFromWizard,
  finalizeRechnungWizardWithoutMail,
  saveRechnungWizardDraft,
  sendRechnungWizard,
  syncRechnungWizardMetaToEntwurf,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import { saveAuftragZahlungsplan } from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
import { angebotPositionenToWizardZeilen } from '@/lib/angebote/wizard-positionen-laden'
import {
  dokumentZeilenToAngebotPositionen,
  formatEurBetrag,
  neueArtikelZeile,
  type DokumentArtikelZeile,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import type {
  AngebotKiKontextPosition,
  AngebotKiKontextPreisliste,
} from '@/lib/angebote/angebot-ki-types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import {
  berechneRechnung,
  parseKleinunternehmerSetting,
} from '@/lib/rechnung-berechnung'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import { isValidEmail } from '@/lib/email-recipients'
import { KUNDE_MAIL_BCC_HINT } from '@/lib/mail-constants'
import { defaultRechnungMailEinleitung } from '@/lib/mail/rechnung-mail'
import { istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { defaultFirmenEinstellungen, type FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  dokumentZeilenToPosBoardLines,
  posBoardLinesToDokumentZeilen,
  type PosBoardLine,
} from '@/lib/posboard/pos-board-line'
import type {
  AbschlagRechnungEntwurf,
  RechnungWizardBootstrap,
  RechnungWizardMeta,
} from '@/lib/rechnungen/rechnung-wizard-types'
import {
  berechneZahlungsplan,
  emptyZahlungsplan,
  neueZahlungsplanZeile,
  zahlungsplanVorlage30_40_30,
  zahlungsplanVorlage30_70,
  zahlungsplanVorlage50_50,
  type Zahlungsplan,
  type ZahlungsplanAbschlagTyp,
  type ZahlungsplanZeile,
} from '@/lib/rechnungen/zahlungsplan'
import type { Gewerk, Preisliste } from '@/lib/types'
import {
  normalizeVorgangWiederkehr,
  type VorgangWiederkehr,
} from '@/lib/vorgang/wiederkehrend'
import {
  faelligAmFromZahlfrist,
  formatDateDeYmd,
  type ZahlfristSeg,
  zahlfristSegFromFaelligAm,
} from '@/lib/zahlfrist'
import { RechnungWizardPdfPreview } from '@/components/rechnungen/RechnungWizardPdfPreview'

type Rechnungsart = 'abschlag' | 'schluss'
type AnlagenKey = 'rechnung' | 'leistungsnachweis' | 'bautagebuch' | 'abnahme' | 'fotos'

const ANLAGEN_DEF: Array<{
  key: AnlagenKey
  label: string
  sub: string
  locked?: boolean
}> = [
  { key: 'rechnung', label: 'Rechnung (PDF)', sub: 'Pflichtdokument', locked: true },
  {
    key: 'leistungsnachweis',
    label: 'Leistungsnachweis',
    sub: 'Positionen & Mengen aus dem Auftrag',
  },
  {
    key: 'bautagebuch',
    label: 'Bautagebuch-Export',
    sub: 'Einträge & Fotos der Baustelle',
  },
  { key: 'abnahme', label: 'Abnahmeprotokoll', sub: 'Unterschriebene Abnahme' },
  { key: 'fotos', label: 'Fotodokumentation', sub: 'Vorher/Nachher-Bilder' },
]

const WIZARD_STEPS = [
  { id: 1, label: 'Positionen' },
  { id: 2, label: 'Individualisieren' },
  { id: 3, label: 'Paket' },
  { id: 4, label: 'Versand' },
]

const PLAN_PRESETS: { name: string; build: () => Zahlungsplan }[] = [
  { name: '30 / 40 / 30', build: zahlungsplanVorlage30_40_30 },
  { name: '50 / 50', build: zahlungsplanVorlage50_50 },
  { name: 'Anzahlung 30% + Rest', build: zahlungsplanVorlage30_70 },
]

function formatDateDe(ymd: string): string {
  return formatDateDeYmd(ymd)
}

function planProzentSumme(plan: Zahlungsplan): number {
  return plan.zeilen
    .filter((z) => z.typ === 'prozent')
    .reduce((s, z) => s + (Number(z.wert) || 0), 0)
}

function planIstOk(plan: Zahlungsplan): boolean {
  if (!plan.zeilen.length) return true
  const hasRest = plan.zeilen.some((z) => z.typ === 'rest')
  const hasBetrag = plan.zeilen.some((z) => z.typ === 'betrag')
  if (hasRest || hasBetrag) return plan.zeilen.length >= 1
  return Math.round(planProzentSumme(plan)) === 100
}

/**
 * Rechnungs-Wizard:
 * Positionen → Individualisieren → Paket → Versand
 */
export function RechnungWizard({
  bootstrap,
  gewerke,
  preislisten,
  firm: firmProp,
  onClose,
  onDone,
}: {
  bootstrap: RechnungWizardBootstrap
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm?: FirmenEinstellungen
  zahlungszielTage?: number
  initialKundeId?: string
  onClose: () => void
  onDone?: (rechnungId: string) => void
}) {
  const router = useRouter()
  const firm = firmProp ?? defaultFirmenEinstellungen()
  const kundeName =
    bootstrap.kunde?.name?.trim() ||
    [bootstrap.kunde?.vorname, bootstrap.kunde?.nachname].filter(Boolean).join(' ') ||
    'Kunde'
  const kundeEmail = (bootstrap.kunde?.email || '').trim()
  const hatAuftrag = Boolean(bootstrap.auftragId?.trim())
  const istDirektrechnung = !hatAuftrag || Boolean(bootstrap.standalone)
  const auftragLabel =
    bootstrap.auftragsReferenz?.trim() ||
    bootstrap.projektTitel?.trim() ||
    bootstrap.auftragId?.slice(0, 8)?.toUpperCase() ||
    (istDirektrechnung ? 'Direktrechnung' : '—')

  const initialZeilen = useMemo(
    () =>
      angebotPositionenToWizardZeilen(
        normalizeAngebotPositionen(bootstrap.positionen),
        preislisten,
        gewerke
      ),
    [bootstrap.positionen, preislisten, gewerke]
  )

  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [zeilen, setZeilen] = useState<DokumentZeile[]>(initialZeilen)
  const [meta, setMeta] = useState<RechnungWizardMeta>(() => bootstrap.meta)
  const [wiederkehr, setWiederkehr] = useState<VorgangWiederkehr>(() =>
    normalizeVorgangWiederkehr({
      ist_wiederkehrend: bootstrap.ist_wiederkehrend,
      wiederkehr_turnus: bootstrap.wiederkehr_turnus,
    })
  )
  const [rechnungsart, setRechnungsart] = useState<Rechnungsart>(() => {
    if (!bootstrap.auftragId?.trim()) return 'schluss'
    if (bootstrap.abschlag?.istSchluss) return 'schluss'
    if (
      bootstrap.modus === 'abschlag' ||
      bootstrap.abschlag?.rechnungArt === 'abschlag' ||
      bootstrap.meta.abschlag_zeile_id
    ) {
      return 'abschlag'
    }
    return 'schluss'
  })
  const [plan, setPlan] = useState<Zahlungsplan>(() => {
    if (!bootstrap.auftragId?.trim()) return emptyZahlungsplan()
    return bootstrap.zahlungsplan?.zeilen?.length
      ? bootstrap.zahlungsplan
      : emptyZahlungsplan()
  })
  const [aktivRate, setAktivRate] = useState<string | null>(
    () => bootstrap.abschlag?.zeileId ?? bootstrap.meta.abschlag_zeile_id ?? null
  )
  /** Rate vom Auftrag-Tab vorgewählt — im Wizard nicht erneut abfragen. */
  const rateLocked = Boolean(
    (bootstrap.abschlag?.zeileId || bootstrap.meta.abschlag_zeile_id) &&
      bootstrap.zahlungsplan?.zeilen?.length &&
      bootstrap.zahlungsplanBearbeiten !== true
  )
  const [anlagen, setAnlagen] = useState<Record<AnlagenKey, boolean>>(() => {
    const istSchlussInit = Boolean(
      bootstrap.abschlag?.istSchluss ||
        (bootstrap.abschlag?.rechnungArt === 'schluss')
    )
    return {
      rechnung: true,
      leistungsnachweis: false,
      bautagebuch: false,
      abnahme: istSchlussInit,
      fotos: false,
    }
  })
  const [einleitung, setEinleitung] = useState(() => {
    const existing = bootstrap.meta.einleitung?.trim()
    if (existing) return existing
    if (istDirektrechnung) {
      return `Sehr geehrte Damen und Herren,\n\nfür die erbrachten Leistungen erlauben wir uns, folgende Rechnung zu stellen:`
    }
    return `Sehr geehrte Damen und Herren,\n\nfür die erbrachten Leistungen zum Auftrag „${bootstrap.projektTitel || auftragLabel}" erlauben wir uns, folgende Rechnung zu stellen:`
  })
  const [mailBetreff, setMailBetreff] = useState(
    () => bootstrap.meta.mail_betreff?.trim() || ''
  )
  const [mailTo, setMailTo] = useState<string[]>(() =>
    kundeEmail && isValidEmail(kundeEmail) ? [kundeEmail] : []
  )
  const [mailCc, setMailCc] = useState<string[]>([])
  const [docPreviewTab, setDocPreviewTab] = useState<AnlagenKey>('rechnung')
  const [docAccordionOpen, setDocAccordionOpen] = useState(true)

  const zahlfristInit = zahlfristSegFromFaelligAm(bootstrap.meta.faellig_am)
  const [zahlfrist, setZahlfrist] = useState<ZahlfristSeg>(() => zahlfristInit.seg)
  const [zahlfristDatum, setZahlfristDatum] = useState(() => zahlfristInit.datum)
  const [rechnungId, setRechnungId] = useState<string | null>(bootstrap.rechnungId)
  const [abschlagRechnungen, setAbschlagRechnungen] = useState<AbschlagRechnungEntwurf[]>([])
  const [versandRechnungId, setVersandRechnungId] = useState<string | null>(bootstrap.rechnungId)
  const [rechnungsnummer, setRechnungsnummer] = useState(
    bootstrap.rechnungsnummer?.trim() || ''
  )
  const [saving, setSaving] = useState(false)
  const [draftDirty, setDraftDirty] = useState(() => !bootstrap.rechnungId)
  const [hintsOpen, setHintsOpen] = useState(true)
  const savedSnapshotRef = useRef<string | null>(null)

  const kundeId = bootstrap.kundeId
  const hasPlan = plan.zeilen.length > 0
  const planOk = planIstOk(plan)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setHintsOpen(!mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!hasPlan) {
      if (!rateLocked) setAktivRate(null)
      return
    }
    if (aktivRate && plan.zeilen.some((z) => z.id === aktivRate)) return
    if (rateLocked) return
    if (rechnungsart === 'schluss') {
      setAktivRate(plan.zeilen[plan.zeilen.length - 1]?.id ?? null)
    } else {
      setAktivRate(plan.zeilen[0]?.id ?? null)
    }
  }, [hasPlan, plan.zeilen, aktivRate, rechnungsart, rateLocked])

  const positionenBerechnet = useMemo(
    () => dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke),
    [zeilen, firm, gewerke]
  )
  const kleinunternehmer = parseKleinunternehmerSetting(firm.kleinunternehmer)
  const defaultMwst = Math.max(0, parseInt(firm.mwst_satz, 10) || DEFAULT_MWST_SATZ)
  const berechnung = useMemo(
    () =>
      berechneRechnung(positionenBerechnet, {
        kleinunternehmer,
        reverseCharge13b: meta.reverse_charge_13b,
        defaultMwstSatz: defaultMwst,
      }),
    [positionenBerechnet, kleinunternehmer, meta.reverse_charge_13b, defaultMwst]
  )

  const netto = berechnung.netto
  const brutto = berechnung.brutto
  const posBoardLines = useMemo(() => dokumentZeilenToPosBoardLines(zeilen), [zeilen])
  const gewerkNamen = useMemo(() => gewerke.map((g) => g.name).filter(Boolean), [gewerke])

  const kiKontextPositionen = useMemo((): AngebotKiKontextPosition[] => {
    return zeilen
      .filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      .map((z) => ({
        id: z.id,
        leistung: z.bezeichnung,
        beschreibung: z.positionBeschreibung ?? '',
        menge: z.menge,
        einheit: z.einheit,
        preis_netto: z.vkNetto,
        gewerk_slug: z.gewerk_slug ?? null,
        gewerk_name: z.gewerkName ?? null,
        preisliste_id: z.preisliste_id ?? null,
      }))
  }, [zeilen])

  const kiKontextPreislisten = useMemo((): AngebotKiKontextPreisliste[] => {
    return preislisten
      .filter((p) => p.aktiv !== false)
      .map((p) => {
        const g = gewerke.find((x) => x.id === p.gewerk_id) ?? p.gewerke
        return {
          id: p.id,
          leistung: p.leistung,
          einheit: p.einheit,
          preis_min: p.preis_min,
          gewerk_slug: g?.slug ?? null,
          gewerk_name: g?.name ?? null,
          kategorie: p.kategorie ?? null,
        }
      })
  }, [preislisten, gewerke])

  const kiGewerke = useMemo(
    () => gewerke.filter((g) => g.aktiv !== false).map((g) => ({ slug: g.slug, name: g.name })),
    [gewerke]
  )

  const kiLeadKurz = useMemo(() => {
    return [kundeName, auftragLabel, bootstrap.projektTitel]
      .map((s) => String(s ?? '').trim())
      .filter(Boolean)
      .join(' · ')
  }, [kundeName, auftragLabel, bootstrap.projektTitel])

  function applyRechnungKi(payload: AngebotKiApplyPayload) {
    if (payload.beschreibung != null) {
      setEinleitung(payload.beschreibung)
    } else if (payload.titel != null && payload.titel.trim()) {
      const t = payload.titel.trim()
      setEinleitung((prev) => (prev.trim() ? prev : t))
    }
    if (!payload.positionen.length) return

    setZeilen((prev) => {
      let next = [...prev]
      for (const p of payload.positionen) {
        const gewerk =
          (p.gewerk_slug
            ? gewerke.find((g) => g.slug === p.gewerk_slug)
            : undefined) ??
          (p.gewerk_name
            ? gewerke.find((g) => g.name.toLowerCase() === p.gewerk_name!.toLowerCase())
            : undefined)
        const gewerkPatch = gewerk
          ? {
              gewerk_id: gewerk.id,
              gewerk_slug: gewerk.slug,
              gewerkName: gewerk.name,
            }
          : {}

        if (p.match.kind === 'vorhanden_wizard' && p.match.ref_id) {
          next = next.map((z) => {
            if (z.id !== p.match.ref_id || z.typ !== 'artikel') return z
            return {
              ...z,
              bezeichnung: p.leistung || z.bezeichnung,
              positionBeschreibung: p.beschreibung || z.positionBeschreibung,
              menge: p.menge,
              einheit: p.einheit || z.einheit,
              vkNetto: p.preis_netto,
              ...gewerkPatch,
            }
          })
          continue
        }

        next.push(
          neueArtikelZeile({
            bezeichnung: p.leistung,
            positionBeschreibung: p.beschreibung || undefined,
            menge: p.menge,
            einheit: p.einheit || 'Stk.',
            vkNetto: p.preis_netto,
            preisliste_id: p.match.kind === 'preisliste' ? p.match.ref_id || null : null,
            position_quelle: p.match.kind === 'preisliste' ? 'katalog' : 'frei',
            ...gewerkPatch,
          })
        )
      }
      return next
    })
  }

  const planKontext = useMemo(
    () => berechneZahlungsplan(plan, netto, defaultMwst),
    [plan, netto, defaultMwst]
  )

  const einzelFaellig = faelligAmFromZahlfrist(zahlfrist, zahlfristDatum)
  const selRate = plan.zeilen.find((z) => z.id === aktivRate) ?? null
  const selBerechnet = planKontext.zeilen.find((z) => z.id === aktivRate) ?? null
  const rTitel =
    hasPlan && selRate
      ? `${bootstrap.projektTitel || auftragLabel} — ${selRate.titel}`
      : istDirektrechnung
        ? bootstrap.projektTitel?.trim() || `Rechnung · ${kundeName}`
        : `${bootstrap.projektTitel || auftragLabel} — ${
            rechnungsart === 'abschlag' ? 'Abschlag' : 'Schlussrechnung'
          }`
  const rBrutto = hasPlan && selBerechnet ? selBerechnet.brutto : brutto
  const rFaellig =
    hasPlan && selRate?.faellig_am?.trim()
      ? selRate.faellig_am.trim().slice(0, 10)
      : einzelFaellig
  /** Abschluss-Paket (Abnahme o. ä.) nur bei Schluss-/Endrechnung — nicht bei laufenden Abschlägen. */
  const istEndrechnung = Boolean(
    selBerechnet?.istSchluss ||
      bootstrap.abschlag?.istSchluss ||
      bootstrap.abschlag?.rechnungArt === 'schluss' ||
      (!hasPlan && rechnungsart === 'schluss' && bootstrap.modus !== 'voll')
  )
  const showAbschlussPaket = istEndrechnung
  const wizardSteps = showAbschlussPaket
    ? WIZARD_STEPS
    : [
        { id: 1, label: 'Positionen' },
        { id: 2, label: 'Individualisieren' },
        { id: 3, label: 'Versand' },
      ]
  /** Anzeige-Schritt für Stepper (bei Abschlag ohne Paket: 1→2→3 statt 1→2→4). */
  const shellStep = showAbschlussPaket ? step : step >= 4 ? 3 : step
  const anlagenCount = ANLAGEN_DEF.filter((a) => anlagen[a.key]).length
  const selectedAnlagen = ANLAGEN_DEF.filter((a) => anlagen[a.key])
  const previewNr = rechnungsnummer.trim() || 'Rechnung'
  const activeVersandId = versandRechnungId ?? rechnungId
  const defaultBetreff = `${previewNr} · ${rTitel}`

  useEffect(() => {
    if (showAbschlussPaket) return
    setAnlagen((a) => ({
      ...a,
      abnahme: false,
      bautagebuch: false,
      fotos: false,
    }))
  }, [showAbschlussPaket])

  function goPrevStep() {
    setStep((s) => {
      if (s === 4 && !showAbschlussPaket) return 2
      return Math.max(1, s - 1)
    })
  }

  async function goNextStep() {
    if (step === 1) {
      const artikel = zeilen.filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      if (!artikel.length) {
        toast.error('Mindestens eine Position erforderlich.')
        return
      }
    }
    if (step === 2 && hasPlan && !planOk) {
      toast.error('Zahlplan bitte so anpassen, dass 100 % bzw. Rest abgedeckt sind.')
      return
    }
    const leavingToVersand =
      step === 3 || (step === 2 && !showAbschlussPaket)
    if (leavingToVersand) {
      const id = await persistDraft()
      if (!id) return
      if (!mailBetreff.trim()) setMailBetreff(defaultBetreff)
      if (!einleitung.trim()) {
        setEinleitung(
          defaultRechnungMailEinleitung(
            istPrivatKundeTyp(bootstrap.kunde?.typ) ? 'du' : 'sie'
          )
        )
      }
      const firstDoc = selectedAnlagen[0]?.key ?? 'rechnung'
      setDocPreviewTab(firstDoc)
    }
    setStep((s) => {
      if (s === 2 && !showAbschlussPaket) return 4
      return Math.min(4, s + 1)
    })
  }

  function applyZahlfrist(seg: ZahlfristSeg, datum = zahlfristDatum) {
    setZahlfrist(seg)
    const nextDatum = seg === 'datum' ? datum : faelligAmFromZahlfrist(seg, datum)
    if (seg === 'datum') setZahlfristDatum(nextDatum)
    else setZahlfristDatum(nextDatum)
    setMeta((m) => ({ ...m, faellig_am: faelligAmFromZahlfrist(seg, nextDatum) }))
  }

  const draftSnapshot = useMemo(
    () =>
      JSON.stringify({
        zeilen,
        meta,
        rechnungsart,
        plan,
        einleitung,
        mailBetreff,
        anlagen,
      }),
    [zeilen, meta, rechnungsart, plan, einleitung, mailBetreff, anlagen]
  )
  useEffect(() => {
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = draftSnapshot
      return
    }
    setDraftDirty(draftSnapshot !== savedSnapshotRef.current)
  }, [draftSnapshot])

  function onPosBoardChange(next: PosBoardLine[]) {
    setZeilen(posBoardLinesToDokumentZeilen(next, zeilen))
  }

  function patchPlanZeile(id: string, patch: Partial<ZahlungsplanZeile>) {
    setPlan((p) => ({
      ...p,
      modus: 'abschlagsplan',
      zeilen: p.zeilen.map((z) => (z.id === id ? { ...z, ...patch } : z)),
    }))
  }

  function addPlanZeile() {
    setPlan((p) => ({
      ...p,
      modus: 'abschlagsplan',
      zeilen: [
        ...p.zeilen,
        neueZahlungsplanZeile({
          titel: `${p.zeilen.length + 1}. Abschlag`,
          typ: 'prozent',
          wert: 0,
        }),
      ],
    }))
  }

  function removePlanZeile(id: string) {
    setPlan((p) => ({
      ...p,
      modus: 'abschlagsplan',
      zeilen: p.zeilen.filter((z) => z.id !== id),
    }))
    setAktivRate((cur) => (cur === id ? null : cur))
  }

  function enablePlan() {
    if (!hatAuftrag) {
      toast.error('Abschlagspläne sind nur mit Auftrag möglich.')
      return
    }
    setPlan(zahlungsplanVorlage30_40_30())
  }

  function clearPlan() {
    setPlan(emptyZahlungsplan())
    setAktivRate(null)
  }

  function toggleAnlage(k: AnlagenKey) {
    setAnlagen((a) => ({ ...a, [k]: !a[k] }))
  }

  function buildMetaForSave(): RechnungWizardMeta {
    const planAktiv = hatAuftrag && hasPlan
    return {
      ...meta,
      einleitung,
      mail_einleitung: einleitung,
      mail_betreff: mailBetreff.trim() || defaultBetreff,
      zahlungsart: planAktiv ? 'abschlaege' : 'standard',
      abschlag_zeile_id: planAktiv ? aktivRate : null,
      faellig_am: rFaellig,
    }
  }

  const persistEinzel = useCallback(
    async (): Promise<string | null> => {
      const artikel = zeilen.filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      if (!artikel.length) {
        toast.error('Mindestens eine Position erforderlich.')
        return null
      }
      if (artikel.some((z) => !z.bezeichnung.trim())) {
        toast.error('Bitte bei allen Positionen eine Bezeichnung eintragen.')
        return null
      }
      if (!kundeId?.trim()) {
        toast.error('Kein Kunde verknüpft.')
        return null
      }
      const nextMeta = buildMetaForSave()
      setSaving(true)
      try {
        const res = await saveRechnungWizardDraft({
          rechnungId,
          auftrag_id: bootstrap.auftragId,
          angebot_id: bootstrap.angebotId,
          kunde_id: kundeId,
          positionen: positionenBerechnet,
          meta: nextMeta,
          modus: hatAuftrag && rechnungsart === 'abschlag' ? 'abschlag' : 'voll',
          zahlungsplan: null,
          zahlungsplanSpeichern: false,
          ist_wiederkehrend: wiederkehr.ist_wiederkehrend,
          wiederkehr_turnus: wiederkehr.wiederkehr_turnus,
        })
        if (!res.ok) {
          toast.error(res.message)
          return null
        }
        setRechnungId(res.rechnungId)
        setVersandRechnungId(res.rechnungId)
        if (res.rechnungsnummer?.trim()) setRechnungsnummer(res.rechnungsnummer.trim())
        setMeta(nextMeta)
        savedSnapshotRef.current = draftSnapshot
        setDraftDirty(false)
        return res.rechnungId
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
        return null
      } finally {
        setSaving(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildMeta uses current closure
    [
      zeilen,
      kundeId,
      rechnungId,
      bootstrap.auftragId,
      bootstrap.angebotId,
      hatAuftrag,
      positionenBerechnet,
      draftSnapshot,
      meta,
      einleitung,
      mailBetreff,
      hasPlan,
      aktivRate,
      rFaellig,
      rechnungsart,
      defaultBetreff,
      wiederkehr,
    ]
  )

  const persistPlan = useCallback(async (): Promise<string | null> => {
    if (!bootstrap.auftragId?.trim()) {
      toast.error('Abschlagsrechnungen sind nur mit Auftrag möglich.')
      return null
    }
    if (!kundeId?.trim()) {
      toast.error('Kein Kunde verknüpft.')
      return null
    }
    if (!planOk) {
      toast.error('Zahlplan bitte so anpassen, dass 100 % bzw. Rest abgedeckt sind.')
      return null
    }
    const nextMeta = buildMetaForSave()
    setSaving(true)
    try {
      const planSave = await saveAuftragZahlungsplan(bootstrap.auftragId, plan)
      if (!planSave.ok) {
        toast.error(planSave.message)
        return null
      }
      const res = await createAllAbschlagRechnungenFromWizard({
        auftrag_id: bootstrap.auftragId,
        angebot_id: bootstrap.angebotId,
        kunde_id: kundeId,
        positionen: positionenBerechnet,
        meta: nextMeta,
        zahlungsplan: plan,
        versandZeileId: aktivRate,
        ist_wiederkehrend: wiederkehr.ist_wiederkehrend,
        wiederkehr_turnus: wiederkehr.wiederkehr_turnus,
      })
      if (!res.ok) {
        toast.error(res.message)
        return null
      }
      setAbschlagRechnungen(res.rechnungen)
      setVersandRechnungId(res.versandRechnungId)
      setRechnungId(res.versandRechnungId)
      const nr = res.rechnungen.find((r) => r.id === res.versandRechnungId)?.rechnungsnummer
      if (nr?.trim()) setRechnungsnummer(nr.trim())
      setMeta(nextMeta)
      savedSnapshotRef.current = draftSnapshot
      setDraftDirty(false)
      return res.versandRechnungId
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
      return null
    } finally {
      setSaving(false)
    }
  }, [
    bootstrap.auftragId,
    bootstrap.angebotId,
    kundeId,
    planOk,
    plan,
    positionenBerechnet,
    aktivRate,
    draftSnapshot,
    meta,
    einleitung,
    mailBetreff,
    hasPlan,
    rFaellig,
    defaultBetreff,
  ])

  async function persistDraft(): Promise<string | null> {
    if (hasPlan && !hatAuftrag) {
      toast.error('Abschlagsrechnungen sind nur mit Auftrag möglich. Bitte Zahlplan entfernen.')
      return null
    }
    return hasPlan ? persistPlan() : persistEinzel()
  }

  async function handleFinish(sendMail: boolean) {
    if (hasPlan && !planOk) {
      toast.error('Zahlplan bitte so anpassen, dass 100 % bzw. Rest abgedeckt sind.')
      return
    }
    const id = await persistDraft()
    if (!id) return

    const nextMeta = buildMetaForSave()
    const nrLabel = () =>
      abschlagRechnungen.find((r) => r.id === id)?.rechnungsnummer?.trim() ||
      (id === activeVersandId ? rechnungsnummer.trim() : '') ||
      previewNr

    setSaving(true)
    try {
      const sync = await syncRechnungWizardMetaToEntwurf(id, {
        kunde_id: kundeId,
        meta: nextMeta,
      })
      if (!sync.ok) {
        toast.error(sync.message)
        return
      }

      if (!sendMail) {
        const res = await finalizeRechnungWizardWithoutMail(id)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        toast.success(
          `Rechnung ${res.rechnungsnummer?.trim() || nrLabel()} erstellt · ${formatEurBetrag(rBrutto)} brutto`
        )
        onDone?.(id)
        onClose()
        router.refresh()
        return
      }

      const to = mailTo.filter((e) => isValidEmail(e))
      if (!to.length) {
        toast.error('Mindestens eine gültige Empfänger-E-Mail erforderlich.')
        return
      }
      const res = await sendRechnungWizard({
        rechnungId: id,
        mailTo: to,
        mailCc: mailCc.filter((e) => isValidEmail(e)),
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        `Rechnung ${nrLabel()} erstellt & versendet · ${formatEurBetrag(rBrutto)} brutto`
      )
      onDone?.(id)
      onClose()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erstellen fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  function handleRequestClose() {
    if (draftDirty && !saving) {
      const ok = window.confirm(
        'Es gibt ungespeicherte Änderungen. Wizard schließen und Änderungen verwerfen?'
      )
      if (!ok) return
    }
    onClose()
  }

  async function handleWeiter() {
    if (saving) return
    try {
      await goNextStep()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Weiter fehlgeschlagen.')
    }
  }

  if (!mounted) return null

  const desktopActions = (
    <div className="wizard-nav-actions">
      {step > 1 ? (
        <MockBtn kind="ghost" icon="chevron-left" onClick={goPrevStep} disabled={saving}>
          Zurück
        </MockBtn>
      ) : null}
      {step < 4 ? (
        <MockBtn
          kind="primary"
          icon="chevron-right"
          disabled={saving}
          onClick={() => void handleWeiter()}
        >
          {saving ? 'Speichern…' : 'Weiter'}
        </MockBtn>
      ) : (
        <>
          <MockBtn
            kind="ghost"
            disabled={saving || (hasPlan && !planOk)}
            onClick={() => void handleFinish(false)}
          >
            {saving ? 'Erstellen…' : 'Erstellen'}
          </MockBtn>
          <MockBtn
            kind="primary"
            icon="send"
            disabled={saving || (hasPlan && !planOk)}
            onClick={() => void handleFinish(true)}
          >
            Erstellen und versenden
          </MockBtn>
        </>
      )}
    </div>
  )

  const mobileActions = null

  const mobileFooter =
    step < 4 ? (
      <>
        {step > 1 ? (
          <MockBtn kind="ghost" icon="chevron-left" onClick={goPrevStep} disabled={saving}>
            Zurück
          </MockBtn>
        ) : (
          <span />
        )}
        <MockBtn
          kind="primary"
          icon="chevron-right"
          className="wizard-mobile-footer__primary"
          disabled={saving}
          onClick={() => void handleWeiter()}
        >
          {saving ? 'Speichern…' : 'Weiter'}
        </MockBtn>
      </>
    ) : (
      <>
        <MockBtn kind="ghost" icon="chevron-left" onClick={goPrevStep} disabled={saving}>
          Zurück
        </MockBtn>
        <div className="wizard-mobile-footer__end">
          <MockBtn
            kind="ghost"
            disabled={saving || (hasPlan && !planOk)}
            onClick={() => void handleFinish(false)}
          >
            Erstellen
          </MockBtn>
          <MockBtn
            kind="primary"
            icon="send"
            className="wizard-mobile-footer__primary"
            disabled={saving || (hasPlan && !planOk)}
            onClick={() => void handleFinish(true)}
          >
            Versenden
          </MockBtn>
        </div>
      </>
    )

  const steuernBlock = (
    <>
      <div
        className="section-h"
        style={{
          marginBottom: 10,
          marginTop: 18,
          textTransform: 'none',
          letterSpacing: 0,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text)',
        }}
      >
        Steuerliche Hinweise
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(
          [
            {
              on: meta.hinweis_35a,
              set: (v: boolean) => setMeta((m) => ({ ...m, hinweis_35a: v })),
              label: '§35a EStG-Hinweis ausweisen',
              sub: 'Lohnkostenanteil für haushaltsnahe Handwerkerleistungen',
            },
            {
              on: meta.reverse_charge_13b,
              set: (v: boolean) => setMeta((m) => ({ ...m, reverse_charge_13b: v })),
              label: 'Reverse-Charge (§13b UStG)',
              sub: 'Steuerschuldnerschaft des Leistungsempfängers',
            },
          ] as const
        ).map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => c.set(!c.on)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '10px 12px',
              border: `1px solid ${c.on ? 'var(--green)' : 'var(--border)'}`,
              background: c.on ? 'var(--green-50)' : 'var(--card)',
              borderRadius: 9,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                border: `1.5px solid ${c.on ? 'var(--green)' : 'var(--border-strong, var(--border))'}`,
                background: c.on ? 'var(--green)' : 'transparent',
                display: 'grid',
                placeItems: 'center',
                flex: '0 0 auto',
                color: '#fff',
              }}
            >
              {c.on ? <MockIcon ctx="btn" n="check" size={12} /> : null}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{c.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  )

  const wizard = (
    <WizardShell
      className="wizard-flow"
      title="Rechnung erstellen"
      steps={wizardSteps}
      currentStep={shellStep}
      onClose={handleRequestClose}
      mobileActions={mobileActions}
      mobileFooter={mobileFooter}
      desktopActions={desktopActions}
      saveHint={saving ? 'Speichert…' : null}
    >
      {step === 1 ? (
        <>
          {rateLocked && selBerechnet ? (
            <div
              style={{
                marginBottom: 14,
                padding: '12px 14px',
                border: '0.5px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg-soft)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {selBerechnet.istSchluss ? 'Schlussrechnung' : 'Abschlagsrechnung'} ·{' '}
                {selBerechnet.titel}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.45 }}>
                Auf der Rechnung steht der Planbetrag als Pauschale (
                {formatEurBetrag(selBerechnet.brutto)} brutto). Die Positionen unten sind die
                Auftragsleistungen — als Leistungsnachweis-Anhang sinnvoll, auf der Abschlagsrechnung
                selbst nicht zeilenweise nötig.
              </div>
            </div>
          ) : hatAuftrag ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
                flexWrap: 'wrap',
              }}
            >
              <div className="section-h" style={{ marginBottom: 0, textTransform: 'none' }}>
                Rechnungsart
              </div>
              <div className="seg" role="group" aria-label="Rechnungsart">
                <button
                  type="button"
                  className={rechnungsart === 'abschlag' ? 'on' : undefined}
                  onClick={() => setRechnungsart('abschlag')}
                >
                  Abschlag
                </button>
                <button
                  type="button"
                  className={rechnungsart === 'schluss' ? 'on' : undefined}
                  onClick={() => setRechnungsart('schluss')}
                >
                  Schlussrechnung
                </button>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
                Auftrag {auftragLabel} · {kundeName}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
                flexWrap: 'wrap',
              }}
            >
              <div className="section-h" style={{ marginBottom: 0, textTransform: 'none' }}>
                Direktrechnung
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ color: 'var(--text-3)', fontSize: 12.5 }}>{kundeName}</span>
            </div>
          )}
          <VorgangArtWiederkehrField
            value={wiederkehr}
            onChange={setWiederkehr}
            hint="Bestand — Abrechnung zu wiederkehrendem Auftrag (Wartung, Winterdienst)"
          />
          <PosBoard
            positionen={posBoardLines}
            onChange={onPosBoardChange}
            showUst
            gewerke={gewerkNamen}
            preislisten={preislisten}
            headerAction={
              <AngebotKiAssistentButton
                sm
                label="Mit KI"
                dokumentLabel="Rechnung"
                leadKurz={kiLeadKurz}
                titel={bootstrap.projektTitel || rTitel}
                beschreibung={einleitung}
                positionen={kiKontextPositionen}
                preislisten={kiKontextPreislisten}
                gewerke={kiGewerke}
                onApply={applyRechnungKi}
              />
            }
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>
                Individualisieren
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
                Zahlungsziel, optionaler Zahlplan und steuerliche Hinweise
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              Gesamt{' '}
              <b style={{ color: 'var(--green)' }}>
                {formatEurBetrag(hasPlan && selBerechnet ? selBerechnet.brutto : brutto)}
              </b>{' '}
              brutto
            </div>
          </div>

          <MockField label="Zahlungsziel / Zahlfrist" hint="Frist nach Rechnungsstellung">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <MockZahlfristSeg
                value={zahlfrist}
                onChange={(v) => applyZahlfrist(v)}
                aria-label="Zahlungsziel / Zahlfrist"
              />
              {zahlfrist === 'datum' ? (
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

          <div style={{ marginTop: 18 }}>
            {!hatAuftrag ? (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Direktrechnung ohne Auftrag</div>
                <p
                  className="text-[12.5px] leading-relaxed"
                  style={{ color: 'var(--text-3)', margin: '6px 0 0' }}
                >
                  Abschlagspläne sind nur mit Auftrag möglich. Diese Rechnung wird als einfache
                  Vollrechnung erstellt.
                </p>
              </div>
            ) : !hasPlan ? (
              <div className="card" style={{ padding: 20 }}>
                <div className="zahlplan-empty">
                  <MockIcon ctx="empty" n="calculator" size={26} />
                  <div className="zahlplan-empty__title">Noch kein Abschlagsplan</div>
                  <div className="zahlplan-empty__text">
                    Optional: Teile die Auftragssumme von{' '}
                    <b>{formatEurBetrag(netto)}</b> netto in Abschläge auf — z. B. 30 % bei Beginn,
                    40 % nach Rohbau, 30 % zur Schlussrechnung.
                  </div>
                  <MockBtn kind="primary" icon="plus" onClick={enablePlan}>
                    Zahlplan hinzufügen
                  </MockBtn>
                </div>
              </div>
            ) : (
              <>
                {rateLocked && selBerechnet ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      border: '1px solid var(--green)',
                      background: 'var(--green-50)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <MockIcon ctx="btn" n="check" size={16} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {selBerechnet.titel}
                        {selBerechnet.istSchluss ? ' · Schlussrechnung' : ' · Abschlagsrechnung'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        Vorgewählt aus dem Zahlplan — Betrag{' '}
                        <b>{formatEurBetrag(selBerechnet.brutto)}</b> brutto (Pauschale laut Plan).
                        Die volle Leistungsaufstellung kannst du als Leistungsnachweis mitsenden.
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div
                        className="section-h"
                        style={{ marginBottom: 0, textTransform: 'none', flex: 1 }}
                      >
                        Zahlplan
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>
                        Vorlage:
                      </span>
                      {PLAN_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          className="zahlplan-preset-chip"
                          onClick={() => setPlan(p.build())}
                        >
                          {p.name}
                        </button>
                      ))}
                      <MockBtn sm kind="ghost" onClick={clearPlan}>
                        Entfernen
                      </MockBtn>
                    </div>

                    <div
                      style={{
                        border: '0.5px solid var(--border)',
                        borderRadius: 10,
                        overflow: 'hidden',
                        background: 'var(--card)',
                        boxShadow: 'var(--shadow)',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 110px 100px 120px 150px 34px',
                          gap: 10,
                          padding: '9px 14px',
                          background: 'var(--bg-soft)',
                          borderBottom: '0.5px solid var(--border)',
                          fontSize: 11.5,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: 'var(--text-2)',
                        }}
                      >
                        <div>Bezeichnung</div>
                        <div>Art</div>
                        <div style={{ textAlign: 'right' }}>Anteil</div>
                        <div style={{ textAlign: 'right' }}>Betrag brutto</div>
                        <div>Fällig</div>
                        <div />
                      </div>
                      {plan.zeilen.map((z) => {
                        const berech = planKontext.zeilen.find((x) => x.id === z.id)
                        return (
                          <div
                            key={z.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 110px 100px 120px 150px 34px',
                              gap: 10,
                              padding: '8px 14px',
                              borderBottom: '0.5px solid var(--border)',
                              alignItems: 'center',
                            }}
                          >
                            <input
                              className="input"
                              value={z.titel}
                              onChange={(e) => patchPlanZeile(z.id, { titel: e.target.value })}
                              style={{ height: 32 }}
                            />
                            <select
                              className="input"
                              value={z.typ}
                              onChange={(e) =>
                                patchPlanZeile(z.id, {
                                  typ: e.target.value as ZahlungsplanAbschlagTyp,
                                })
                              }
                              style={{ height: 32, fontSize: 12 }}
                            >
                              <option value="prozent">Prozent</option>
                              <option value="betrag">Euro netto</option>
                              <option value="rest">Rest</option>
                            </select>
                            <div style={{ position: 'relative' }}>
                              <input
                                className="input"
                                type="number"
                                disabled={z.typ === 'rest'}
                                value={z.typ === 'rest' ? '' : z.wert}
                                placeholder={z.typ === 'rest' ? 'auto' : undefined}
                                onChange={(e) =>
                                  patchPlanZeile(z.id, { wert: Number(e.target.value) || 0 })
                                }
                                style={{ textAlign: 'right', paddingRight: 28, height: 32 }}
                              />
                              <span
                                style={{
                                  position: 'absolute',
                                  right: 8,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  fontSize: 12,
                                  color: 'var(--text-3)',
                                }}
                              >
                                {z.typ === 'prozent' ? '%' : z.typ === 'betrag' ? '€' : ''}
                              </span>
                            </div>
                            <div
                              style={{
                                textAlign: 'right',
                                fontWeight: 600,
                                fontVariantNumeric: 'tabular-nums',
                                fontSize: 13,
                              }}
                            >
                              {formatEurBetrag(berech?.brutto ?? 0)}
                            </div>
                            <input
                              className="input"
                              type="date"
                              value={z.faellig_am?.slice(0, 10) ?? ''}
                              onChange={(e) =>
                                patchPlanZeile(z.id, { faellig_am: e.target.value || null })
                              }
                              style={{ height: 32, fontSize: 12 }}
                            />
                            <MockBtn
                              sm
                              kind="ghost"
                              icon="trash"
                              title="Entfernen"
                              onClick={() => removePlanZeile(z.id)}
                            />
                          </div>
                        )
                      })}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 14px',
                          gap: 10,
                        }}
                      >
                        <button
                          type="button"
                          className="pt-add"
                          style={{ border: 'none', padding: 0, width: 'auto' }}
                          onClick={addPlanZeile}
                        >
                          <MockIcon ctx="default" n="plus" size={13} /> Abschlag hinzufügen
                        </button>
                        <div style={{ flex: 1 }} />
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: planOk ? 'var(--green)' : 'var(--danger, #c0392b)',
                          }}
                        >
                          {plan.zeilen.every((z) => z.typ === 'prozent')
                            ? `Summe ${planProzentSumme(plan)}%${planOk ? '' : ' · muss 100% sein'}`
                            : planOk
                              ? 'Plan ok'
                              : 'Plan prüfen'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Immer sichtbar, sobald ein Abschlagsplan aktiv ist */}
                <div style={{ marginTop: 14 }}>
                  <div
                    className="section-h"
                    style={{
                      marginBottom: 8,
                      textTransform: 'none',
                      letterSpacing: 0,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Welche Abschlagsrechnung jetzt erstellen?
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {planKontext.zeilen.map((z) => {
                      const on = aktivRate === z.id
                      return (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() => {
                            setAktivRate(z.id)
                            setRechnungsart(z.istSchluss ? 'schluss' : 'abschlag')
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            border: `1px solid ${on ? 'var(--green)' : 'var(--border)'}`,
                            background: on ? 'var(--green-50)' : 'var(--card)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span
                            style={{
                              width: 17,
                              height: 17,
                              borderRadius: 20,
                              border: `1.5px solid ${on ? 'var(--green)' : 'var(--border-strong, var(--border))'}`,
                              background: on ? 'var(--green)' : 'transparent',
                              display: 'grid',
                              placeItems: 'center',
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {on ? <MockIcon ctx="btn" n="check" size={11} /> : null}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{z.titel}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                              {z.istSchluss ? 'Schlussrechnung' : 'Abschlagsrechnung'}
                              {' · '}
                              {z.typ === 'prozent'
                                ? `${z.wert}%`
                                : z.typ === 'betrag'
                                  ? formatEurBetrag(z.wert)
                                  : 'Rest'}
                              {z.faellig_am
                                ? ` · fällig ${formatDateDe(z.faellig_am.slice(0, 10))}`
                                : ''}
                            </div>
                          </div>
                          <b style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatEurBetrag(z.brutto)}
                          </b>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {steuernBlock ? (
            <details
              className="wizard-optional-block"
              open={hintsOpen}
              onToggle={(e) => setHintsOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="wizard-optional-block__sum">Weitere Hinweise (optional)</summary>
              <div className="wizard-optional-block__body">{steuernBlock}</div>
            </details>
          ) : null}
        </>
      ) : null}

      {step === 3 && showAbschlussPaket ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>Paket</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
              Schlussrechnung: optional Abnahme und weitere Unterlagen mitsenden. Abschläge laufen
              ohne dieses Paket — Abschlussbericht und Abnahme gehören zum Auftragsabschluss.
            </div>
          </div>
          <div
            className="section-h"
            style={{
              marginBottom: 10,
              textTransform: 'none',
              letterSpacing: 0,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Dokumentpaket{' '}
            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
              · {anlagenCount} Anlage{anlagenCount === 1 ? '' : 'n'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ANLAGEN_DEF.map((a) => {
              const on = !!anlagen[a.key]
              return (
                <button
                  key={a.key}
                  type="button"
                  disabled={a.locked}
                  onClick={() => !a.locked && toggleAnlage(a.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '10px 12px',
                    border: `1px solid ${on ? 'var(--green)' : 'var(--border)'}`,
                    background: on ? 'var(--green-50)' : 'var(--card)',
                    borderRadius: 9,
                    cursor: a.locked ? 'default' : 'pointer',
                    textAlign: 'left',
                    opacity: a.locked && !on ? 0.6 : 1,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: `1.5px solid ${on ? 'var(--green)' : 'var(--border-strong, var(--border))'}`,
                      background: on ? 'var(--green)' : 'transparent',
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                      color: '#fff',
                    }}
                  >
                    {on ? <MockIcon ctx="btn" n="check" size={12} /> : null}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {a.label}
                      {a.locked ? (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--text-3)',
                            fontWeight: 400,
                            marginLeft: 6,
                          }}
                        >
                          (immer dabei)
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{a.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : null}

      {step === 4 ? (
        <div style={{ display: 'grid', gap: 18, maxWidth: 760, margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>Versand</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
              E-Mail prüfen — Vorschau zeigt die echte Versand-Vorlage. Erstellen legt die Rechnung
              an (Portal), Erstellen und versenden schickt zusätzlich die Mail
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <MockField label="Rechnungstitel" full>
                <input className="input" value={rTitel} readOnly />
              </MockField>
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
                  className="input"
                  value={mailBetreff}
                  onChange={(e) => setMailBetreff(e.target.value)}
                  disabled={saving}
                  placeholder={defaultBetreff}
                />
              </MockField>
              <MockField label="Beschreibung / Einleitung" full>
                <textarea
                  className="input ta"
                  rows={4}
                  value={einleitung}
                  onChange={(e) => setEinleitung(e.target.value)}
                  disabled={saving}
                />
              </MockField>
            </div>
            <div className="wz-overview" style={{ marginTop: 14 }}>
              <div>
                <span className="k">Kunde</span>
                <b>{kundeName}</b>
              </div>
              <div>
                <span className="k">Fällig am</span>
                <b>{formatDateDe(rFaellig)}</b>
              </div>
              <div>
                <span className="k">Betrag</span>
                <b>{formatEurBetrag(rBrutto)} brutto</b>
              </div>
              <div>
                <span className="k">Art</span>
                <b>{rechnungsart === 'abschlag' ? 'Abschlag' : 'Schlussrechnung'}</b>
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
          <RechnungWizardMailPreview
            rechnungId={activeVersandId}
            kundeId={kundeId}
            betreff={mailBetreff.trim() || defaultBetreff}
            einleitung={einleitung}
            brutto={rBrutto}
            faelligAm={rFaellig}
            projektTitel={bootstrap.projektTitel || rTitel}
            rechnungsnummer={rechnungsnummer.trim() || previewNr}
            empfaengerHint={mailTo[0] || kundeEmail || kundeName}
          />

          <div>
            <button
              type="button"
              onClick={() => setDocAccordionOpen((o) => !o)}
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                marginBottom: 10,
              }}
            >
              <span
                className="section-h"
                style={{
                  marginBottom: 0,
                  textTransform: 'none',
                  letterSpacing: 0,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Dokument-Vorschauen
              </span>
              <MockIcon
                ctx="default"
                n={docAccordionOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
              />
            </button>

            {docAccordionOpen ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginBottom: 12,
                  }}
                >
                  {selectedAnlagen.map((a) => {
                    const on = docPreviewTab === a.key
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => setDocPreviewTab(a.key)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: `1px solid ${on ? 'var(--green)' : 'var(--border)'}`,
                          background: on ? 'var(--green-50)' : 'var(--card)',
                          fontSize: 12.5,
                          fontWeight: on ? 600 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {a.label}
                      </button>
                    )
                  })}
                </div>

                {docPreviewTab === 'rechnung' ? (
                  <RechnungWizardPdfPreview
                    rechnungId={activeVersandId}
                    loading={saving && !activeVersandId}
                    kundeName={kundeName}
                  />
                ) : (
                  <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <MockIcon ctx="default" n="file-text" size={22} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {ANLAGEN_DEF.find((a) => a.key === docPreviewTab)?.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: 'var(--text-3)',
                            marginTop: 4,
                            lineHeight: 1.45,
                          }}
                        >
                          {ANLAGEN_DEF.find((a) => a.key === docPreviewTab)?.sub}. Wird mit dem
                          Rechnungsversand als Anlage vorbereitet — Live-PDF-Vorschau folgt, sobald
                          das Dokument erzeugt ist.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </WizardShell>
  )

  return createPortal(wizard, document.body)
}
