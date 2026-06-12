'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Save,
  Send,
  X,
} from 'lucide-react'
import { AppFlowScreen, WizardMobileToolbar } from '@/components/layout/app'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { AngebotWizardPositionenByGewerk } from '@/components/angebote/AngebotWizardPositionenByGewerk'
import { AngebotWizardVersandEmpfaengerCard } from '@/components/angebote/AngebotWizardVersandEmpfaengerCard'
import { RechnungWizardDetailsCard } from '@/components/rechnungen/RechnungWizardDetailsCard'
import { RechnungWizardZahlungCard } from '@/components/rechnungen/RechnungWizardZahlungCard'
import { KundenStammdatenCard } from '@/components/kunden/KundenStammdatenCard'
import { KundeModal } from '@/components/kunden/KundeModal'
import {
  finalizeRechnungWizardWithoutMail,
  saveRechnungWizardDraft,
  sendRechnungWizard,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import type { RechnungWizardBootstrap, RechnungWizardMeta } from '@/lib/rechnungen/rechnung-wizard-types'
import { angebotPositionenToWizardZeilen } from '@/lib/angebote/wizard-positionen-laden'
import {
  angebotPositionenToDokumentZeilen,
  dokumentZeilenToAngebotPositionen,
  formatEurBetrag,
  type DokumentArtikelZeile,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { kundeRechnungsempfaengerAusStammdaten } from '@/lib/kunde-rechnungsempfaenger'
import { kannHinweis35aAngebot } from '@/lib/angebote/angebot-rechtshinweise'
import {
  berechneRechnung,
  kundeKannReverseCharge13b,
  parseKleinunternehmerSetting,
} from '@/lib/rechnung-berechnung'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import { isValidEmail } from '@/lib/email-recipients'
import { defaultFirmenEinstellungen, type FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { cn } from '@/lib/utils'
import {
  berechneZahlungsplan,
  naechsteOffeneAbschlagZeile,
  rechnungArtFuerZeile,
  rechnungBerechnungFuerListe,
  zahlungsplanVorlage50_50,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import type { Gewerk, Kunde, Preisliste } from '@/lib/types'

function addDaysIso(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function gesamtNettoFromBootstrap(bootstrap: RechnungWizardBootstrap): number {
  if (bootstrap.abschlag?.gesamtNetto) return bootstrap.abschlag.gesamtNetto
  const pos = normalizeAngebotPositionen(bootstrap.positionen)
  let netto = 0
  for (const p of pos) {
    if (p.gewerk_slug === '__freitext__' && p.leistung === 'abschlag') continue
    netto += (p.lohn_netto + p.material_netto) * (p.menge || 1)
  }
  return netto
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

export function RechnungWizard({
  bootstrap,
  gewerke,
  preislisten,
  firm: firmProp,
  zahlungszielTage = 14,
  onClose,
  onDone,
}: {
  bootstrap: RechnungWizardBootstrap
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm?: FirmenEinstellungen
  zahlungszielTage?: number
  onClose: () => void
  onDone?: (rechnungId: string) => void
}) {
  const router = useRouter()
  const firm = firmProp ?? defaultFirmenEinstellungen()
  const modus = bootstrap.modus ?? 'voll'
  const rechnungenAbschlag = bootstrap.rechnungenAbschlag ?? []
  const [zahlungsplan, setZahlungsplan] = useState<Zahlungsplan>(
    () => bootstrap.zahlungsplan?.zeilen.length ? bootstrap.zahlungsplan : zahlungsplanVorlage50_50()
  )
  const gesamtNettoBasis =
    bootstrap.gesamtNetto ??
    bootstrap.abschlag?.gesamtNetto ??
    gesamtNettoFromBootstrap(bootstrap)
  const [kunde, setKunde] = useState(bootstrap.kunde)
  const [stammdatenModalOpen, setStammdatenModalOpen] = useState(false)
  const [mailTo, setMailTo] = useState<string[]>(() => {
    const e = bootstrap.kunde?.email?.trim()
    return e && isValidEmail(e) ? [e] : []
  })
  const [mailCc, setMailCc] = useState<string[]>([])
  const mailRecipientsInitRef = useRef(false)

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
  const [meta, setMeta] = useState<RechnungWizardMeta>(() => {
    const m = bootstrap.meta
    if (modus === 'abschlag' && m.zahlungsart !== 'abschlaege') {
      return { ...m, zahlungsart: 'abschlaege' }
    }
    return m
  })
  const istAbschlag = meta.zahlungsart === 'abschlaege'
  const [rechnungId, setRechnungId] = useState<string | null>(bootstrap.rechnungId)
  const [rechnungsnummer, setRechnungsnummer] = useState(
    bootstrap.rechnungsnummer?.trim() || 'Entwurf'
  )
  const [saving, setSaving] = useState(false)
  const [draftDirty, setDraftDirty] = useState(() => !bootstrap.rechnungId)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() =>
    bootstrap.rechnungId ? new Date() : null
  )
  const savedSnapshotRef = useRef<string | null>(null)

  const draftSnapshot = useMemo(() => JSON.stringify({ zeilen, meta }), [zeilen, meta])

  useEffect(() => {
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = draftSnapshot
      return
    }
    setDraftDirty(draftSnapshot !== savedSnapshotRef.current)
  }, [draftSnapshot])

  const rechnungsempfaenger = useMemo(
    () => kundeRechnungsempfaengerAusStammdaten(kunde),
    [kunde]
  )

  const kleinunternehmer = parseKleinunternehmerSetting(firm.kleinunternehmer)
  const defaultMwst = Math.max(0, parseInt(firm.mwst_satz, 10) || DEFAULT_MWST_SATZ)
  const positionenBerechnet = useMemo(
    () => dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke),
    [zeilen, firm, gewerke]
  )
  const berechnung = useMemo(
    () =>
      berechneRechnung(positionenBerechnet, {
        kleinunternehmer,
        reverseCharge13b: meta.reverse_charge_13b,
        defaultMwstSatz: defaultMwst,
      }),
    [positionenBerechnet, kleinunternehmer, meta.reverse_charge_13b, defaultMwst]
  )

  const hinweis35aErlaubt = kannHinweis35aAngebot(kunde?.typ, firm, berechnung.lohn_netto)
  const zeigt13b = kundeKannReverseCharge13b(kunde?.typ)

  const aktuelleAbschlagZeile = useMemo(() => {
    if (!istAbschlag || gesamtNettoBasis <= 0) return null
    const kontext = berechneZahlungsplan(zahlungsplan, gesamtNettoBasis)
    const rechnungenFuerPlan = rechnungenAbschlag.filter((r) => r.id !== rechnungId)
    return (
      kontext.zeilen.find((z) => z.id === meta.abschlag_zeile_id) ??
      naechsteOffeneAbschlagZeile(zahlungsplan, kontext, rechnungenFuerPlan)
    )
  }, [
    istAbschlag,
    zahlungsplan,
    gesamtNettoBasis,
    meta.abschlag_zeile_id,
    rechnungenAbschlag,
    rechnungId,
  ])

  const berechnungListe = useMemo(() => {
    if (!istAbschlag || !aktuelleAbschlagZeile) return berechnung
    const art = rechnungArtFuerZeile(aktuelleAbschlagZeile)
    return rechnungBerechnungFuerListe(berechnung, aktuelleAbschlagZeile, art)
  }, [berechnung, istAbschlag, aktuelleAbschlagZeile])

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const persistDraft = useCallback(
    async (opts?: { notify?: boolean }): Promise<string | null> => {
      const artikel = zeilen.filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      if (!artikel.length) {
        toast.error('Mindestens eine Position erforderlich.')
        return null
      }
      if (artikel.some((z) => !z.bezeichnung.trim())) {
        toast.error('Bitte bei allen Positionen eine Bezeichnung eintragen.')
        return null
      }
      if (!meta.rechnungsdatum || !meta.faellig_am) {
        toast.error('Rechnungsdatum und Fälligkeit sind Pflicht.')
        return null
      }

      setSaving(true)
      const res = await saveRechnungWizardDraft({
        rechnungId,
        auftrag_id: bootstrap.auftragId,
        angebot_id: bootstrap.angebotId,
        kunde_id: bootstrap.kundeId,
        positionen: positionenBerechnet,
        meta,
        modus: istAbschlag ? 'abschlag' : modus,
        abschlag:
          istAbschlag && aktuelleAbschlagZeile
            ? {
                zeileId: aktuelleAbschlagZeile.id,
                zeileIndex: aktuelleAbschlagZeile.index,
                rechnungArt:
                  rechnungArtFuerZeile(aktuelleAbschlagZeile) === 'schluss'
                    ? ('schluss' as const)
                    : ('abschlag' as const),
              }
            : null,
        zahlungsplan: istAbschlag ? zahlungsplan : null,
        zahlungsplanSpeichern: istAbschlag && Boolean(zahlungsplan.zeilen.length),
      })
      setSaving(false)
      if (!res.ok) {
        toast.error(res.message)
        return null
      }
      setRechnungId(res.rechnungId)
      if (res.rechnungsnummer?.trim()) setRechnungsnummer(res.rechnungsnummer.trim())
      savedSnapshotRef.current = draftSnapshot
      setDraftDirty(false)
      setLastSavedAt(new Date())
      if (opts?.notify) {
        toast.success(
          res.rechnungsnummer?.trim()
            ? `Entwurf gespeichert (${res.rechnungsnummer.trim()})`
            : 'Entwurf gespeichert'
        )
      }
      return res.rechnungId
    },
    [
      zeilen,
      meta,
      rechnungId,
      bootstrap.auftragId,
      bootstrap.angebotId,
      bootstrap.kundeId,
      positionenBerechnet,
      draftSnapshot,
      modus,
      istAbschlag,
      aktuelleAbschlagZeile,
      zahlungsplan,
    ]
  )

  async function handleWeiter() {
    if (step === 1) {
      const artikel = zeilen.filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
      if (!artikel.length) {
        toast.error('Bitte mindestens eine Position anlegen.')
        return
      }
      if (artikel.some((z) => !z.bezeichnung.trim())) {
        toast.error('Bitte bei allen Positionen eine Bezeichnung eintragen.')
        return
      }
    }
    if (step === 2 && istAbschlag && !meta.abschlag_zeile_id) {
      toast.error('Bitte wählen, welchen Abschlag diese Rechnung stellt.')
      return
    }
    const id = await persistDraft({ notify: true })
    if (!id) return
    setStep((s) => Math.min(3, s + 1))
  }

  async function handlePdf() {
    const id = rechnungId ?? (await persistDraft())
    if (!id) return
    try {
      const res = await fetch('/api/rechnung-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rechnungId: id }),
      })
      if (!res.ok) {
        let msg = await res.text()
        try {
          const j = JSON.parse(msg) as { error?: string }
          if (j.error) msg = j.error
        } catch {
          /* noop */
        }
        toast.error(msg || 'PDF konnte nicht erzeugt werden')
        return
      }
      const blob = await res.blob()
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u
      a.download = `Rechnung_${rechnungsnummer.replace(/\s+/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(u)
      toast.success('PDF heruntergeladen')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download fehlgeschlagen')
    }
  }

  async function handleSend() {
    if (!mailTo.length) {
      toast.error('Bitte mindestens eine E-Mail-Adresse angeben.')
      return
    }
    const id = await persistDraft()
    if (!id) return
    setSaving(true)
    const res = await sendRechnungWizard({
      rechnungId: id,
      mailTo,
      mailCc,
    })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success('Rechnung versendet')
    onDone?.(id)
    onClose()
    router.refresh()
  }

  async function handleSaveWithoutMail() {
    const id = await persistDraft()
    if (!id) return
    setSaving(true)
    const res = await finalizeRechnungWizardWithoutMail(id)
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success(
      res.rechnungsnummer
        ? `Rechnung ${res.rechnungsnummer} gespeichert (ohne Versand)`
        : 'Rechnung gespeichert (ohne Versand)'
    )
    onDone?.(id)
    onClose()
    router.refresh()
  }

  const previewSrc = rechnungId
    ? `/api/rechnung-pdf?rechnungId=${encodeURIComponent(rechnungId)}&preview=html`
    : null

  const pdfName = `Rechnung-${rechnungsnummer}.pdf`
  const projektTitel = bootstrap.projektTitel?.trim() || bootstrap.auftragsReferenz
  const wizardTitel = istAbschlag
    ? aktuelleAbschlagZeile?.istSchluss
      ? 'Schlussrechnung erstellen'
      : `Abschlag ${aktuelleAbschlagZeile?.index ?? ''} erstellen`.trim()
    : 'Rechnung erstellen'

  useEffect(() => {
    if (step !== 3) return
    if (mailRecipientsInitRef.current) return
    const e = (rechnungsempfaenger.email || '').trim()
    if (e && isValidEmail(e)) setMailTo([e])
    setMailCc([])
    mailRecipientsInitRef.current = true
  }, [step, rechnungsempfaenger.email])

  if (!mounted || typeof document === 'undefined') return null

  const wizardMobileActions =
    step < 3 ? (
      <>
        {step > 1 ? (
          <Button
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
          variant="secondary"
          size="sm"
          className="wizard-mobile-toolbar__save shrink-0 px-2.5"
          disabled={saving}
          onClick={() => void persistDraft({ notify: true })}
          aria-label="Speichern"
        >
          <Save className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          size="sm"
          className="wizard-mobile-toolbar__next shrink-0 gap-1 px-2.5"
          disabled={saving}
          onClick={() => void handleWeiter()}
        >
          Weiter
          <ChevronRight className="h-4 w-4" />
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="secondary"
          size="sm"
          className="wizard-mobile-toolbar__save shrink-0 px-2"
          disabled={saving}
          onClick={() => void handleSaveWithoutMail()}
          aria-label="Ohne E-Mail speichern"
        >
          <Save className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          size="sm"
          className="wizard-mobile-toolbar__next shrink-0 gap-1 px-2.5"
          disabled={saving}
          onClick={() => void handleSend()}
        >
          <Send className="h-4 w-4" />
          Senden
        </Button>
      </>
    )

  const wizardHeader = (
    <>
      <WizardMobileToolbar
        onClose={onClose}
        totalSteps={3}
        currentStep={step}
        stepLabel={`Schritt ${step}`}
        actions={wizardMobileActions}
      />
      <div className="wizard-header-desktop hidden md:flex md:min-w-0 md:flex-1 md:items-center md:gap-4">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Schließen">
        <X className="h-4 w-4" />
      </button>
      <div className="h-6 w-px bg-bw-border" aria-hidden />
      <div className="title-block min-w-0">
        <div className="ttl">{wizardTitel}</div>
        <div className="sub">
          {projektTitel}
          {bootstrap.auftragsReferenz ? ` · ${bootstrap.auftragsReferenz}` : ''}
        </div>
      </div>
      <div className="flex-1" />
      <div className="stepper" role="navigation" aria-label="Fortschritt">
        <Step n={1} label="Leistungen" active={step === 1} done={step > 1} />
        <ChevronRight className="step-arrow h-3.5 w-3.5" aria-hidden />
        <Step n={2} label="Finalisieren" active={step === 2} done={step > 2} />
        <ChevronRight className="step-arrow h-3.5 w-3.5" aria-hidden />
        <Step n={3} label="Versenden" active={step === 3} done={false} />
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {step > 1 ? (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </Button>
        ) : null}
        {step < 3 ? (
          <>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => void persistDraft({ notify: true })}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" aria-hidden />
              Speichern
            </Button>
            <Button disabled={saving} onClick={() => void handleWeiter()} className="gap-1.5">
              Weiter
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => void handleSaveWithoutMail()}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" aria-hidden />
              Ohne E-Mail speichern
            </Button>
            <Button disabled={saving} onClick={() => void handleSend()} className="gap-1.5">
              <Send className="h-4 w-4" aria-hidden />
              An Kunden senden
            </Button>
          </>
        )}
        {lastSavedAt ? (
          <span className={cn('text-xs text-bw-text-muted', draftDirty && 'wizard-save-status--dirty')}>
            Gespeichert {lastSavedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : saving ? (
          <span className="text-xs wizard-save-status--saving">Speichere…</span>
        ) : null}
      </div>
      </div>
    </>
  )

  const wizard = (
    <AppFlowScreen className="wizard-flow" header={wizardHeader}>
      <div className="wizard-inner">
          {step === 1 ? (
            <div className="space-y-4">
              <KundenStammdatenCard
                kunde={kunde as Kunde | null}
                collapsible={false}
                action={
                  kunde ? (
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
              />
              <AngebotWizardPositionenByGewerk
                zeilen={zeilen}
                onChange={setZeilen}
                gewerke={gewerke}
                preislisten={preislisten}
                firm={firm}
                titel="Rechnungspositionen"
                untertitel={
                  istAbschlag
                    ? 'Positionen vom Auftrag — unverändert. Abschlagsplan nur in Schritt 2.'
                    : 'Positionen aus Auftrag/Angebot — bei Bedarf anpassen.'
                }
              />
              <Card title="Summe (Vorschau)">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-bw-text-muted">
                      {istAbschlag && aktuelleAbschlagZeile && !aktuelleAbschlagZeile.istSchluss
                        ? 'Auftrag netto'
                        : 'Netto'}
                    </span>
                    <p className="font-medium tabular-nums">{formatEurBetrag(berechnung.netto)}</p>
                  </div>
                  <div>
                    <span className="text-bw-text-muted">
                      {istAbschlag && aktuelleAbschlagZeile && !aktuelleAbschlagZeile.istSchluss
                        ? 'Auftrag brutto'
                        : 'Brutto'}
                    </span>
                    <p className="font-medium tabular-nums">{formatEurBetrag(berechnung.brutto)}</p>
                  </div>
                  {istAbschlag && aktuelleAbschlagZeile && !aktuelleAbschlagZeile.istSchluss ? (
                    <>
                      <div className="sm:col-span-2 border-t border-bw-border pt-2">
                        <span className="text-bw-text-muted">
                          In Rechnungsliste (Abschlag {aktuelleAbschlagZeile.index})
                        </span>
                        <p className="font-medium tabular-nums text-bw-primary">
                          {formatEurBetrag(berechnungListe.brutto)} brutto
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </Card>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="max-w-2xl space-y-4">
              <RechnungWizardZahlungCard
                meta={meta}
                onMetaChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
                zahlungsplan={zahlungsplan}
                onZahlungsplanChange={setZahlungsplan}
                gesamtNetto={gesamtNettoBasis}
                zahlungszielTage={zahlungszielTage}
                rechnungen={rechnungenAbschlag}
                aktuelleZeile={aktuelleAbschlagZeile}
                rechnungId={rechnungId}
              />
              <RechnungWizardDetailsCard
                meta={meta}
                onMetaChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
                onRechnungsdatumChange={(value) =>
                  setMeta((m) => ({
                    ...m,
                    rechnungsdatum: value,
                    faellig_am: addDaysIso(value, zahlungszielTage),
                  }))
                }
                zeigt13b={zeigt13b}
                hinweis35aErlaubt={hinweis35aErlaubt}
                lohnNettoPdf={berechnung.lohn_netto}
                showMailFields={istAbschlag}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <p className="mb-4 rounded-lg border border-bw-border bg-bw-hover/50 px-3 py-2 text-[13px] text-bw-text-muted">
                Optional: Rechnung ohne E-Mail speichern — der Versand an den Kunden erfolgt gesammelt
                in der Abschlussdokumentation (Abnahmeprotokoll → Rechnung → Abschluss-PDF).
              </p>
              <Card
                title="Rechnungsempfänger"
                action={
                  kunde ? (
                    <button
                      type="button"
                      onClick={() => setStammdatenModalOpen(true)}
                      className="btn btn-ghost btn-sm"
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
                    value={rechnungsempfaenger.email || '—'}
                    link={Boolean(rechnungsempfaenger.email)}
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
                  dokumentLabel="Rechnung"
                />
              </div>

              <Card
                title="Rechnungs-Vorschau"
                flush
                bodyClassName="p-0"
                className="mt-4"
                action={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!rechnungId || saving}
                    onClick={() => void handlePdf()}
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                }
              >
                {previewSrc ? (
                  <iframe
                    src={previewSrc}
                    title="Rechnungs-Vorschau"
                    className="wizard-angebot-preview rounded-none border-0"
                  />
                ) : (
                  <p className="px-4 py-8 text-center text-[13px] text-bw-text-muted">
                    Entwurf wird vorbereitet…
                  </p>
                )}
              </Card>
            </div>
          ) : null}
        </div>

      {kunde ? (
        <KundeModal
          open={stammdatenModalOpen}
          onClose={() => setStammdatenModalOpen(false)}
          editKunde={kunde as Kunde}
          stayOnPage
          onSaved={() => {
            toast.success('Stammdaten gespeichert')
            setStammdatenModalOpen(false)
            router.refresh()
          }}
        />
      ) : null}
    </AppFlowScreen>
  )

  return createPortal(wizard, document.body)
}
