'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AngebotKiAssistentButton,
  type AngebotKiApplyPayload,
} from '@/components/angebote/AngebotKiAssistent'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { DocActionBar } from '@/components/surfaces/primitives'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import {
  MetaCrowButton,
  TotBand,
} from '@/components/angebote/AngebotWizardCanvasMeta'
import { MockField } from '@/components/mock-ui/MockForm'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockZahlfristSeg } from '@/components/mock-ui/MockZahlfristSeg'
import { PosBoard } from '@/components/posboard/PosBoard'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { KundePickerSheet } from '@/components/kunden/KundePickerSheet'
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
  rechnungMaterialFingerprint,
} from '@/lib/rechnungen/rechnung-korrektur'
import {
  berechneSchlussAbrechnung,
  berechneZahlungsplan,
  emptyZahlungsplan,
  neueZahlungsplanZeile,
  softWarnGestellteRechnungenGegenVk,
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
  type VorgangWiederkehr,
} from '@/lib/vorgang/wiederkehrend'
import {
  faelligAmFromZahlfrist,
  formatDateDeYmd,
  patchZahlungsbedingungenMitZahlfrist,
  type ZahlfristSeg,
  zahlfristSegFromFaelligAm,
} from '@/lib/zahlfrist'
import { RechnungWizardPdfPreview } from '@/components/rechnungen/RechnungWizardPdfPreview'

type Rechnungsart = 'abschlag' | 'schluss'

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
  const [kundePickerOpen, setKundePickerOpen] = useState(false)
  const kundeName =
    kunde?.name?.trim() ||
    [kunde?.vorname, kunde?.nachname].filter(Boolean).join(' ') ||
    'Kunde wählen'
  const kundeEmail = (kunde?.email || '').trim()
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
  const [sheet, setSheet] = useState<
    'kunde' | 'dokument' | 'zahlplan' | 'versand' | null
  >(null)

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

  const vkSoftWarn = useMemo(() => {
    if (!hatAuftrag) return { warn: false as const }
    const vkNetto = bootstrap.gesamtNetto ?? bootstrap.abschlag?.gesamtNetto ?? netto
    return softWarnGestellteRechnungenGegenVk({
      bestehende: bootstrap.rechnungenAbschlag ?? [],
      gesamtNetto: vkNetto,
      mwstSatz: defaultMwst,
      ausserRechnungId: rechnungId,
    })
  }, [
    hatAuftrag,
    bootstrap.gesamtNetto,
    bootstrap.abschlag?.gesamtNetto,
    bootstrap.rechnungenAbschlag,
    netto,
    defaultMwst,
    rechnungId,
  ])

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
      toast.error('Zahlplan noch nicht 100 % — vor Versand anpassen.')
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

  function applyZahlfrist(seg: ZahlfristSeg, datum = zahlfristDatum) {
    setZahlfrist(seg)
    const nextDatum = seg === 'datum' ? datum : faelligAmFromZahlfrist(seg, datum)
    if (seg === 'datum') setZahlfristDatum(nextDatum)
    else setZahlfristDatum(nextDatum)
    const faellig = faelligAmFromZahlfrist(seg, nextDatum)
    setMeta((m) => ({
      ...m,
      faellig_am: faellig,
      zahlungsbedingungen: patchZahlungsbedingungenMitZahlfrist(
        m.zahlungsbedingungen,
        seg,
        nextDatum
      ),
    }))
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

  const korrekturMaterialDirty = useMemo(() => {
    if (!korrekturKontext) return false
    const m = {
      ...meta,
      einleitung,
      mail_einleitung: einleitung,
      mail_betreff: mailBetreff.trim() || defaultBetreff,
      faellig_am: rFaellig,
    }
    const fp = rechnungMaterialFingerprint({
      positionen: positionenBerechnet,
      reverse_charge_13b: m.reverse_charge_13b,
      hinweis_35a: m.hinweis_35a,
      rechnungsdatum: m.rechnungsdatum,
      leistungszeitraum_von: m.leistungszeitraum_von,
      leistungszeitraum_bis: m.leistungszeitraum_bis,
      faellig_am: m.faellig_am,
      zahlungsbedingungen: m.zahlungsbedingungen,
      einleitung: m.einleitung,
      hinweise: m.hinweise,
    })
    return fp !== korrekturKontext.materialFingerprint
  }, [
    korrekturKontext,
    positionenBerechnet,
    meta,
    einleitung,
    mailBetreff,
    defaultBetreff,
    rFaellig,
  ])

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
    setPlan(zahlungsplanVorlage30_40_30())
  }

  function clearPlan() {
    setPlan(emptyZahlungsplan())
    setAktivRate(null)
  }

  const persistEinzel = useCallback(
    async (): Promise<string | null> => {
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
      setSaving(true)
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
      plan,
      planKontext.zeilen,
      rFaellig,
      rechnungsart,
      defaultBetreff,
      wiederkehr,
      korrekturKontext,
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
    // Eine gewählte Rate (Schluss/Abschlag) → nur diese Rechnung speichern, nicht alle Raten
    if (hasPlan && aktivRate) {
      return persistEinzel()
    }
    if (hasPlan) return persistPlan()
    return persistEinzel()
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
    rechnungsnummer.trim() || 'Entwurf',
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

  const wizardTitel =
    selBerechnet?.istSchluss
      ? 'Schlussrechnung'
      : rateLocked && selBerechnet
        ? 'Abschlagsrechnung'
        : 'Rechnung erstellen'

  const wizardSubtitle = [
    rechnungsnummer.trim() || null,
    bootstrap.projektTitel?.trim() || auftragLabel,
    kundeName,
  ]
    .filter(Boolean)
    .join(' · ')

  function onKundePick(k: Kunde) {
    setKunde({
      id: k.id,
      name: k.name,
      vorname: k.vorname,
      nachname: k.nachname,
      email: k.email,
      telefon: k.telefon,
      adresse: k.adresse,
      strasse: k.strasse,
      hausnummer: k.hausnummer,
      plz: k.plz,
      ort: k.ort,
      typ: k.typ,
      ust_id: k.ust_id,
      kundennummer: k.kundennummer,
    })
    setKundeId(k.id)
    setKundePickerOpen(false)
    setSheet(null)
    const email = (k.email || '').trim()
    if (email && isValidEmail(email)) setMailTo([email])
    setDraftDirty(true)
    toast.success('Kunde übernommen')
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
      {vkSoftWarn.warn ? (
        <div className="nachtrags-band" role="status">
          <MockIcon ctx="default" n="alert-triangle" size={16} />
          <span>
            <b>{vkSoftWarn.message}</b>
            <br />
            Speichern kann blockiert werden, wenn die Summe die Auftragssumme überschreitet.
          </span>
        </div>
      ) : null}

      {korrekturKontext ? (
        <div className="nachtrags-band" role="status">
          <MockIcon ctx="default" n={korrekturMaterialDirty ? 'alert-triangle' : 'info-circle'} size={16} />
          <span>
            {korrekturMaterialDirty ? (
              <>
                <b>Korrektur von {korrekturKontext.originalNr}</b>
                <br />
                Beim Speichern/Versand wird die bisherige Rechnung storniert (Gutschrift) und die
                Storno-PDF zusammen mit der neuen Rechnung in der E-Mail angehängt.
              </>
            ) : (
              <>
                <b>Bereits versendet ({korrekturKontext.originalNr})</b>
                <br />
                Nur Mail-Text ändern — ohne Storno. Sobald Positionen oder Belegdaten geändert
                werden, entsteht automatisch eine Korrektur mit Storno.
              </>
            )}
          </span>
        </div>
      ) : null}

      {rateLocked && selBerechnet ? (
        <div className="nachtrags-band" role="status">
          <MockIcon ctx="default" n="info-circle" size={16} />
          <span>
            {selBerechnet.istSchluss ? 'Schlussrechnung' : 'Abschlagsrechnung'} · {selBerechnet.titel}
            {' — '}
            {formatEurBetrag(
              schlussAbrechnung ? schlussAbrechnung.rest_brutto : selBerechnet.brutto
            )}{' '}
            {schlussAbrechnung ? 'Restsumme brutto' : 'brutto'}
          </span>
        </div>
      ) : null}

      <PosBoard
        title={`Positionen · ${hatAuftrag ? `Auftrag ${auftragLabel}` : 'Direktrechnung'} · ${kundeName}`}
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

      <TotBand
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

      {steuernBlock}

      <section className="document-section">
        <h2 className="document-section__label">Vorschau</h2>
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
      </section>
    </div>
  )

  const metaColumn = (
    <div className="dc-meta-stack">
      <div className="document-section__label" style={{ marginBottom: 10 }}>
        Rechnungsdaten
      </div>
      <MetaCrowButton
        label={hatAuftrag ? 'Auftrag' : 'Kunde'}
        value={hatAuftrag ? auftragLabel : kundeName}
        onClick={() => setSheet(hatAuftrag ? 'dokument' : 'kunde')}
      />
      <MetaCrowButton
        label="Dokument"
        value={dokumentCrowValue}
        onClick={() => setSheet('dokument')}
      />
      <MetaCrowButton
        label="Zahlplan"
        value={zahlplanCrowValue}
        onClick={() => setSheet('zahlplan')}
      />
      <MetaCrowButton
        label="Versand"
        value={versandCrowValue}
        onClick={() => setSheet('versand')}
      />
    </div>
  )

  const metaSum = (
    <div className="dc-re-sum">
      {schlussAbrechnung && schlussAbrechnung.bereits_gezahlt_brutto > 0 ? (
        <>
          <div className="dc-re-sum__row dc-re-sum__row--muted">
            <span>Gesamt brutto</span>
            <span>{formatEurBetrag(schlussAbrechnung.brutto)}</span>
          </div>
          {schlussAbrechnung.bereits_gezahlt.map((z) => (
            <div key={z.label} className="dc-re-sum__row dc-re-sum__row--muted">
              <span>Abzgl. {z.label}</span>
              <span>−{formatEurBetrag(z.brutto)}</span>
            </div>
          ))}
          <div className="dc-re-sum__row">
            <span>Restsumme</span>
            <b>{formatEurBetrag(schlussAbrechnung.rest_brutto)}</b>
          </div>
        </>
      ) : (
        <div className="dc-re-sum__row">
          <span>Rechnungsbetrag</span>
          <b>{formatEurBetrag(displayBrutto)}</b>
        </div>
      )}
      <div className="dc-re-sum__faellig">
        {rFaellig ? `fällig ${formatDateDe(rFaellig)}` : 'Fälligkeit offen'}
      </div>
    </div>
  )

  const footerCta = (
    <button
      type="button"
      className="btn primary"
      disabled={saving || (hasPlan && !planOk)}
      onClick={() =>
        void persistDraft().then((id) => {
          if (id) toast.success('Entwurf gespeichert')
        })
      }
    >
      {saving ? 'Speichern…' : 'Speichern'}
    </button>
  )

  const docActions = (
    <DocActionBar
      actions={[
        {
          id: 'preview',
          label: 'Vorschau',
          onClick: () => {
            const el = document.getElementById('rw-vorschau')
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          },
          icon: <MockIcon ctx="default" n="file-text" size={20} />,
        },
        {
          id: 'send',
          label: 'Senden',
          onClick: () => setSheet('versand'),
          icon: <MockIcon ctx="default" n="send" size={20} />,
        },
      ]}
    />
  )

  const closeSheet = () => setSheet(null)

  const wizard = (
    <>
      <DocumentCanvas
        title={wizardTitel}
        subtitle={wizardSubtitle}
        onClose={handleRequestClose}
        onSave={() =>
          void persistDraft().then((id) => {
            if (id) toast.success('Entwurf gespeichert')
          })
        }
        saveBusy={saving}
        busy={saving}
        busyLabel="Wird versendet…"
        onDiscard={() => onClose()}
        docActions={docActions}
        document={
          <div id="rw-vorschau" className="contents">
            {documentColumn}
          </div>
        }
        meta={metaColumn}
        metaSum={metaSum}
        footerCta={footerCta}
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
            <span className="gfc-v">{kundeName}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">E-Mail</span>
            <span className="gfc-v">{kundeEmail || <em>fehlt</em>}</span>
          </div>
          <div className="gfc-row">
            <span className="gfc-l">Telefon</span>
            <span className="gfc-v">{kunde?.telefon?.trim() || '—'}</span>
          </div>
        </div>
      </EditorSheet>

      <KundePickerSheet
        open={kundePickerOpen}
        onClose={() => setKundePickerOpen(false)}
        onPick={onKundePick}
        context="canvas"
        title="Kunde"
      />

      <EditorSheet
        open={sheet === 'dokument'}
        onClose={closeSheet}
        title="Dokument"
        context="canvas"
      >
        <div className="form-grid form-grid--sheet">
          {hatAuftrag && !rateLocked ? (
            <div className="full">
              <div className="section-h" style={{ marginBottom: 10, textTransform: 'none' }}>
                Art
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
                  Schluss
                </button>
              </div>
            </div>
          ) : !hatAuftrag ? (
            <div className="full">
              <div className="section-h" style={{ marginBottom: 10, textTransform: 'none' }}>
                Art
              </div>
              <div className="seg" role="group" aria-label="Rechnungsart">
                <button type="button" className="on" disabled>
                  Einzel
                </button>
              </div>
            </div>
          ) : null}
          <div className="full">
            <VorgangArtWiederkehrField
              value={wiederkehr}
              onChange={setWiederkehr}
              hint="Wiederkehrend — Abrechnung zu wiederkehrendem Auftrag"
            />
          </div>
          <MockField label="Rechnungsdatum">
            <input
              type="date"
              className="input"
              value={meta.rechnungsdatum}
              onChange={(e) => setMeta((m) => ({ ...m, rechnungsdatum: e.target.value }))}
            />
          </MockField>
          <MockField label="Leistungszeitraum von">
            <input
              type="date"
              className="input"
              value={meta.leistungszeitraum_von}
              onChange={(e) =>
                setMeta((m) => ({ ...m, leistungszeitraum_von: e.target.value }))
              }
            />
          </MockField>
          <MockField label="Leistungszeitraum bis" full>
            <input
              type="date"
              className="input"
              value={meta.leistungszeitraum_bis}
              onChange={(e) =>
                setMeta((m) => ({ ...m, leistungszeitraum_bis: e.target.value }))
              }
            />
          </MockField>
          <MockField label="Einleitung (Anschreiben)" full>
            <textarea
              className="input ta"
              rows={5}
              value={einleitung}
              onChange={(e) => setEinleitung(e.target.value)}
            />
          </MockField>
        </div>
      </EditorSheet>

      <EditorSheet
        open={sheet === 'zahlplan'}
        onClose={closeSheet}
        title="Zahlplan"
        context="canvas"
      >
        <div className="form-grid form-grid--sheet">
          <MockField label="Zahlungsziel / Zahlfrist" hint="Frist nach Rechnungsstellung" full>
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
                  Zahlplan hinzufügen
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
        </div>
      </EditorSheet>

      <EditorSheet
        open={sheet === 'versand'}
        onClose={closeSheet}
        title="Versand"
        context="canvas"
        compose
        composeLabel={saving ? '…' : 'Senden'}
        onConfirm={() => void handleFinish(true)}
        confirmDisabled={saving || (hasPlan && !planOk)}
        confirmBusy={saving}
      >
        <div className="form-grid form-grid--sheet">
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
            label="Cc"
            emails={mailCc}
            onChange={setMailCc}
            placeholder="optional"
            disabled={saving}
          />
          <MockField label="Betreff" full>
            <input
              className="input"
              value={mailBetreff || defaultBetreff}
              onChange={(e) => setMailBetreff(e.target.value)}
            />
          </MockField>
          <div className="full" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <MockBtn
              kind="ghost"
              disabled={saving || (hasPlan && !planOk)}
              onClick={() => void handleFinish(false)}
            >
              Nur erstellen
            </MockBtn>
            <MockBtn
              kind="primary"
              icon="send"
              disabled={saving || (hasPlan && !planOk)}
              onClick={() => void handleFinish(true)}
            >
              Erstellen und versenden
            </MockBtn>
          </div>
          <div className="full">
            <RechnungWizardMailPreview
              rechnungId={activeVersandId}
              kundeId={kundeId}
              betreff={mailBetreff || defaultBetreff}
              einleitung={einleitung}
              rechnungsnummer={previewNr}
              brutto={displayBrutto}
              faelligAm={rFaellig}
              projektTitel={bootstrap.projektTitel || rTitel}
              empfaengerHint={mailTo[0] || kundeEmail || kundeName}
            />
          </div>
        </div>
      </EditorSheet>
    </>
  )

  return wizard
}
