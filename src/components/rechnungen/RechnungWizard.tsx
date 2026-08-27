'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Check, FileText } from 'lucide-react'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import {
  MetaCrowButton,
  TotBand,
} from '@/components/angebote/AngebotWizardCanvasMeta'
import { MockField } from '@/components/mock-ui/MockForm'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { PosBoard } from '@/components/posboard/PosBoard'
import { LeistungszeitraumFields } from '@/components/dokumente/LeistungszeitraumFields'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { DateInput } from '@/components/ui/DateInput'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { ACTION_ICON_STROKE } from '@/components/ui/ActionIcon'
import { KundeModal } from '@/components/kunden/KundeModal'
import { KundenObjektModal } from '@/components/kunden/KundenObjektModal'
import {
  MelderLeistungsortFields,
  type MelderLeistungsortDraft,
} from '@/components/crm/MelderLeistungsortFields'
import { RechnungWizardMailPreview } from '@/components/rechnungen/RechnungWizardMailPreview'
import {
  Ustg13bHilfeSheet,
  Ustg13bHilfeTrigger,
} from '@/components/rechnungen/Ustg13bHilfeSheet'
import { toast } from '@/components/ui/app-toast'
import { listKundenAnsprechpartner } from '@/app/actions/kunden-ansprechpartner'
import { fetchKundenObjekte } from '@/app/actions/kunden-objekte'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import { normalizeKundeNamen, splitDeutscherVollname } from '@/lib/kunde-namen'
import {
  istKundeFirmaPflichtTyp,
  istKundeGewerbeTyp,
  kundeStrasseHausnummerZeile,
} from '@/lib/kunde-stammdaten'
import { kundenObjektKurzlabel } from '@/lib/kunden-objekte'
import {
  createAllAbschlagRechnungenFromWizard,
  finalizeRechnungWizardWithoutMail,
  previewNaechsteRechnungsnummer,
  saveRechnungWizardDraft,
  sendRechnungWizard,
  syncRechnungWizardMetaToEntwurf,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import { saveAuftragZahlungsplan } from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
import {
  createAbschlussberichtPdf,
  loadAbschlussberichtWizardHint,
} from '@/app/(dashboard)/auftraege/abschlussdokumentation-actions'
import { angebotPositionenToWizardZeilen } from '@/lib/angebote/wizard-positionen-laden'
import {
  dokumentZeilenToAngebotPositionen,
  formatEurBetrag,
  neueArtikelZeile,
  type DokumentArtikelZeile,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import {
  berechneHinweis35aAnteil,
  berechneRechnung,
  parseKleinunternehmerSetting,
} from '@/lib/rechnung-berechnung'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import { isValidEmail } from '@/lib/email-recipients'
import {
  defaultRechnungKorrekturMailEinleitung,
  defaultRechnungMailEinleitung,
} from '@/lib/mail/rechnung-mail'
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
  berechneSchlussAbrechnung,
  berechneZahlungsplan,
  emptyZahlungsplan,
  neueZahlungsplanZeile,
  zahlplanAbgerechnetAusLinks,
  zahlungsplanVorlage30_40_30,
  zahlungsplanVorlage30_70,
  zahlungsplanVorlage50_50,
  type Zahlungsplan,
  type ZahlungsplanAbschlagTyp,
  type ZahlungsplanZeile,
} from '@/lib/rechnungen/zahlungsplan'
import type { Gewerk, Kunde, KundeAnsprechpartner, KundenObjekt, Preisliste } from '@/lib/types'
import {
  normalizeVorgangWiederkehr,
  WIEDERKEHR_TURNUS_LABELS,
  WIEDERKEHR_TURNUS_VALUES,
  type VorgangWiederkehr,
  type WiederkehrTurnus,
} from '@/lib/vorgang/wiederkehrend'
import { cn } from '@/lib/utils'
import {
  faelligAmFromZahlfrist,
  formatDateDeYmd,
  patchZahlungsbedingungenMitZahlfrist,
  type ZahlfristSeg,
  zahlfristSegFromFaelligAm,
} from '@/lib/zahlfrist'
import { MockZahlfristSeg } from '@/components/mock-ui/MockZahlfristSeg'
import { RechnungWizardPdfPreview } from '@/components/rechnungen/RechnungWizardPdfPreview'
import { AbschlagsplanEditorModal } from '@/components/auftraege/AbschlagsplanEditorModal'

type Rechnungsart = 'abschlag' | 'schluss'

const PLAN_PRESETS: { name: string; build: () => Zahlungsplan }[] = [
  { name: '30 / 40 / 30', build: zahlungsplanVorlage30_40_30 },
  { name: '50 / 50', build: zahlungsplanVorlage50_50 },
  { name: 'Anzahlung 30% + Rest', build: zahlungsplanVorlage30_70 },
]

/** Form ohne IDs/Titel — zum Erkennen der aktiven Vorlage. */
function planShapeKey(plan: Zahlungsplan): string {
  return plan.zeilen.map((z) => `${z.typ}:${Number(z.wert) || 0}`).join('|')
}

function matchingPlanPresetName(plan: Zahlungsplan): string | null {
  if (!plan.zeilen.length) return null
  const key = planShapeKey(plan)
  for (const p of PLAN_PRESETS) {
    if (planShapeKey(p.build()) === key) return p.name
  }
  return null
}

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
 * Positionen → Rechnungsdetails → Versand (nur Rechnung-PDF, kein Dokumentpaket)
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
  const [kunde, setKunde] = useState(bootstrap.kunde)
  const [kundeId, setKundeId] = useState(bootstrap.kundeId || '')
  const [ansprechpartnerId, setAnsprechpartnerId] = useState<string | null>(
    () => bootstrap.ansprechpartnerId?.trim() || null
  )
  const [kundeObjektId, setKundeObjektId] = useState<string | null>(
    () => bootstrap.kundeObjektId?.trim() || null
  )
  const [objektAnlageId, setObjektAnlageId] = useState<string | null>(
    () => bootstrap.objektAnlageId?.trim() || null
  )
  const [apRows, setApRows] = useState<KundeAnsprechpartner[]>([])
  const [hvObjekte, setHvObjekte] = useState<KundenObjekt[]>([])
  const [objektNeuOpen, setObjektNeuOpen] = useState(false)
  const [kundeEditOpen, setKundeEditOpen] = useState(false)
  const isHvOderGewerbe = istKundeGewerbeTyp(kunde?.typ)
  const leistungsortDraft: MelderLeistungsortDraft = {
    melder_name: '',
    melder_telefon: '',
    melder_email: '',
    melder_einheit: '',
    kunde_objekt_id: kundeObjektId,
    objekt_anlage_id: objektAnlageId,
  }
  const gewaehltesObjekt =
    (kundeObjektId ? hvObjekte.find((o) => o.id === kundeObjektId) : null) ?? null
  const leistungsortCrowHint = gewaehltesObjekt
    ? kundenObjektKurzlabel(gewaehltesObjekt)
    : null
  const kundeNamen = normalizeKundeNamen({
    typ: kunde?.typ,
    name: kunde?.name,
    vorname: kunde?.vorname,
    nachname: kunde?.nachname,
  })
  const kundeFirma = istKundeFirmaPflichtTyp(kunde?.typ)
    ? kunde?.name?.trim() || kundeNamen.name.trim() || ''
    : ''
  const kundeName =
    kundeFirma ||
    [kundeNamen.vorname, kundeNamen.nachname].filter(Boolean).join(' ') ||
    kunde?.name?.trim() ||
    'Kunde wählen'
  /** Gewählter AP, sonst Primär — steuert Anzeige & Mail-Vorbelegung. */
  const effektivAp =
    (ansprechpartnerId
      ? apRows.find((a) => a.id === ansprechpartnerId)
      : null) ??
    apRows.find((a) => a.ist_primaer) ??
    null
  const apNamen = effektivAp
    ? splitDeutscherVollname(String(effektivAp.name ?? '').trim())
    : null
  const displayVorname = apNamen?.vorname || kundeNamen.vorname
  const displayNachname = apNamen?.nachname || kundeNamen.nachname
  const kundeEmail =
    (effektivAp?.email?.trim() || kunde?.email || '').trim()
  const kundeTelefon =
    (effektivAp?.telefon?.trim() || kunde?.telefon || '').trim()
  const kundeAnschrift = kunde
    ? kundeStrasseHausnummerZeile(kunde) || kunde.adresse?.trim() || null
    : null
  const kundeStadt = [kunde?.plz?.trim(), kunde?.ort?.trim()].filter(Boolean).join(' ')
  const kundeTypLabel = kundentypLabel(kunde?.typ)
  const kundeCrowValue = (() => {
    const ap = effektivAp?.name?.trim()
    const ort = leistungsortCrowHint
    if (ap && ort) return `${kundeName} · ${ap} · ${ort}`
    if (ap) return `${kundeName} · ${ap}`
    if (ort) return `${kundeName} · ${ort}`
    return kundeName
  })()
  const hatAuftrag = Boolean(bootstrap.auftragId?.trim())
  const istDirektrechnung = !hatAuftrag || Boolean(bootstrap.standalone)
  /** Neu: Art der Leistung vor dem Wizard (nicht im Dokument-Sheet). */
  const needsArtGate = !bootstrap.rechnungId
  const [artGateOpen, setArtGateOpen] = useState(needsArtGate)
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
  const [rechnungTitel, setRechnungTitel] = useState(
    () => bootstrap.projektTitel?.trim() || ''
  )
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
  const [abschlussHint, setAbschlussHint] = useState<{
    showBlock: boolean
    hasBericht: boolean
    berichtUrl: string | null
  } | null>(null)
  const [abschlussMitVersand, setAbschlussMitVersand] = useState(false)
  const [abschlussBusy, setAbschlussBusy] = useState(false)
  const [sheet, setSheet] = useState<
    'kunde' | 'dokument' | 'zahlung' | 'versand' | 'vorschau' | 'abschluss' | null
  >(null)
  const [planEditorOpen, setPlanEditorOpen] = useState(false)

  const zahlfristInit = zahlfristSegFromFaelligAm(bootstrap.meta.faellig_am)
  const [zahlfrist, setZahlfrist] = useState<ZahlfristSeg>(() => zahlfristInit.seg)
  const [zahlfristDatum, setZahlfristDatum] = useState(() => zahlfristInit.datum)
  const [rechnungId, setRechnungId] = useState<string | null>(bootstrap.rechnungId)
  const [korrekturKontext, setKorrekturKontext] = useState(bootstrap.korrekturKontext ?? null)
  const [abschlagRechnungen, setAbschlagRechnungen] = useState<AbschlagRechnungEntwurf[]>([])
  const [versandRechnungId, setVersandRechnungId] = useState<string | null>(bootstrap.rechnungId)
  const [rechnungsnummer, setRechnungsnummer] = useState(
    bootstrap.rechnungsnummer?.trim() || ''
  )
  const [saving, setSaving] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewRechnungId, setPreviewRechnungId] = useState<string | null>(
    bootstrap.rechnungId
  )
  const [draftDirty, setDraftDirty] = useState(() => !bootstrap.rechnungId)
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  const [ustg13bHilfeOpen, setUstg13bHilfeOpen] = useState(false)
  const [hintsOpen, setHintsOpen] = useState(true)
  const savedSnapshotRef = useRef<string | null>(null)

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
    if (rechnungsnummer.trim()) return
    let cancelled = false
    void previewNaechsteRechnungsnummer().then((r) => {
      if (cancelled || !r.ok) return
      setRechnungsnummer((cur) => cur.trim() || r.nummer)
    })
    return () => {
      cancelled = true
    }
    // einmalig beim Öffnen ohne Nummer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyZahlfrist(seg: ZahlfristSeg, datum = zahlfristDatum) {
    setZahlfrist(seg)
    if (seg === 'datum') setZahlfristDatum(datum)
    setDraftDirty(true)
  }
  useEffect(() => {
    const aid = bootstrap.auftragId?.trim()
    if (!aid || istDirektrechnung) {
      setAbschlussHint(null)
      return
    }
    let cancelled = false
    void loadAbschlussberichtWizardHint(aid).then((h) => {
      if (cancelled) return
      setAbschlussHint({
        showBlock: h.showBlock,
        hasBericht: h.hasBericht,
        berichtUrl: h.berichtUrl,
      })
      if (h.hasBericht) setAbschlussMitVersand(true)
    })
    return () => {
      cancelled = true
    }
  }, [bootstrap.auftragId, istDirektrechnung])

  useEffect(() => {
    const kid = kundeId.trim()
    if (!kid) {
      setApRows([])
      return
    }
    let cancelled = false
    void listKundenAnsprechpartner(kid).then((rows) => {
      if (cancelled) return
      setApRows(rows)
    })
    return () => {
      cancelled = true
    }
  }, [kundeId])

  useEffect(() => {
    if (!isHvOderGewerbe || !kundeId.trim()) {
      setHvObjekte([])
      if (!isHvOderGewerbe && kundeObjektId) {
        setKundeObjektId(null)
        setDraftDirty(true)
      }
      return
    }
    let cancelled = false
    void fetchKundenObjekte(kundeId).then((rows) => {
      if (cancelled) return
      setHvObjekte(rows)
      if (kundeObjektId && !rows.some((o) => o.id === kundeObjektId)) {
        setKundeObjektId(null)
        setDraftDirty(true)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Objekt nur bei Kundenwechsel prüfen
  }, [kundeId, isHvOderGewerbe])

  /** Bootstrap: Mail an gewählten AP, sobald die Liste da ist. */
  useEffect(() => {
    const sid = bootstrap.ansprechpartnerId?.trim()
    if (!sid || !apRows.length) return
    const ap = apRows.find((a) => a.id === sid)
    const mail = ap?.email?.trim() || ''
    if (mail && isValidEmail(mail)) {
      setMailTo((prev) => (prev.length === 1 && prev[0] === (kunde?.email || '').trim() ? [mail] : prev.length ? prev : [mail]))
    }
    // nur einmal nach Laden der AP-Liste für den Bootstrap-Wert
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apRows])

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

  const vkNettoPlan = bootstrap.gesamtNetto ?? bootstrap.abschlag?.gesamtNetto ?? netto

  const planKontext = useMemo(
    () =>
      berechneZahlungsplan(
        plan,
        vkNettoPlan,
        defaultMwst,
        zahlplanAbgerechnetAusLinks(bootstrap.rechnungenAbschlag ?? [])
      ),
    [plan, vkNettoPlan, defaultMwst, bootstrap.rechnungenAbschlag]
  )

  const einzelFaellig = faelligAmFromZahlfrist(zahlfrist, zahlfristDatum)
  const selRate = plan.zeilen.find((z) => z.id === aktivRate) ?? null
  const selBerechnet = planKontext.zeilen.find((z) => z.id === aktivRate) ?? null
  const schlussAbrechnung = useMemo(() => {
    if (!selBerechnet?.istSchluss) return null
    return berechneSchlussAbrechnung(
      positionenBerechnet,
      bootstrap.rechnungenAbschlag ?? [],
      {
        reverseCharge13b: meta.reverse_charge_13b,
        kleinunternehmer,
        defaultMwstSatz: defaultMwst,
        ausserRechnungId: rechnungId,
        ausserZeileId: selBerechnet.id,
      }
    )
  }, [
    selBerechnet,
    positionenBerechnet,
    bootstrap.rechnungenAbschlag,
    meta.reverse_charge_13b,
    kleinunternehmer,
    defaultMwst,
    rechnungId,
  ])
  const rTitel =
    hasPlan && selRate
      ? `${rechnungTitel || auftragLabel} — ${selRate.titel}`
      : istDirektrechnung
        ? rechnungTitel.trim() || `Rechnung · ${kundeName}`
        : `${rechnungTitel || auftragLabel} — ${
            rechnungsart === 'abschlag' ? 'Abschlag' : 'Schlussrechnung'
          }`
  const rBrutto = hasPlan && selBerechnet ? selBerechnet.brutto : brutto
  const rFaellig =
    hasPlan && selRate?.faellig_am?.trim()
      ? selRate.faellig_am.trim().slice(0, 10)
      : einzelFaellig
  /** Rechnung versendet immer nur die Rechnung — kein Abschluss-/Dokumentpaket-Frage. */
  const previewNr = rechnungsnummer.trim() || 'Rechnung'
  const activeVersandId = versandRechnungId ?? rechnungId
  const vorschauRechnungId = previewRechnungId ?? activeVersandId
  const istKorrekturVersand = Boolean(korrekturKontext)
  const defaultBetreff = istKorrekturVersand
    ? `Korrektur · ${previewNr} · ${rTitel}`
    : `${previewNr} · ${rTitel}`
  const defaultMailEinleitung = istKorrekturVersand
    ? defaultRechnungKorrekturMailEinleitung('sie', {
        originalNr: korrekturKontext?.originalNr,
        neueNr: previewNr !== 'Rechnung' ? previewNr : null,
      })
    : defaultRechnungMailEinleitung('sie')

  function scrollToSection(sec: number) {
    requestAnimationFrame(() => {
      document
        .getElementById(`section-${sec}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function goToSection(sec: number) {
    setStep(sec)
    scrollToSection(sec)
  }

  function goPrevStep() {
    const next = step === 4 ? 2 : Math.max(1, step - 1)
    goToSection(next)
  }

  async function goNextStep() {
    if (step === 1) {
      const artikel = zeilen.filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      if (!artikel.length) {
        toast.error('Noch keine Position')
      }
    }
    if (step === 2 && hasPlan && !planOk) {
      toast.error('Plan anpassen (100 %)')
    }
    const next = step === 2 ? 4 : Math.min(4, step + 1)
    const enteringVersand = next === 4
    if (enteringVersand) {
      const id = await persistDraft()
      if (!id) {
        toast.error('Entwurf prüfen')
      }
      if (!mailBetreff.trim()) setMailBetreff(defaultBetreff)
      if (!einleitung.trim()) {
        setEinleitung(defaultMailEinleitung)
      }
    }
    goToSection(next)
  }

  function buildMetaForSave(): RechnungWizardMeta {
    const planAktiv = hatAuftrag && hasPlan
    const zb = patchZahlungsbedingungenMitZahlfrist(
      meta.zahlungsbedingungen,
      zahlfrist,
      zahlfrist === 'datum' ? zahlfristDatum : rFaellig
    )
    return {
      ...meta,
      einleitung,
      mail_einleitung: einleitung,
      mail_betreff: mailBetreff.trim() || defaultBetreff,
      zahlungsart: planAktiv ? 'abschlaege' : 'standard',
      abschlag_zeile_id: planAktiv ? aktivRate : null,
      faellig_am: rFaellig,
      zahlungsbedingungen: zb,
    }
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
        rechnungsnummer,
        zahlfrist,
        zahlfristDatum,
        ansprechpartnerId,
        kundeObjektId,
        objektAnlageId,
      }),
    [
      zeilen,
      meta,
      rechnungsart,
      plan,
      einleitung,
      mailBetreff,
      rechnungsnummer,
      zahlfrist,
      zahlfristDatum,
      ansprechpartnerId,
      kundeObjektId,
      objektAnlageId,
    ]
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
    setPlanEditorOpen(true)
  }

  function clearPlan() {
    setPlan(emptyZahlungsplan())
    setAktivRate(null)
  }

  function applyCustomPlan(next: Zahlungsplan) {
    setPlan(next)
    setAktivRate((cur) => {
      if (cur && next.zeilen.some((z) => z.id === cur)) return cur
      return next.zeilen[0]?.id ?? null
    })
    setPlanEditorOpen(false)
  }

  const persistEinzel = useCallback(
    async (opts?: {
      manageBusy?: boolean
      /** false = keine Validierungs-Toasts (stiller Close-Save) */
      silent?: boolean
      notify?: boolean
    }): Promise<string | null> => {
      const planAktiv = hatAuftrag && hasPlan && Boolean(aktivRate)
      const artikel = zeilen.filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      const silent = opts?.silent === true
      if (!artikel.length) {
        if (!silent) toast.error('Mindestens eine Position erforderlich.')
        return null
      }
      if (artikel.some((z) => !z.bezeichnung.trim())) {
        if (!silent) toast.error('Bitte bei allen Positionen eine Bezeichnung eintragen.')
        return null
      }
      if (!kundeId?.trim()) {
        if (!silent) toast.error('Kein Kunde verknüpft.')
        return null
      }
      const nextMeta = buildMetaForSave()
      const sel = planKontext.zeilen.find((z) => z.id === aktivRate) ?? null
      const manageBusy = opts?.manageBusy !== false
      if (manageBusy) setSaving(true)
      try {
        const res = await saveRechnungWizardDraft({
          rechnungId,
          auftrag_id: bootstrap.auftragId,
          angebot_id: bootstrap.angebotId,
          kunde_id: kundeId,
          ansprechpartner_id: ansprechpartnerId,
          kunde_objekt_id: kundeObjektId,
          objekt_anlage_id: objektAnlageId,
          positionen: positionenBerechnet,
          meta: nextMeta,
          modus: planAktiv || (hatAuftrag && rechnungsart === 'abschlag') ? 'abschlag' : 'voll',
          abschlag:
            planAktiv && sel
              ? {
                  zeileId: sel.id,
                  zeileIndex: sel.index,
                  rechnungArt: sel.istSchluss ? 'schluss' : 'abschlag',
                }
              : null,
          zahlungsplan: planAktiv ? plan : null,
          zahlungsplanSpeichern: planAktiv,
          ist_wiederkehrend: wiederkehr.ist_wiederkehrend,
          wiederkehr_turnus: wiederkehr.wiederkehr_turnus,
        })
        if (!res.ok) {
          if (!silent) toast.error(res.message)
          return null
        }
        const switched = Boolean(
          korrekturKontext && !korrekturKontext.istErsatzEntwurf && res.rechnungId !== rechnungId
        )
        setRechnungId(res.rechnungId)
        setVersandRechnungId(res.rechnungId)
        setPreviewRechnungId(res.rechnungId)
        if (res.rechnungsnummer?.trim()) setRechnungsnummer(res.rechnungsnummer.trim())
        if (switched) {
          setKorrekturKontext({
            originalStatus: korrekturKontext!.originalStatus,
            originalNr: korrekturKontext!.originalNr,
            materialFingerprint: '',
            istErsatzEntwurf: true,
          })
          toast.success('Storno angelegt — Korrektur gespeichert (noch nicht versendet)')
        } else if (opts?.notify) {
          toast.autoSaved({ label: 'Entwurf' })
        }
        setMeta(nextMeta)
        savedSnapshotRef.current = draftSnapshot
        setDraftDirty(false)
        return res.rechnungId
      } catch (e) {
        if (!silent) {
          toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
        }
        return null
      } finally {
        if (manageBusy) setSaving(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildMeta uses current closure
    [
      zeilen,
      kundeId,
      ansprechpartnerId,
      kundeObjektId,
      objektAnlageId,
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
      plan,
      planKontext.zeilen,
      rFaellig,
      rechnungsnummer,
      zahlfrist,
      zahlfristDatum,
      rechnungsart,
      defaultBetreff,
      wiederkehr,
      korrekturKontext,
    ]
  )

  const persistPlan = useCallback(async (opts?: {
    manageBusy?: boolean
    silent?: boolean
    notify?: boolean
  }): Promise<string | null> => {
    const silent = opts?.silent === true
    if (!bootstrap.auftragId?.trim()) {
      if (!silent) toast.error('Abschlagsrechnungen sind nur mit Auftrag möglich.')
      return null
    }
    if (!kundeId?.trim()) {
      if (!silent) toast.error('Kein Kunde verknüpft.')
      return null
    }
    if (!planOk) {
      if (!silent) {
        toast.error('Plan anpassen (100 %)')
      }
      return null
    }
    const nextMeta = buildMetaForSave()
    const manageBusy = opts?.manageBusy !== false
    if (manageBusy) setSaving(true)
    try {
      const planSave = await saveAuftragZahlungsplan(bootstrap.auftragId, plan)
      if (!planSave.ok) {
        if (!silent) toast.error(planSave.message)
        return null
      }
      const res = await createAllAbschlagRechnungenFromWizard({
        auftrag_id: bootstrap.auftragId,
        angebot_id: bootstrap.angebotId,
        kunde_id: kundeId,
        ansprechpartner_id: ansprechpartnerId,
        kunde_objekt_id: kundeObjektId,
        objekt_anlage_id: objektAnlageId,
        positionen: positionenBerechnet,
        meta: nextMeta,
        zahlungsplan: plan,
        versandZeileId: aktivRate,
        ist_wiederkehrend: wiederkehr.ist_wiederkehrend,
        wiederkehr_turnus: wiederkehr.wiederkehr_turnus,
      })
      if (!res.ok) {
        if (!silent) toast.error(res.message)
        return null
      }
      setAbschlagRechnungen(res.rechnungen)
      setVersandRechnungId(res.versandRechnungId)
      setRechnungId(res.versandRechnungId)
      setPreviewRechnungId(res.versandRechnungId)
      const nr = res.rechnungen.find((r) => r.id === res.versandRechnungId)?.rechnungsnummer
      if (nr?.trim()) setRechnungsnummer(nr.trim())
      setMeta(nextMeta)
      savedSnapshotRef.current = draftSnapshot
      setDraftDirty(false)
      if (opts?.notify) toast.autoSaved({ label: 'Entwurf' })
      return res.versandRechnungId
    } catch (e) {
      if (!silent) {
        toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
      }
      return null
    } finally {
      if (manageBusy) setSaving(false)
    }
  }, [
    bootstrap.auftragId,
    bootstrap.angebotId,
    kundeId,
    ansprechpartnerId,
    kundeObjektId,
    objektAnlageId,
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
    wiederkehr,
  ])

  async function persistDraft(opts?: {
    manageBusy?: boolean
    silent?: boolean
    notify?: boolean
  }): Promise<string | null> {
    if (hasPlan && !hatAuftrag) {
      if (!opts?.silent) {
        toast.error('Abschlag nur mit Auftrag')
      }
      return null
    }
    // Eine gewählte Rate (Schluss/Abschlag) → nur diese Rechnung speichern, nicht alle Raten
    if (hasPlan && aktivRate) {
      return persistEinzel(opts)
    }
    if (hasPlan) return persistPlan(opts)
    return persistEinzel(opts)
  }

  async function openVorschauSheet() {
    setPreviewLoading(true)
    setSheet('vorschau')
    try {
      const id = await persistDraft({ manageBusy: false, silent: false })
      if (!id) {
        setSheet(null)
        return
      }
      setPreviewRechnungId(id)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleFinish(sendMail: boolean) {
    if (hasPlan && !planOk) {
      toast.error('Plan anpassen (100 %)')
      return
    }
    if (sendMail) {
      const to = mailTo.filter((e) => isValidEmail(e))
      if (!to.length) {
        toast.error('Keine Kunden-E-Mail — bitte unter Versand ergänzen.')
        setSheet('versand')
        return
      }
    }
    setSaving(true)
    try {
      const id = await persistDraft({ manageBusy: false })
      if (!id) return

      const nextMeta = buildMetaForSave()
      const nrLabel = () =>
        abschlagRechnungen.find((r) => r.id === id)?.rechnungsnummer?.trim() ||
        (id === activeVersandId ? rechnungsnummer.trim() : '') ||
        previewNr

      const sync = await syncRechnungWizardMetaToEntwurf(id, {
        kunde_id: kundeId,
        ansprechpartner_id: ansprechpartnerId,
        kunde_objekt_id: kundeObjektId,
        objekt_anlage_id: objektAnlageId,
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
          `Entwurf gespeichert${res.rechnungsnummer?.trim() ? ` · ${res.rechnungsnummer.trim()}` : ''} · ${formatEurBetrag(rBrutto)} brutto`
        )
        setSheet(null)
        setKundeEditOpen(false)
        setPlanEditorOpen(false)
        onDone?.(id)
        onClose()
        router.refresh()
        return
      }

      const to = mailTo.filter((e) => isValidEmail(e))
      const res = await sendRechnungWizard({
        rechnungId: id,
        mailTo: to,
        mailCc: mailCc.filter((e) => isValidEmail(e)),
        mitAbschlussbericht: Boolean(
          abschlussMitVersand && abschlussHint?.showBlock && hatAuftrag
        ),
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        istKorrekturVersand
          ? `Korrektur ${nrLabel()} versendet · ${formatEurBetrag(rBrutto)} brutto`
          : `Rechnung ${nrLabel()} erstellt & versendet · ${formatEurBetrag(rBrutto)} brutto`
      )
      setSheet(null)
      setKundeEditOpen(false)
      setPlanEditorOpen(false)
      onDone?.(id)
      onClose()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erstellen fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  async function closeWizardClean() {
    setCloseConfirmOpen(false)
    setKundeEditOpen(false)
    setPlanEditorOpen(false)
    setSheet(null)
    onClose()
  }

  async function handleSaveDraftAndClose() {
    if (saving) return
    if (hasPlan && !planOk) {
      toast.error('Plan anpassen (100 %)')
      return
    }
    const id = await persistDraft({ manageBusy: true, notify: true })
    if (!id) return
    setCloseConfirmOpen(false)
    setKundeEditOpen(false)
    setPlanEditorOpen(false)
    setSheet(null)
    onDone?.(id)
    onClose()
    router.refresh()
  }

  function handleRequestClose() {
    if (saving || previewLoading) return
    if (!draftDirty) {
      void closeWizardClean()
      return
    }
    setCloseConfirmOpen(true)
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

  const displayBrutto = schlussAbrechnung
    ? schlussAbrechnung.rest_brutto
    : rBrutto
  const displayNetto = schlussAbrechnung
    ? schlussAbrechnung.rest_netto
    : hasPlan && selBerechnet
      ? selBerechnet.netto
      : netto
  const displayMwst = schlussAbrechnung
    ? schlussAbrechnung.rest_mwst
    : Math.max(0, displayBrutto - displayNetto)
  const anteil35a = berechneHinweis35aAnteil(
    positionenBerechnet,
    schlussAbrechnung ? schlussAbrechnung.rest_netto : berechnung.netto,
    {
      ...(schlussAbrechnung ? { vollNetto: schlussAbrechnung.netto } : {}),
      rechnungBrutto: schlussAbrechnung
        ? schlussAbrechnung.rest_brutto
        : berechnung.brutto,
    }
  )
  const ustLabel = meta.reverse_charge_13b
    ? 'MwSt 0% (§13b)'
    : berechnung.mwst_satz === 0
      ? 'MwSt 0%'
      : `MwSt ${berechnung.mwst_satz}%`

  const dokumentCrowValue = [
    rechnungsnummer.trim() || 'Nummer folgt',
    rechnungTitel.trim() || null,
    selBerechnet?.istSchluss || rechnungsart === 'schluss'
      ? 'Schlussrechnung'
      : hasPlan || rechnungsart === 'abschlag'
        ? 'Abschlag'
        : 'Rechnung',
  ]
    .filter(Boolean)
    .join(' · ')

  const zahlplanCrowValue = hasPlan
    ? [
        selRate?.titel || 'Abschlagsplan',
        rFaellig ? `fällig ${formatDateDe(rFaellig)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : [
        'Einzelrechnung',
        zahlfrist === 'datum' ? null : `${zahlfrist} Tage`,
        rFaellig ? `fällig ${formatDateDe(rFaellig)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')

  const versandCrowValue = mailTo[0]?.trim() || 'Kundenportal'

  const abschlussCrowValue = !abschlussHint?.showBlock
    ? null
    : [
        abschlussHint.hasBericht ? 'PDF vorhanden' : 'Noch nicht erstellt',
        abschlussMitVersand ? 'mit Versand' : null,
      ]
        .filter(Boolean)
        .join(' · ')

  const wizardTitel =
    selBerechnet?.istSchluss
      ? 'Schlussrechnung'
      : rateLocked && selBerechnet
        ? 'Abschlagsrechnung'
        : 'Rechnung'

  const wizardSubtitle = kundeName?.trim() || undefined

  function onKundeSaved(_id?: string, saved?: Partial<Kunde>) {
    setKundeEditOpen(false)
    if (!saved) return
    setKunde((prev) => ({ ...(prev ?? {}), ...saved, id: saved.id || prev?.id || kundeId } as typeof kunde))
    if (saved.id) setKundeId(saved.id)
    const kid = (saved.id || kundeId).trim()
    if (kid) {
      void listKundenAnsprechpartner(kid).then(setApRows)
    }
    const email = saved.email?.trim()
    if (email && isValidEmail(email) && !ansprechpartnerId) setMailTo([email])
    setDraftDirty(true)
  }

  const steuernBlock = (
    <div className="rw-tax">
      <div className="document-section__label" style={{ marginBottom: 10 }}>
        Steuerliche Hinweise
      </div>
      <div className="rw-tax__list">
        <button
          type="button"
          className={cn('rw-tax__opt', meta.hinweis_35a && 'on')}
          onClick={() => setMeta((m) => ({ ...m, hinweis_35a: !m.hinweis_35a }))}
        >
          <span className="rw-tax__check" aria-hidden>
            {meta.hinweis_35a ? <MockIcon ctx="btn" n="check" size={12} /> : null}
          </span>
          <span className="rw-tax__txt">
            <span className="rw-tax__lab">§35a EStG-Hinweis ausweisen</span>
            <span className="rw-tax__sub">
              {anteil35a.lohn_netto > 0
                ? anteil35a.hat_materialausweis
                  ? `Lohnkostenanteil ${formatEurBetrag(anteil35a.lohn_netto)} (Rechnungsnetto abzgl. Material ${formatEurBetrag(anteil35a.material_netto)}) — steuerlich begünstigt`
                  : `Lohnkostenanteil ${formatEurBetrag(anteil35a.lohn_netto)}${anteil35a.ist_brutto ? ' brutto' : ''} — steuerlich begünstigt`
                : 'Lohnkostenanteil für haushaltsnahe Handwerkerleistungen'}
            </span>
          </span>
        </button>
        <button
          type="button"
          className={cn('rw-tax__opt', meta.reverse_charge_13b && 'on')}
          onClick={() =>
            setMeta((m) => ({ ...m, reverse_charge_13b: !m.reverse_charge_13b }))
          }
        >
          <span className="rw-tax__check" aria-hidden>
            {meta.reverse_charge_13b ? (
              <MockIcon ctx="btn" n="check" size={12} />
            ) : null}
          </span>
          <span className="rw-tax__txt">
            <span className="rw-tax__lab" style={{ display: 'inline-flex', alignItems: 'center' }}>
              Reverse-Charge (§13b UStG)
              <Ustg13bHilfeTrigger onOpen={() => setUstg13bHilfeOpen(true)} />
            </span>
            <span className="rw-tax__sub">
              Steuerschuldnerschaft des Leistungsempfängers
            </span>
          </span>
        </button>
      </div>
    </div>
  )

  const documentColumn = (
    <div className="dc-doc flex flex-col gap-4">
      <PosBoard
        title={
          rechnungTitel.trim() ||
          (hasPlan && selRate?.titel?.trim()) ||
          (istDirektrechnung ? 'Rechnung' : auftragLabel) ||
          'Rechnung'
        }
        positionen={posBoardLines}
        onChange={onPosBoardChange}
        showUst
        showTotals={false}
        gewerke={gewerkNamen}
        preislisten={preislisten}
        badgeOf={(p) =>
          p.regieSchein
            ? { kind: 'warn', icon: 'paperclip', label: 'Regieschein' }
            : p.kind === 'freitext'
              ? { kind: 'neutral', icon: 'align-left', label: 'Freitext' }
              : p.kind === 'nachlass'
                ? { kind: 'warn', icon: 'percent', label: 'Nachlass' }
                : null
        }
      />

      <TotBand
        className="totband--green"
        netto={schlussAbrechnung?.netto ?? displayNetto}
        ust={schlussAbrechnung?.mwst_betrag ?? displayMwst}
        brutto={schlussAbrechnung?.brutto ?? displayBrutto}
        ustLabel={
          schlussAbrechnung
            ? `MwSt ${schlussAbrechnung.mwst_prozent}%`
            : ustLabel
        }
        bereitsGezahlt={
          schlussAbrechnung?.bereits_gezahlt_brutto
            ? schlussAbrechnung.bereits_gezahlt.map((z) => ({
                label: z.label,
                brutto: z.brutto,
              }))
            : null
        }
        restBrutto={schlussAbrechnung?.rest_brutto ?? null}
      />

    </div>
  )

  const metaColumn = (
    <div className="dc-meta-stack">
      <div className="document-section__label" style={{ marginBottom: 10 }}>
        Rechnungsdaten
      </div>
      <MetaCrowButton
        label="Kunde"
        value={kundeCrowValue}
        onClick={() => setSheet('kunde')}
      />
      <MetaCrowButton
        label="Dokument"
        value={dokumentCrowValue}
        onClick={() => setSheet('dokument')}
      />
      <MetaCrowButton
        label="Zahlung"
        value={zahlplanCrowValue}
        onClick={() => setSheet('zahlung')}
      />
      {abschlussHint?.showBlock ? (
        <MetaCrowButton
          label="Abschlussbericht"
          value={abschlussCrowValue || 'Anhang'}
          onClick={() => setSheet('abschluss')}
        />
      ) : null}
      <MetaCrowButton
        label="Versand"
        value={versandCrowValue}
        onClick={() => setSheet('versand')}
      />
    </div>
  )

  const headerEnd = (
    <>
      <button
        type="button"
        className="editor-sheet__icon-btn"
        disabled={saving || previewLoading}
        onClick={() => {
          void openVorschauSheet()
        }}
        aria-label="Vorschau"
        title="Vorschau"
      >
        <FileText className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
      </button>
      <ActionsMenu
        sheetTitle="Rechnung"
        align="right"
        trigger={
          <span
            className={cn('editor-sheet__confirm', saving && 'opacity-50')}
            aria-label="Als Entwurf speichern oder senden"
            title="Als Entwurf speichern oder senden"
          >
            <Check className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
          </span>
        }
        items={[
          {
            label: saving ? 'Speichern…' : 'Als Entwurf speichern',
            icon: <MockIcon ctx="btn" n="device-floppy" size={16} />,
            onClick: () => {
              if (saving || (hasPlan && !planOk)) return
              void handleFinish(false)
            },
          },
          {
            label: saving
              ? istKorrekturVersand
                ? 'Korrektur wird gesendet…'
                : 'Senden…'
              : istKorrekturVersand
                ? 'Korrektur versenden'
                : 'Senden',
            icon: <MockIcon ctx="btn" n="send" size={16} />,
            onClick: () => {
              if (saving) return
              void handleFinish(true)
            },
          },
        ]}
      />
    </>
  )

  const closeSheet = () => {
    setKundeEditOpen(false)
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
        draftDirty={draftDirty}
      />

      <EditorSheet
        open={sheet === 'kunde'}
        onClose={closeSheet}
        title="Kunde"
        context="canvas"
        headerEnd={
          kunde ? (
            <button
              type="button"
              className="editor-sheet__confirm-text"
              onClick={() => setKundeEditOpen(true)}
            >
              Bearbeiten
            </button>
          ) : null
        }
        onConfirm={closeSheet}
        confirmLabel="Übernehmen"
      >
        <div className="gfc">
          <div className="gfc-row">
            <span className="gfc-l">Kundentyp</span>
            <span className="gfc-v">{kundeTypLabel || '—'}</span>
          </div>
          {kundeFirma ? (
            <div className="gfc-row">
              <span className="gfc-l">Firma</span>
              <span className="gfc-v">{kundeFirma}</span>
            </div>
          ) : null}
          <MockField label="Ansprechpartner" full>
            <select
              className="sel sel--choice"
              value={ansprechpartnerId ?? ''}
              onChange={(e) => {
                const next = e.target.value.trim() || null
                setAnsprechpartnerId(next)
                const ap = next ? apRows.find((a) => a.id === next) : apRows.find((a) => a.ist_primaer)
                const mail = (ap?.email?.trim() || kunde?.email || '').trim()
                if (mail && isValidEmail(mail)) setMailTo([mail])
                else if (!mail) setMailTo([])
                setDraftDirty(true)
              }}
              disabled={!kundeId}
            >
              <option value="">Hauptansprechpartner</option>
              {apRows.map((ap) => (
                <option key={ap.id} value={ap.id}>
                  {ap.name.trim() || 'Ohne Name'}
                  {ap.ist_primaer ? ' (Primär)' : ''}
                  {ap.email?.trim() ? ` · ${ap.email.trim()}` : ''}
                </option>
              ))}
            </select>
          </MockField>
          <div className="gfc-row">
            <span className="gfc-l">{kundeFirma ? 'Vorname (Ansprechpartner)' : 'Vorname'}</span>
            <span className="gfc-v">{displayVorname || '—'}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">{kundeFirma ? 'Nachname (Ansprechpartner)' : 'Nachname'}</span>
            <span className="gfc-v">{displayNachname || '—'}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">Anschrift</span>
            <span className="gfc-v">{kundeAnschrift || '—'}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">Stadt</span>
            <span className="gfc-v">{kundeStadt || '—'}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">E-Mail</span>
            <span className="gfc-v">{kundeEmail || <em>fehlt</em>}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">Telefon</span>
            <span className="gfc-v">{kundeTelefon || <em>fehlt</em>}</span>
          </div>
        </div>
        {isHvOderGewerbe && kundeId ? (
          <div style={{ marginTop: 16 }}>
            <MelderLeistungsortFields
              draft={leistungsortDraft}
              hideMelder
              onChange={(patch) => {
                if (patch.kunde_objekt_id !== undefined) {
                  setKundeObjektId(patch.kunde_objekt_id)
                  if (patch.objekt_anlage_id === undefined) {
                    setObjektAnlageId(null)
                  }
                  setDraftDirty(true)
                }
                if (patch.objekt_anlage_id !== undefined) {
                  setObjektAnlageId(patch.objekt_anlage_id)
                  setDraftDirty(true)
                }
              }}
              objekte={hvObjekte}
              onNeuObjekt={() => setObjektNeuOpen(true)}
              kundeId={kundeId}
              gewerke={gewerke}
            />
          </div>
        ) : null}
      </EditorSheet>

      <KundeModal
        open={kundeEditOpen}
        onClose={() => setKundeEditOpen(false)}
        editKunde={(kunde as Kunde | null) ?? null}
        stayOnPage
        context="canvas"
        onSaved={onKundeSaved}
      />

      {kundeId && isHvOderGewerbe ? (
        <KundenObjektModal
          open={objektNeuOpen}
          onClose={() => setObjektNeuOpen(false)}
          kundeId={kundeId}
          verwaltungName={kundeName}
          onSaved={(objekt) => {
            setHvObjekte((prev) => {
              if (prev.some((o) => o.id === objekt.id)) return prev
              return [...prev, objekt]
            })
            setKundeObjektId(objekt.id)
            setObjektAnlageId(null)
            setDraftDirty(true)
            setObjektNeuOpen(false)
          }}
        />
      ) : null}

      <EditorSheet
        open={sheet === 'dokument'}
        onClose={closeSheet}
        title="Dokument"
        context="canvas"
        onConfirm={closeSheet}
        confirmLabel="Übernehmen"
      >
        <div className="form-grid form-grid--sheet">
          <SheetEditableField
            label="Rechnungsnummer"
            value={rechnungsnummer}
            placeholder="RE2026-2069"
            sheetContext="detail"
            onSave={(v) => {
              setRechnungsnummer(v.trim())
              setDraftDirty(true)
            }}
          />
          <p className="full m-0 text-[length:var(--fs-meta)] text-[var(--text-3)]">
            Vorschau der nächsten Nummer — vergeben wird sie erst beim Versand, damit Entwürfe keine Lücken erzeugen.
          </p>
          <SheetEditableField
            label="Rechnungstitel"
            value={rechnungTitel}
            placeholder="z.B. Badsanierung München"
            sheetContext="detail"
            onSave={(v) => {
              setRechnungTitel(v)
              setDraftDirty(true)
            }}
          />
        </div>
      </EditorSheet>

      <EditorSheet
        open={sheet === 'zahlung'}
        onClose={closeSheet}
        title="Zahlung"
        context="canvas"
        onConfirm={closeSheet}
        confirmLabel="Übernehmen"
      >
        <div className="form-grid form-grid--sheet">
          <div className="full">
            <MockField label="Zahlungsziel" full>
              <div className="space-y-2">
                <MockZahlfristSeg value={zahlfrist} onChange={(v) => applyZahlfrist(v)} />
                {zahlfrist === 'datum' ? (
                  <DateInput
                    size="sm"
                    value={zahlfristDatum}
                    onChange={(e) => applyZahlfrist('datum', e.target.value)}
                  />
                ) : null}
              </div>
            </MockField>
          </div>
          <div className="full">
            <MockField label="Rechnungsdatum" full>
              <DateInput
                size="sm"
                value={meta.rechnungsdatum}
                onChange={(e) => {
                  setMeta((m) => ({ ...m, rechnungsdatum: e.target.value }))
                  setDraftDirty(true)
                }}
              />
            </MockField>
          </div>
          <div className="full">
            <LeistungszeitraumFields
              von={meta.leistungszeitraum_von}
              bis={meta.leistungszeitraum_bis}
              onChange={({ von, bis }) => {
                setMeta((m) => ({
                  ...m,
                  leistungszeitraum_von: von,
                  leistungszeitraum_bis: bis,
                }))
                setDraftDirty(true)
              }}
            />
          </div>
          {!hatAuftrag ? (
            <div className="full card" style={{ padding: 16 }}>
              <div style={{ fontSize: 'var(--fs-text)', fontWeight: 600 }}>
                Direktrechnung ohne Auftrag
              </div>
              <p
                className="text-[length:var(--fs-meta)] leading-relaxed"
                style={{ color: 'var(--text-3)', margin: '6px 0 0' }}
              >
                Abschlagspläne sind nur mit Auftrag möglich.
              </p>
            </div>
          ) : !hasPlan ? (
            <div className="full card" style={{ padding: 20 }}>
              <div className="zahlplan-empty">
                <MockIcon ctx="empty" n="calculator" size={26} />
                <div className="zahlplan-empty__title">Noch kein Abschlagsplan</div>
                <div className="zahlplan-empty__text">
                  Optional: Teile die Auftragssumme in Abschläge auf.
                </div>
                <MockBtn kind="primary" icon="plus" onClick={enablePlan}>
                  Abschlagsplan hinzufügen
                </MockBtn>
              </div>
            </div>
          ) : (
            <div className="full">
              {rateLocked && selBerechnet ? (
                <div
                  style={{
                    padding: '12px 14px',
                    border: '1px solid var(--green)',
                    background: 'var(--green-50)',
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 'var(--fs-text)', fontWeight: 600 }}>
                    {selBerechnet.titel}
                  </div>
                  <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)', marginTop: 2 }}>
                    {formatEurBetrag(selBerechnet.brutto)} brutto
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
                    <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                      Vorlage:
                    </span>
                    {PLAN_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className={cn(
                          'zahlplan-preset-chip',
                          matchingPlanPresetName(plan) === p.name && 'is-on'
                        )}
                        onClick={() => {
                          const next = p.build()
                          setPlan(next)
                          setAktivRate(next.zeilen[0]?.id ?? null)
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={cn(
                        'zahlplan-preset-chip',
                        hasPlan && !matchingPlanPresetName(plan) && 'is-on'
                      )}
                      onClick={() => setPlanEditorOpen(true)}
                    >
                      Individuell
                    </button>
                    <MockBtn sm kind="ghost" onClick={clearPlan}>
                      Entfernen
                    </MockBtn>
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
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 'var(--fs-text)', fontWeight: 500 }}>
                              {z.titel}
                            </div>
                            <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                              {z.istSchluss ? 'Schlussrechnung' : 'Abschlag'}
                            </div>
                          </div>
                          <b style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatEurBetrag(z.brutto)}
                          </b>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="full">{steuernBlock}</div>
        </div>
      </EditorSheet>

      <AbschlagsplanEditorModal
        open={planEditorOpen}
        onClose={() => setPlanEditorOpen(false)}
        gesamtNetto={vkNettoPlan}
        gesamtBrutto={
          bootstrap.abschlag?.gesamtBrutto ??
          (vkNettoPlan > 0
            ? Math.round(vkNettoPlan * (1 + defaultMwst / 100) * 100) / 100
            : brutto)
        }
        initial={hasPlan ? plan : null}
        onSave={applyCustomPlan}
      />

      <EditorSheet
        open={sheet === 'vorschau'}
        onClose={closeSheet}
        title="Vorschau"
        context="canvas"
        size="lg"
        onConfirm={closeSheet}
        confirmLabel="Übernehmen"
      >
        <RechnungWizardPdfPreview
          rechnungId={vorschauRechnungId}
          loading={previewLoading || !vorschauRechnungId}
          kundeName={kundeName}
        />
      </EditorSheet>

      <EditorSheet
        open={sheet === 'abschluss'}
        onClose={closeSheet}
        title="Abschlussbericht"
        context="canvas"
        onConfirm={closeSheet}
        confirmLabel="Übernehmen"
      >
        <div className="form-grid form-grid--sheet">
          <div className="full" style={{ display: 'grid', gap: 12 }}>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--fs-meta)',
                color: 'var(--bw-text-muted, #6b7280)',
              }}
            >
              Dokumentationsbericht (Leistungen, Bautagebuch, Abnahme, Fotos) —{' '}
              <strong>keine</strong> Endabrechnung. Preise und Zahlbetrag bleiben auf der
              Rechnung.
              {abschlussHint?.hasBericht ? ' · PDF vorhanden' : ' · noch nicht erstellt'}.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <MockBtn
                kind="primary"
                disabled={saving || abschlussBusy || !bootstrap.auftragId}
                onClick={() => {
                  const aid = bootstrap.auftragId?.trim()
                  if (!aid) return
                  setAbschlussBusy(true)
                  void createAbschlussberichtPdf(aid)
                    .then((r) => {
                      if (!r.ok) {
                        toast.error(r.message)
                        return
                      }
                      setAbschlussHint({
                        showBlock: true,
                        hasBericht: true,
                        berichtUrl: r.publicUrl,
                      })
                      setAbschlussMitVersand(true)
                      toast.success('Abschlussbericht erstellt')
                    })
                    .finally(() => setAbschlussBusy(false))
                }}
              >
                {abschlussBusy
                  ? '…'
                  : abschlussHint?.hasBericht
                    ? 'PDF neu erzeugen'
                    : 'PDF erzeugen'}
              </MockBtn>
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                cursor: 'pointer',
                fontSize: 'var(--fs-text)',
              }}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={abschlussMitVersand}
                disabled={saving}
                onChange={(e) => setAbschlussMitVersand(e.target.checked)}
              />
              <span>
                <span style={{ fontWeight: 500 }}>Als Anhang zur Rechnung mitsenden</span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 2,
                    fontSize: 'var(--fs-meta)',
                    color: 'var(--bw-text-muted, #6b7280)',
                  }}
                >
                  Ja = Abschlussbericht zusätzlich zur Endabrechnung / Rechnung. Nein = nur die
                  Rechnung. Fehlt noch ein PDF, wird es beim Senden erzeugt.
                </span>
              </span>
            </label>
            <div
              className="full"
              style={{
                border: '1px solid var(--bw-border, #e5e7eb)',
                borderRadius: 10,
                overflow: 'hidden',
                minHeight: 280,
                background: 'var(--bw-bg, #f9fafb)',
              }}
            >
              {abschlussHint?.berichtUrl ? (
                <iframe
                  title="Abschlussbericht Vorschau"
                  src={abschlussHint.berichtUrl}
                  style={{ width: '100%', height: 420, border: 0, display: 'block' }}
                />
              ) : (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    fontSize: 'var(--fs-meta)',
                    color: 'var(--bw-text-muted, #6b7280)',
                  }}
                >
                  Noch keine Vorschau — zuerst PDF erzeugen.
                </div>
              )}
            </div>
          </div>
        </div>
      </EditorSheet>

      <EditorSheet
        open={sheet === 'versand'}
        onClose={closeSheet}
        title={istKorrekturVersand ? 'Korrektur versenden' : 'Versand'}
        context="canvas"
        onConfirm={closeSheet}
        confirmLabel="Übernehmen"
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
            disabled={saving}
          />
          <SheetEditableField
            label="Betreff"
            value={mailBetreff || defaultBetreff}
            onSave={setMailBetreff}
            kiExtraHint="Mail-Betreff für den Rechnungsversand an den Kunden."
            sheetContext="detail"
          />
          <SheetEditableField
            label="Einleitung"
            value={einleitung}
            onSave={setEinleitung}
            multiline
            rows={5}
            kiExtraHint="Anschreiben in der Mail und auf der Rechnung."
            placeholder="Einleitung…"
            sheetContext="detail"
          />
          <div className="full">
            <RechnungWizardMailPreview
              rechnungId={activeVersandId}
              kundeId={kundeId}
              betreff={mailBetreff || defaultBetreff}
              einleitung={einleitung.trim() || defaultMailEinleitung}
              rechnungsnummer={previewNr}
              brutto={displayBrutto}
              faelligAm={rFaellig}
              projektTitel={rechnungTitel || rTitel}
              empfaengerHint={mailTo[0] || kundeEmail || kundeName}
              istKorrektur={istKorrekturVersand}
              korrekturOriginalNr={korrekturKontext?.originalNr ?? null}
            />
          </div>
        </div>
      </EditorSheet>

      <ConfirmPopup
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        title="Änderungen speichern?"
        cancelLabel="Weiter bearbeiten"
        discardLabel="Beenden ohne Speichern"
        saveDraftLabel="Als Entwurf speichern"
        danger
        onConfirm={() => {
          void closeWizardClean()
        }}
        onSaveDraft={() => {
          void handleSaveDraftAndClose()
        }}
      >
        Ungespeicherte Eingaben gehen sonst verloren.
      </ConfirmPopup>

      <Ustg13bHilfeSheet
        open={ustg13bHilfeOpen}
        onClose={() => setUstg13bHilfeOpen(false)}
        variant="ausgang"
      />
    </>
  )

  return createPortal(
    artGateOpen ? (
      <EditorSheet
        open
        onClose={onClose}
        title="Art der Leistung"
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
          Einmalig = Projekt/Auftrag mit Abschluss. Wiederkehrend = Bestand wie Wartung,
          Winterdienst oder Hausmeisterservice.
        </p>
        <div className="doctype-row doctype-row--stack">
          <button
            type="button"
            className="doctype-radio-opt doctype-radio-opt--block"
            onClick={() => {
              setWiederkehr({ ist_wiederkehrend: false, wiederkehr_turnus: null })
              setArtGateOpen(false)
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
            <button type="button" className="btn primary" onClick={() => setArtGateOpen(false)}>
              Weiter
            </button>
          </div>
        ) : null}
      </EditorSheet>
    ) : (
      wizard
    ),
    document.body
  )
}
