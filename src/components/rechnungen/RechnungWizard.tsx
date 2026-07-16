'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { WizardShell } from '@/components/layout/WizardShell'
import { MockField } from '@/components/mock-ui/MockForm'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockZahlfristSeg } from '@/components/mock-ui/MockZahlfristSeg'
import { PosBoard } from '@/components/posboard/PosBoard'
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
  type DokumentArtikelZeile,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import {
  berechneRechnung,
  parseKleinunternehmerSetting,
} from '@/lib/rechnung-berechnung'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import { isValidEmail } from '@/lib/email-recipients'
import { defaultFirmenEinstellungen, type FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  dokumentZeilenToPosBoardLines,
  posBoardLineNetto,
  posBoardLinesToDokumentZeilen,
  type PosBoardLine,
} from '@/lib/posboard/pos-board-line'
import type {
  AbschlagRechnungEntwurf,
  RechnungWizardBootstrap,
  RechnungWizardMeta,
} from '@/lib/rechnungen/rechnung-wizard-types'
import {
  neueZahlungsplanZeile,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import type { Gewerk, Preisliste } from '@/lib/types'
import {
  faelligAmFromZahlfrist,
  formatDateDeYmd,
  plusDaysIso,
  type ZahlfristSeg,
  zahlfristSegFromFaelligAm,
} from '@/lib/zahlfrist'

type Rate = {
  id: string
  label: string
  prozent: number
  faellig: string
}

type Versandweg = 'portal' | 'email' | 'post'
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
  { id: 2, label: 'Zahlplan' },
  { id: 3, label: 'Paket & Versand' },
]

function formatDateDe(ymd: string): string {
  return formatDateDeYmd(ymd)
}

function mkRate(label: string, prozent: number, tage: number): Rate {
  return {
    id: `rate-${Math.random().toString(36).slice(2, 9)}`,
    label,
    prozent,
    faellig: plusDaysIso(tage),
  }
}

const PRESETS: Record<string, Array<[string, number, number]>> = {
  '30 / 40 / 30': [
    ['1. Abschlag', 30, 14],
    ['2. Abschlag', 40, 45],
    ['Schlussrechnung', 30, 75],
  ],
  '50 / 50': [
    ['Anzahlung', 50, 14],
    ['Schlussrechnung', 50, 60],
  ],
  'Anzahlung 30% + Rest': [
    ['Anzahlung', 30, 7],
    ['Schlussrechnung', 70, 60],
  ],
}

function ratesToZahlungsplan(raten: Rate[]): Zahlungsplan {
  return {
    modus: 'abschlagsplan',
    zeilen: raten.map((r) =>
      neueZahlungsplanZeile({
        id: r.id,
        titel: r.label,
        typ: 'prozent',
        wert: r.prozent,
      })
    ),
  }
}

function planToRates(plan: Zahlungsplan | null | undefined): Rate[] {
  if (!plan?.zeilen.length) {
    return [
      mkRate('1. Abschlag', 30, 14),
      mkRate('2. Abschlag', 40, 45),
      mkRate('Schlussrechnung', 30, 75),
    ]
  }
  return plan.zeilen.map((z, i) => ({
    id: z.id,
    label: z.titel,
    prozent: z.typ === 'rest' ? 0 : Number(z.wert) || 0,
    faellig: plusDaysIso(14 + i * 30),
  }))
}

/**
 * Rechnungs-Wizard 1:1 Mock:
 * Positionen (PosBoard) → Zahlplan → Paket & Versand
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
  const brand = firm.firmenname?.trim() || 'Bärenwald München'
  const kundeName =
    bootstrap.kunde?.name?.trim() ||
    [bootstrap.kunde?.vorname, bootstrap.kunde?.nachname].filter(Boolean).join(' ') ||
    'Kunde'
  const kundeEmail = (bootstrap.kunde?.email || '').trim()
  const auftragLabel =
    bootstrap.auftragsReferenz?.trim() ||
    bootstrap.projektTitel?.trim() ||
    bootstrap.auftragId?.slice(0, 8)?.toUpperCase() ||
    '—'

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
  const [mode, setMode] = useState<'einzel' | 'plan'>(() =>
    bootstrap.meta.zahlungsart === 'abschlaege' || bootstrap.modus === 'abschlag'
      ? 'plan'
      : 'einzel'
  )
  const [raten, setRaten] = useState<Rate[]>(() => planToRates(bootstrap.zahlungsplan))
  const [aktivRate, setAktivRate] = useState<string | null>(null)
  const [versandweg, setVersandweg] = useState<Versandweg>('portal')
  const [anlagen, setAnlagen] = useState<Record<AnlagenKey, boolean>>({
    rechnung: true,
    leistungsnachweis: true,
    bautagebuch: false,
    abnahme: false,
    fotos: false,
  })
  const [einleitung, setEinleitung] = useState(
    () =>
      bootstrap.meta.einleitung?.trim() ||
      `Sehr geehrte Damen und Herren,\n\nfür die erbrachten Leistungen zum Auftrag „${bootstrap.projektTitel || auftragLabel}" erlauben wir uns, folgende Rechnung zu stellen:`
  )
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
  const savedSnapshotRef = useRef<string | null>(null)

  const kundeId = bootstrap.kundeId
  const istPlan = mode === 'plan'

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (mode === 'plan' && !aktivRate && raten[0]) setAktivRate(raten[0].id)
  }, [mode, aktivRate, raten])

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

  const brutto = berechnung.brutto
  const lohnAnteil = berechnung.lohn_netto
  const posBoardLines = useMemo(() => dokumentZeilenToPosBoardLines(zeilen), [zeilen])
  const gewerkNamen = useMemo(() => gewerke.map((g) => g.name).filter(Boolean), [gewerke])

  const einzelFaellig = faelligAmFromZahlfrist(zahlfrist, zahlfristDatum)
  const prozentSumme = raten.reduce((s, r) => s + (Number(r.prozent) || 0), 0)
  const planOk = !istPlan || prozentSumme === 100
  const selRate = raten.find((r) => r.id === aktivRate) ?? null
  const rateBrutto = (r: Rate) => Math.round((brutto * (Number(r.prozent) || 0)) / 100)
  const rTitel =
    istPlan && selRate
      ? `${bootstrap.projektTitel || auftragLabel} — ${selRate.label}`
      : `${bootstrap.projektTitel || auftragLabel} — Schlussrechnung`
  const rBrutto = istPlan && selRate ? rateBrutto(selRate) : brutto
  const rFaellig = istPlan && selRate ? selRate.faellig : einzelFaellig
  const anlagenCount = ANLAGEN_DEF.filter((a) => anlagen[a.key]).length
  const previewNr = rechnungsnummer.trim() || 'RE-Entwurf'
  const activeVersandId = versandRechnungId ?? rechnungId

  function applyZahlfrist(seg: ZahlfristSeg, datum = zahlfristDatum) {
    setZahlfrist(seg)
    const nextDatum = seg === 'datum' ? datum : faelligAmFromZahlfrist(seg, datum)
    if (seg === 'datum') setZahlfristDatum(nextDatum)
    else setZahlfristDatum(nextDatum)
    setMeta((m) => ({ ...m, faellig_am: faelligAmFromZahlfrist(seg, nextDatum) }))
  }

  const draftSnapshot = useMemo(
    () => JSON.stringify({ zeilen, meta, mode, raten, einleitung }),
    [zeilen, meta, mode, raten, einleitung]
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

  function applyPreset(name: string) {
    const rows = PRESETS[name]
    if (!rows) return
    setRaten(rows.map(([l, p, t]) => mkRate(l, p, t)))
    setAktivRate(null)
  }

  function updRate(id: string, patch: Partial<Rate>) {
    setRaten((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function rmRate(id: string) {
    setRaten((prev) => prev.filter((r) => r.id !== id))
    setAktivRate((cur) => (cur === id ? null : cur))
  }

  function addRate() {
    setRaten((prev) => [...prev, mkRate(`${prev.length + 1}. Abschlag`, 0, 30)])
  }

  function toggleAnlage(k: AnlagenKey) {
    setAnlagen((a) => ({ ...a, [k]: !a[k] }))
  }

  function buildMetaForSave(): RechnungWizardMeta {
    return {
      ...meta,
      einleitung,
      mail_einleitung: einleitung,
      zahlungsart: istPlan ? 'abschlaege' : 'standard',
      abschlag_zeile_id: istPlan ? aktivRate : null,
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
      const res = await saveRechnungWizardDraft({
        rechnungId,
        auftrag_id: bootstrap.auftragId,
        angebot_id: bootstrap.angebotId,
        kunde_id: kundeId,
        positionen: positionenBerechnet,
        meta: nextMeta,
        modus: bootstrap.modus ?? 'voll',
        zahlungsplan: null,
        zahlungsplanSpeichern: false,
      })
      setSaving(false)
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildMeta uses current closure
    [
      zeilen,
      kundeId,
      rechnungId,
      bootstrap.auftragId,
      bootstrap.angebotId,
      bootstrap.modus,
      positionenBerechnet,
      draftSnapshot,
      meta,
      einleitung,
      istPlan,
      aktivRate,
      rFaellig,
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
      toast.error('Zahlplan-Summe muss 100% sein.')
      return null
    }
    const plan = ratesToZahlungsplan(raten)
    const nextMeta = buildMetaForSave()
    setSaving(true)
    const planSave = await saveAuftragZahlungsplan(bootstrap.auftragId, plan)
    if (!planSave.ok) {
      setSaving(false)
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
    })
    setSaving(false)
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
  }, [
    bootstrap.auftragId,
    bootstrap.angebotId,
    kundeId,
    planOk,
    raten,
    positionenBerechnet,
    aktivRate,
    draftSnapshot,
    meta,
    einleitung,
    istPlan,
    rFaellig,
  ])

  async function handleFinish() {
    if (!planOk) {
      toast.error('Zahlplan-Summe muss 100% sein.')
      return
    }
    const id = istPlan ? await persistPlan() : await persistEinzel()
    if (!id) return

    const mailTo =
      kundeEmail && isValidEmail(kundeEmail) ? [kundeEmail] : []
    const nextMeta = buildMetaForSave()
    const nrLabel = () =>
      abschlagRechnungen.find((r) => r.id === id)?.rechnungsnummer?.trim() ||
      (id === activeVersandId ? rechnungsnummer.trim() : '') ||
      previewNr

    // Post: ohne E-Mail finalisieren
    if (versandweg === 'post') {
      setSaving(true)
      await syncRechnungWizardMetaToEntwurf(id, { kunde_id: kundeId, meta: nextMeta })
      const res = await finalizeRechnungWizardWithoutMail(id)
      setSaving(false)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        `Rechnung ${res.rechnungsnummer?.trim() || nrLabel()} erstellt & drucken · ${formatEurBetrag(rBrutto)} brutto`
      )
      onDone?.(id)
      onClose()
      router.refresh()
      return
    }

    // Portal ohne E-Mail: bereitstellen
    if (versandweg === 'portal' && !mailTo.length) {
      setSaving(true)
      await syncRechnungWizardMetaToEntwurf(id, { kunde_id: kundeId, meta: nextMeta })
      const res = await finalizeRechnungWizardWithoutMail(id)
      setSaving(false)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        `Rechnung ${res.rechnungsnummer?.trim() || nrLabel()} erstellt & versendet · ${formatEurBetrag(rBrutto)} brutto`
      )
      onDone?.(id)
      onClose()
      router.refresh()
      return
    }

    if (!mailTo.length) {
      toast.error('Keine Kunden-E-Mail hinterlegt — Versand nicht möglich.')
      return
    }
    setSaving(true)
    const sync = await syncRechnungWizardMetaToEntwurf(id, {
      kunde_id: kundeId,
      meta: nextMeta,
    })
    if (!sync.ok) {
      setSaving(false)
      toast.error(sync.message)
      return
    }
    const res = await sendRechnungWizard({
      rechnungId: id,
      mailTo,
      mailCc: [],
    })
    setSaving(false)
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

  function handleWeiter() {
    if (step === 2 && istPlan && !planOk) {
      toast.error('Zahlplan-Summe muss 100% sein.')
      return
    }
    setStep((s) => Math.min(3, s + 1))
  }

  if (!mounted) return null

  const finishLabel = `Rechnung erstellen & ${versandweg === 'post' ? 'drucken' : 'senden'}`

  const desktopActions = (
    <div className="wizard-nav-actions">
      {step > 1 ? (
        <MockBtn kind="ghost" icon="chevron-left" onClick={() => setStep((s) => s - 1)}>
          Zurück
        </MockBtn>
      ) : null}
      {step < 3 ? (
        <MockBtn kind="primary" icon="chevron-right" onClick={handleWeiter}>
          Weiter
        </MockBtn>
      ) : (
        <MockBtn
          kind="primary"
          icon="send"
          disabled={saving || !planOk}
          onClick={() => void handleFinish()}
        >
          {finishLabel}
        </MockBtn>
      )}
    </div>
  )

  const mobileActions =
    step < 3 ? (
      <>
        {step > 1 ? (
          <MockBtn sm kind="ghost" icon="chevron-left" onClick={() => setStep((s) => s - 1)} title="Zurück" />
        ) : null}
        <MockBtn sm kind="primary" onClick={handleWeiter}>
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
          disabled={saving || !planOk}
          onClick={() => void handleFinish()}
        >
          {versandweg === 'post' ? 'Drucken' : 'Senden'}
        </MockBtn>
      </>
    )

  const wege: Array<{ key: Versandweg; label: string; icon: string; sub: string }> = [
    {
      key: 'portal',
      label: 'Kundenportal',
      icon: 'layout-dashboard',
      sub: 'Freigabe & Download im Portal',
    },
    { key: 'email', label: 'E-Mail', icon: 'mail', sub: `PDF-Anhang an ${kundeName}` },
    { key: 'post', label: 'Post', icon: 'building', sub: 'Ausdruck & Briefversand' },
  ]

  const wizard = (
    <WizardShell
      className="wizard-flow"
      title="Rechnung erstellen"
      steps={WIZARD_STEPS}
      currentStep={step}
      onClose={handleRequestClose}
      mobileActions={mobileActions}
      desktopActions={desktopActions}
    >
      {step === 1 ? (
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
            <span>Leistungen · Gesamtumfang</span>
            <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 12.5 }}>
              Auftrag {auftragLabel} · {kundeName}
            </span>
          </div>
          <PosBoard
            positionen={posBoardLines}
            onChange={onPosBoardChange}
            showUst
            gewerke={gewerkNamen}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
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
              Zahlungsweise
            </div>
            <div className="seg" role="group" aria-label="Zahlungsweise">
              <button
                type="button"
                className={mode === 'einzel' ? 'on' : undefined}
                onClick={() => setMode('einzel')}
              >
                Einzelrechnung
              </button>
              <button
                type="button"
                className={mode === 'plan' ? 'on' : undefined}
                onClick={() => setMode('plan')}
              >
                Zahlplan (Abschläge)
              </button>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
              Gesamt{' '}
              <b style={{ color: 'var(--green)' }}>{formatEurBetrag(brutto)}</b> brutto
            </div>
          </div>

          {istPlan ? (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    alignSelf: 'center',
                    marginRight: 2,
                  }}
                >
                  Vorlage:
                </span>
                {Object.keys(PRESETS).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => applyPreset(name)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 8,
                      border: '0.5px solid var(--border)',
                      background: 'var(--card)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {name}
                  </button>
                ))}
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
                    gridTemplateColumns: '1fr 84px 120px 150px 34px',
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
                  <div style={{ textAlign: 'right' }}>Anteil</div>
                  <div style={{ textAlign: 'right' }}>Betrag brutto</div>
                  <div>Fällig</div>
                  <div />
                </div>
                {raten.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 84px 120px 150px 34px',
                      gap: 10,
                      padding: '8px 14px',
                      borderBottom: '0.5px solid var(--border)',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      className="input"
                      value={r.label}
                      onChange={(e) => updRate(r.id, { label: e.target.value })}
                      style={{ height: 32 }}
                    />
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        type="number"
                        value={r.prozent}
                        onChange={(e) =>
                          updRate(r.id, { prozent: Number(e.target.value) || 0 })
                        }
                        style={{ textAlign: 'right', paddingRight: 22, height: 32 }}
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
                        %
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
                      {formatEurBetrag(rateBrutto(r))}
                    </div>
                    <input
                      className="input"
                      type="date"
                      value={r.faellig}
                      onChange={(e) => updRate(r.id, { faellig: e.target.value })}
                      style={{ height: 32, fontSize: 12 }}
                    />
                    <MockBtn
                      sm
                      kind="ghost"
                      icon="trash"
                      title="Entfernen"
                      onClick={() => rmRate(r.id)}
                    />
                  </div>
                ))}
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
                    onClick={addRate}
                  >
                    <MockIcon ctx="default" n="plus" size={13} /> Abschlag hinzufügen
                  </button>
                  <div style={{ flex: 1 }} />
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color:
                        prozentSumme === 100
                          ? 'var(--green)'
                          : 'var(--danger, #c0392b)',
                    }}
                  >
                    Summe {prozentSumme}%
                    {prozentSumme !== 100 ? ' · muss 100% sein' : ''}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: 16,
                  border: '0.5px solid var(--border)',
                  borderRadius: 10,
                  background: 'var(--bg-soft)',
                  fontSize: 13,
                  color: 'var(--text-2)',
                }}
              >
                Der Gesamtbetrag von <b>{formatEurBetrag(brutto)}</b> brutto wird als eine Rechnung
                gestellt.
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
            </div>
          )}
        </>
      ) : null}

      {step === 3 ? (
        <>
          {istPlan ? (
            <>
              <div
                className="section-h"
                style={{
                  marginBottom: 8,
                  textTransform: 'none',
                  letterSpacing: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                Welche Rechnung jetzt erstellen?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {raten.map((r) => {
                  const on = aktivRate === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAktivRate(r.id)}
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
                        }}
                      >
                        {on ? <MockIcon ctx="btn" n="check" size={11} /> : null}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                          {r.prozent}% · fällig {formatDateDe(r.faellig)}
                        </div>
                      </div>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatEurBetrag(rateBrutto(r))}
                      </b>
                    </button>
                  )
                })}
              </div>
            </>
          ) : null}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
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
            Versandweg
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 18,
            }}
          >
            {wege.map((w) => {
              const on = versandweg === w.key
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setVersandweg(w.key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    padding: '12px',
                    border: `1px solid ${on ? 'var(--green)' : 'var(--border)'}`,
                    background: on ? 'var(--green-50)' : 'var(--card)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <MockIcon
                    ctx="default"
                    n={w.icon}
                    size={18}
                    style={{ color: on ? 'var(--green)' : 'var(--text-2)' }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{w.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.35 }}>
                    {w.sub}
                  </div>
                </button>
              )
            })}
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
            Steuerliche Hinweise
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
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

          <div className="form-grid form-grid--sheet" style={{ marginBottom: 16 }}>
            <MockField label="Rechnungstitel" full>
              <input className="input" value={rTitel} readOnly />
            </MockField>
            <MockField label="Empfänger">
              <input className="input" value={kundeName} readOnly />
            </MockField>
            <MockField label="Fällig am">
              <input
                className="input"
                type="date"
                value={rFaellig}
                readOnly={istPlan}
                onChange={
                  istPlan
                    ? undefined
                    : (e) => applyZahlfrist('datum', e.target.value)
                }
              />
            </MockField>
            <MockField label="Einleitung" full>
              <textarea
                className="input ta"
                rows={3}
                value={einleitung}
                onChange={(e) => setEinleitung(e.target.value)}
              />
            </MockField>
          </div>

          <div className="mail-preview" style={{ maxWidth: 720, margin: '0 auto' }}>
            <div className="mail-h" style={{ padding: '14px 18px' }}>
              <div className="brand">{brand}</div>
              <div className="subj">
                {previewNr} · {rTitel}
              </div>
            </div>
            <div className="mail-body">
              <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{einleitung}</p>
              {istPlan ? (
                <div
                  style={{
                    margin: '14px 0',
                    border: '0.5px solid var(--border)',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  {raten.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderBottom: '0.5px solid var(--border)',
                        fontSize: 12,
                        background: r.id === aktivRate ? 'var(--green-50)' : 'transparent',
                      }}
                    >
                      <span>
                        {r.label}
                        {r.id === aktivRate ? ' · diese Rechnung' : ''} · fällig{' '}
                        {formatDateDe(r.faellig)}
                      </span>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatEurBetrag(rateBrutto(r))}
                      </b>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    margin: '14px 0',
                    border: '0.5px solid var(--border)',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  {posBoardLines.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderBottom: '0.5px solid var(--border)',
                        fontSize: 12,
                      }}
                    >
                      <span>
                        {p.name || '—'} · {p.menge} {p.einheit}
                      </span>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatEurBetrag(posBoardLineNetto(p))}
                      </b>
                    </div>
                  ))}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '6px 2px',
                }}
              >
                <span>{istPlan ? 'Dieser Rechnungsbetrag' : 'Rechnungsbetrag'}</span>
                <span style={{ color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatEurBetrag(rBrutto)}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                Fällig am {formatDateDe(rFaellig)}
                {istPlan ? ` · Teil eines Zahlplans über ${formatEurBetrag(brutto)}` : ''}
              </div>
              {meta.hinweis_35a ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: 'var(--bg-soft)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 11.5,
                    color: 'var(--text-2)',
                  }}
                >
                  <b>Hinweis nach §35a EStG:</b> Im Rechnungsbetrag sind Lohn-/Arbeitskosten in Höhe
                  von {formatEurBetrag(lohnAnteil)} enthalten. Diese sind für haushaltsnahe
                  Handwerkerleistungen steuerlich begünstigt.
                </div>
              ) : null}
              {meta.reverse_charge_13b ? (
                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    background: 'var(--bg-soft)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 6,
                    fontSize: 11.5,
                    color: 'var(--text-2)',
                  }}
                >
                  <b>Steuerschuldnerschaft des Leistungsempfängers (§13b UStG):</b> Die Umsatzsteuer
                  wird nicht gesondert ausgewiesen; die Steuer schuldet der Leistungsempfänger
                  (Reverse-Charge).
                </div>
              ) : null}
              {anlagenCount > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '0.5px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-3)',
                      alignSelf: 'center',
                      marginRight: 2,
                    }}
                  >
                    Anlagen:
                  </span>
                  {ANLAGEN_DEF.filter((a) => anlagen[a.key]).map((a) => (
                    <span
                      key={a.key}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        padding: '3px 9px',
                        borderRadius: 20,
                        background: 'var(--bg-soft)',
                        border: '0.5px solid var(--border)',
                      }}
                    >
                      <MockIcon ctx="default" n="file-text" size={11} />
                      {a.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mail-foot">
              {brand} · an {kundeName}
            </div>
          </div>
        </>
      ) : null}
    </WizardShell>
  )

  return createPortal(wizard, document.body)
}
