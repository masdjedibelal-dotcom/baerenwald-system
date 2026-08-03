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
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { DateInput } from '@/components/ui/DateInput'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { ACTION_ICON_STROKE } from '@/components/ui/ActionIcon'
import { KundeModal } from '@/components/kunden/KundeModal'
import { RechnungWizardMailPreview } from '@/components/rechnungen/RechnungWizardMailPreview'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import { normalizeKundeNamen } from '@/lib/kunde-namen'
import {
  istKundeFirmaPflichtTyp,
  kundeStrasseHausnummerZeile,
} from '@/lib/kunde-stammdaten'
import {
  createAllAbschlagRechnungenFromWizard,
  finalizeRechnungWizardWithoutMail,
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
import type { Gewerk, Kunde, Preisliste } from '@/lib/types'
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
  const [kundeEditOpen, setKundeEditOpen] = useState(false)
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
  const kundeEmail = (kunde?.email || '').trim()
  const kundeTelefon = (kunde?.telefon || '').trim()
  const kundeAnschrift = kunde
    ? kundeStrasseHausnummerZeile(kunde) || kunde.adresse?.trim() || null
    : null
  const kundeStadt = [kunde?.plz?.trim(), kunde?.ort?.trim()].filter(Boolean).join(' ')
  const kundeTypLabel = kundentypLabel(kunde?.typ)
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
  const zahlfrist: ZahlfristSeg = zahlfristInit.seg
  const zahlfristDatum = zahlfristInit.datum
  const [rechnungId, setRechnungId] = useState<string | null>(bootstrap.rechnungId)
  const [korrekturKontext, setKorrekturKontext] = useState(bootstrap.korrekturKontext ?? null)
  const [abschlagRechnungen, setAbschlagRechnungen] = useState<AbschlagRechnungEntwurf[]>([])
  const [versandRechnungId, setVersandRechnungId] = useState<string | null>(bootstrap.rechnungId)
  const [rechnungsnummer, setRechnungsnummer] = useState(
    bootstrap.rechnungsnummer?.trim() || ''
  )
  const [saving, setSaving] = useState(false)
  const [draftDirty, setDraftDirty] = useState(() => !bootstrap.rechnungId)
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
  const defaultBetreff = `${previewNr} · ${rTitel}`

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
        toast.error('Noch keine Position — Erstellen/Senden erst mit mindestens einer Position.')
      }
    }
    if (step === 2 && hasPlan && !planOk) {
      toast.error('Abschlagsplan noch nicht 100 % — vor Versand anpassen.')
    }
    const next = step === 2 ? 4 : Math.min(4, step + 1)
    const enteringVersand = next === 4
    if (enteringVersand) {
      const id = await persistDraft()
      if (!id) {
        toast.error(
          'Entwurf noch nicht gespeichert — Mail-Vorschau ggf. unvollständig. Pflichtfelder vor Erstellen prüfen.'
        )
      }
      if (!mailBetreff.trim()) setMailBetreff(defaultBetreff)
      if (!einleitung.trim()) {
        setEinleitung(
          defaultRechnungMailEinleitung(
            istPrivatKundeTyp(kunde?.typ) ? 'du' : 'sie'
          )
        )
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
      }),
    [zeilen, meta, rechnungsart, plan, einleitung, mailBetreff]
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
    async (opts?: { manageBusy?: boolean }): Promise<string | null> => {
      const planAktiv = hatAuftrag && hasPlan && Boolean(aktivRate)
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
      const sel = planKontext.zeilen.find((z) => z.id === aktivRate) ?? null
      const manageBusy = opts?.manageBusy !== false
      if (manageBusy) {
        setSaving(true)
        actionBusy.show('Wird gespeichert…')
      }
      try {
        const res = await saveRechnungWizardDraft({
          rechnungId,
          auftrag_id: bootstrap.auftragId,
          angebot_id: bootstrap.angebotId,
          kunde_id: kundeId,
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
          toast.error(res.message)
          return null
        }
        const switched = Boolean(korrekturKontext && res.rechnungId !== rechnungId)
        setRechnungId(res.rechnungId)
        setVersandRechnungId(res.rechnungId)
        if (res.rechnungsnummer?.trim()) setRechnungsnummer(res.rechnungsnummer.trim())
        if (switched) {
          setKorrekturKontext(null)
          toast.success('Storno angelegt — Korrektur als neue Rechnung gespeichert')
        }
        setMeta(nextMeta)
        savedSnapshotRef.current = draftSnapshot
        setDraftDirty(false)
        return res.rechnungId
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
      plan,
      planKontext.zeilen,
      rFaellig,
      rechnungsart,
      defaultBetreff,
      wiederkehr,
      korrekturKontext,
    ]
  )

  const persistPlan = useCallback(async (opts?: { manageBusy?: boolean }): Promise<string | null> => {
    if (!bootstrap.auftragId?.trim()) {
      toast.error('Abschlagsrechnungen sind nur mit Auftrag möglich.')
      return null
    }
    if (!kundeId?.trim()) {
      toast.error('Kein Kunde verknüpft.')
      return null
    }
    if (!planOk) {
      toast.error('Abschlagsplan bitte so anpassen, dass 100 % bzw. Rest abgedeckt sind.')
      return null
    }
    const nextMeta = buildMetaForSave()
    const manageBusy = opts?.manageBusy !== false
    if (manageBusy) {
      setSaving(true)
      actionBusy.show('Wird gespeichert…')
    }
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
      if (manageBusy) {
        setSaving(false)
        actionBusy.hide()
      }
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

  async function persistDraft(opts?: { manageBusy?: boolean }): Promise<string | null> {
    if (hasPlan && !hatAuftrag) {
      toast.error('Abschlagsrechnungen sind nur mit Auftrag möglich. Bitte Abschlagsplan entfernen.')
      return null
    }
    // Eine gewählte Rate (Schluss/Abschlag) → nur diese Rechnung speichern, nicht alle Raten
    if (hasPlan && aktivRate) {
      return persistEinzel(opts)
    }
    if (hasPlan) return persistPlan(opts)
    return persistEinzel(opts)
  }

  async function handleFinish(sendMail: boolean) {
    if (hasPlan && !planOk) {
      toast.error('Abschlagsplan bitte so anpassen, dass 100 % bzw. Rest abgedeckt sind.')
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
    await actionBusy.run(sendMail ? 'Wird gesendet…' : 'Rechnung wird erstellt…', async () => {
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
    })
  }

  async function handleCanvasClose() {
    if (draftDirty && !saving) {
      /* S9: Auto-Entwurf best-effort — RE speichert oft über goNextStep */
    }
    onClose()
  }

  function handleRequestClose() {
    void handleCanvasClose()
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
    rechnungTitel.trim() || rechnungsnummer.trim() || 'Entwurf',
    selBerechnet?.istSchluss || rechnungsart === 'schluss'
      ? 'Schlussrechnung'
      : hasPlan || rechnungsart === 'abschlag'
        ? 'Abschlag'
        : 'Rechnung',
  ].join(' · ')

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
    const email = saved.email?.trim()
    if (email && isValidEmail(email)) setMailTo([email])
    setDraftDirty(true)
  }

  const steuernBlock = (
    <div className="rw-tax">
      <div className="document-section__label" style={{ marginBottom: 10 }}>
        Steuerliche Hinweise
      </div>
      <div className="rw-tax__list">
        {(
          [
            {
              on: meta.hinweis_35a,
              set: (v: boolean) => setMeta((m) => ({ ...m, hinweis_35a: v })),
              label: '§35a EStG-Hinweis ausweisen',
              sub:
                anteil35a.lohn_netto > 0
                  ? anteil35a.hat_materialausweis
                    ? `Lohnkostenanteil ${formatEurBetrag(anteil35a.lohn_netto)} (Rechnungsnetto abzgl. Material ${formatEurBetrag(anteil35a.material_netto)}) — steuerlich begünstigt`
                    : `Lohnkostenanteil ${formatEurBetrag(anteil35a.lohn_netto)}${anteil35a.ist_brutto ? ' brutto' : ''} — steuerlich begünstigt`
                  : 'Lohnkostenanteil für haushaltsnahe Handwerkerleistungen',
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
            className={c.on ? 'rw-tax__opt on' : 'rw-tax__opt'}
            onClick={() => c.set(!c.on)}
          >
            <span className="rw-tax__check" aria-hidden>
              {c.on ? <MockIcon ctx="btn" n="check" size={12} /> : null}
            </span>
            <span className="rw-tax__txt">
              <span className="rw-tax__lab">{c.label}</span>
              <span className="rw-tax__sub">{c.sub}</span>
            </span>
          </button>
        ))}
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
        value={kundeName}
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
        disabled={saving}
        onClick={() => {
          void persistDraft().then(() => setSheet('vorschau'))
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
              if (saving || (hasPlan && !planOk)) return
              void persistDraft().then((id) => {
                if (id) toast.success('Entwurf gespeichert')
              })
            },
          },
          {
            label: saving ? 'Senden…' : 'Senden',
            icon: <MockIcon ctx="btn" n="send" size={16} />,
            hint: 'Speichert und versendet',
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
          <div className="gfc-row">
            <span className="gfc-l">{kundeFirma ? 'Vorname (Ansprechpartner)' : 'Vorname'}</span>
            <span className="gfc-v">{kundeNamen.vorname || '—'}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">{kundeFirma ? 'Nachname (Ansprechpartner)' : 'Nachname'}</span>
            <span className="gfc-v">{kundeNamen.nachname || '—'}</span>
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
      </EditorSheet>

      <KundeModal
        open={kundeEditOpen}
        onClose={() => setKundeEditOpen(false)}
        editKunde={(kunde as Kunde | null) ?? null}
        stayOnPage
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
      >
        <div className="form-grid form-grid--sheet">
          <div className="full wizard-zahlung-dates">
            <MockField label="Rechnungsdatum">
              <DateInput
                size="sm"
                value={meta.rechnungsdatum}
                onChange={(e) => setMeta((m) => ({ ...m, rechnungsdatum: e.target.value }))}
              />
            </MockField>
            <MockField label="Leistungszeitraum von">
              <DateInput
                size="sm"
                value={meta.leistungszeitraum_von}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, leistungszeitraum_von: e.target.value }))
                }
              />
            </MockField>
            <MockField label="Leistungszeitraum bis">
              <DateInput
                size="sm"
                value={meta.leistungszeitraum_bis}
                onChange={(e) =>
                  setMeta((m) => ({ ...m, leistungszeitraum_bis: e.target.value }))
                }
              />
            </MockField>
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
      >
        {activeVersandId ? (
          <RechnungWizardPdfPreview
            rechnungId={activeVersandId}
            kundeName={kundeName}
          />
        ) : (
          <div className="rw-preview-card">
            <div className="rw-preview-card__banner">
              {(previewNr !== 'Rechnung' ? previewNr : 'Entwurf')}
              {rTitel ? ` · ${rTitel}` : ''}
            </div>
            <div className="rw-preview-card__body">
              <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 14px' }}>
                {einleitung.trim() || 'Sehr geehrte Damen und Herren,'}
              </p>
              <ul className="rw-preview-card__pos">
                {positionenBerechnet.slice(0, 6).map((p, i) => (
                  <li key={`${p.leistung}-${i}`}>
                    <span>
                      {p.leistung}
                      {p.menge != null
                        ? ` · ${p.menge} ${p.einheit || ''}`.trim()
                        : ''}
                    </span>
                    <b>
                      {formatEurBetrag(
                        (p.vk_netto ??
                          (Number(p.lohn_netto ?? 0) + Number(p.material_netto ?? 0))) *
                          (p.menge ?? 1) *
                          1.19
                      )}
                    </b>
                  </li>
                ))}
              </ul>
              <div className="rw-preview-card__sum">
                <span>{schlussAbrechnung ? 'Restsumme' : 'Rechnungsbetrag'}</span>
                <b>{formatEurBetrag(displayBrutto)}</b>
              </div>
              {rFaellig ? (
                <div className="rw-preview-card__faellig">
                  Fällig am {formatDateDe(rFaellig)}
                </div>
              ) : null}
            </div>
            <div className="rw-preview-card__foot">
              Bärenwald · an {kundeName}
            </div>
          </div>
        )}
      </EditorSheet>

      <EditorSheet
        open={sheet === 'abschluss'}
        onClose={closeSheet}
        title="Abschlussbericht"
        context="canvas"
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
              einleitung={einleitung}
              rechnungsnummer={previewNr}
              brutto={displayBrutto}
              faelligAm={rFaellig}
              projektTitel={rechnungTitel || rTitel}
              empfaengerHint={mailTo[0] || kundeEmail || kundeName}
            />
          </div>
        </div>
      </EditorSheet>
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
