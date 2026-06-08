'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronLeft, ChevronRight, Download, FileText, Save, X } from 'lucide-react'
import { AppFlowScreen, WizardMobileToolbar } from '@/components/layout/app'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  finalizeProjektVertrag,
  saveProjektVertragDraft,
} from '@/app/(dashboard)/vertraege/wizard-actions'
import {
  bauvorhabenAusAuftrag,
  handwerkerAnzeigename,
  leistungsumfangAusPositionen,
  verguetungAusPositionen,
} from '@/lib/vertraege/build-vertrag-texte'
import type { AuftragPosition } from '@/lib/types'
import type { ProjektVertragWizardBootstrap, ProjektVertragWizardMeta } from '@/lib/vertraege/types'
import { cn } from '@/lib/utils'

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

function positionenFuerAuswahl(
  positionen: AuftragPosition[],
  handwerkerId: string,
  gewerkName: string
): AuftragPosition[] {
  const gn = gewerkName.trim().toLowerCase()
  return positionen.filter(
    (p) =>
      p.handwerker_id === handwerkerId ||
      (gn && p.gewerk_name?.trim().toLowerCase() === gn)
  )
}

export function ProjektVertragWizard({
  bootstrap,
  onClose,
  onDone,
}: {
  bootstrap: ProjektVertragWizardBootstrap
  onClose: () => void
  onDone?: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [meta, setMeta] = useState<ProjektVertragWizardMeta>(() => bootstrap.meta)
  const [vertragId, setVertragId] = useState<string | null>(bootstrap.vertrag_id)
  const [vertragsNr, setVertragsNr] = useState(bootstrap.vertrags_nr?.trim() || 'Entwurf')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handwerker = useMemo(
    () => bootstrap.handwerker_optionen.find((h) => h.id === meta.handwerker_id) ?? null,
    [bootstrap.handwerker_optionen, meta.handwerker_id]
  )

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const applyHandwerkerGewerk = useCallback(
    (handwerkerId: string, gewerkName: string, gewerkId: string | null) => {
      const pos = positionenFuerAuswahl(bootstrap.positionen, handwerkerId, gewerkName)
      setMeta((m) => ({
        ...m,
        handwerker_id: handwerkerId,
        gewerk_id: gewerkId,
        gewerk_name: gewerkName,
        bauvorhaben: bauvorhabenAusAuftrag({
          titel: bootstrap.auftrag_titel,
          kunde_adresse: bootstrap.kunde_adresse,
          kunde_plz: bootstrap.kunde_plz,
          kunde_ort: bootstrap.kunde_ort,
          gewerk_name: gewerkName,
        }),
        leistungsumfang: leistungsumfangAusPositionen(pos),
        verguetung_text: verguetungAusPositionen(pos),
      }))
    },
    [bootstrap]
  )

  const persistDraft = useCallback(
    async (opts?: { notify?: boolean }): Promise<string | null> => {
      if (!meta.handwerker_id) {
        toast.error('Bitte Handwerker wählen.')
        return null
      }
      setSaving(true)
      try {
        const res = await saveProjektVertragDraft({
          vertrag_id: vertragId,
          auftrag_id: bootstrap.auftrag_id,
          meta,
        })
        if (!res.ok) {
          toast.error(res.message)
          return null
        }
        setVertragId(res.vertrag_id)
        setVertragsNr(res.vertrags_nr)
        if (opts?.notify) toast.success('Entwurf gespeichert')
        return res.vertrag_id
      } finally {
        setSaving(false)
      }
    },
    [bootstrap.auftrag_id, meta, vertragId]
  )

  const handleWeiter = async () => {
    if (step === 1) {
      if (!meta.handwerker_id) {
        toast.error('Bitte Handwerker wählen.')
        return
      }
      await persistDraft()
      setStep(2)
      return
    }
    if (step === 2) {
      if (!meta.bauvorhaben.trim() || !meta.leistungsumfang.trim()) {
        toast.error('Bauvorhaben und Leistungsumfang ausfüllen.')
        return
      }
      await persistDraft()
      setStep(3)
    }
  }

  const handlePdfErzeugen = async () => {
    setSaving(true)
    try {
      const res = await finalizeProjektVertrag({
        vertrag_id: vertragId,
        auftrag_id: bootstrap.auftrag_id,
        meta,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setVertragId(res.vertrag_id)
      setVertragsNr(res.vertrags_nr)
      setPdfUrl(res.pdf_url)
      toast.success('Vertrag als PDF erzeugt und hochgeladen')
      onDone?.()
    } finally {
      setSaving(false)
    }
  }

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
      <Button
        size="sm"
        className="wizard-mobile-toolbar__next shrink-0 gap-1 px-2.5"
        disabled={saving}
        onClick={() => void handlePdfErzeugen()}
      >
        <FileText className="h-4 w-4" />
        PDF erzeugen
      </Button>
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
          <div className="ttl">Nachunternehmervertrag</div>
          <div className="sub">
            {bootstrap.auftrag_titel}
            {vertragsNr !== 'Entwurf' ? ` · ${vertragsNr}` : ''}
          </div>
        </div>
        <div className="flex-1" />
        <div className="stepper" role="navigation" aria-label="Fortschritt">
          <Step n={1} label="Partner" active={step === 1} done={step > 1} />
          <ChevronRight className="step-arrow h-3.5 w-3.5" aria-hidden />
          <Step n={2} label="Inhalt" active={step === 2} done={step > 2} />
          <ChevronRight className="step-arrow h-3.5 w-3.5" aria-hidden />
          <Step n={3} label="PDF" active={step === 3} done={!!pdfUrl} />
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
            <Button disabled={saving} onClick={() => void handlePdfErzeugen()} className="gap-1.5">
              <FileText className="h-4 w-4" aria-hidden />
              PDF erzeugen & hochladen
            </Button>
          )}
        </div>
      </div>
    </>
  )

  const gewerkOptions = [
    { value: '', label: 'Gewerk wählen…' },
    ...bootstrap.gewerk_optionen.map((g) => ({ value: g.name, label: g.name })),
  ]

  const wizard = (
    <AppFlowScreen className="wizard-flow" header={wizardHeader}>
      <div className="wizard-inner max-w-3xl">
        {step === 1 ? (
          <Card title="Partner & Gewerk">
            <div className="space-y-4">
              <Select
                label="Handwerker"
                required
                value={meta.handwerker_id}
                options={[
                  { value: '', label: 'Handwerker wählen…' },
                  ...bootstrap.handwerker_optionen.map((h) => ({
                    value: h.id,
                    label: handwerkerAnzeigename(h),
                  })),
                ]}
                onChange={(e) => {
                  const id = e.target.value
                  const gewerk =
                    bootstrap.gewerk_optionen[0]?.name ??
                    bootstrap.positionen.find((p) => p.handwerker_id === id)?.gewerk_name ??
                    ''
                  const gewerkId =
                    bootstrap.gewerk_optionen.find((g) => g.name === gewerk)?.id ?? null
                  applyHandwerkerGewerk(id, gewerk, gewerkId)
                }}
              />
              <Select
                label="Gewerk"
                value={meta.gewerk_name}
                options={gewerkOptions}
                onChange={(e) => {
                  const name = e.target.value
                  const gewerkId = bootstrap.gewerk_optionen.find((g) => g.name === name)?.id ?? null
                  if (meta.handwerker_id) applyHandwerkerGewerk(meta.handwerker_id, name, gewerkId)
                  else setMeta((m) => ({ ...m, gewerk_name: name, gewerk_id: gewerkId }))
                }}
              />
              {handwerker ? (
                <div className="rounded-lg border border-bw-border bg-bw-hover/40 p-3 text-sm text-bw-text-muted">
                  <p className="font-medium text-bw-text">{handwerkerAnzeigename(handwerker)}</p>
                  {handwerker.adresse ? <p>{handwerker.adresse}</p> : null}
                  {handwerker.telefon ? <p>Tel. {handwerker.telefon}</p> : null}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <Card title="Bauvorhaben & Leistung">
              <div className="space-y-4">
                <Input
                  label="Bauvorhaben"
                  value={meta.bauvorhaben}
                  onChange={(e) => setMeta((m) => ({ ...m, bauvorhaben: e.target.value }))}
                />
                <Textarea
                  label="Leistungsumfang (§2)"
                  rows={4}
                  value={meta.leistungsumfang}
                  onChange={(e) => setMeta((m) => ({ ...m, leistungsumfang: e.target.value }))}
                />
                <Textarea
                  label="Vergütung (§3)"
                  rows={4}
                  value={meta.verguetung_text}
                  onChange={(e) => setMeta((m) => ({ ...m, verguetung_text: e.target.value }))}
                />
              </div>
            </Card>
            <Card title="Vertragskonditionen">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Regiesatz netto (€/h)"
                  type="number"
                  min={0}
                  step={0.5}
                  value={meta.regiesatz_netto ?? ''}
                  onChange={(e) =>
                    setMeta((m) => ({
                      ...m,
                      regiesatz_netto: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
                <Input
                  label="Sicherheitseinbehalt (%)"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={meta.einbehalt_prozent}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, einbehalt_prozent: Number(e.target.value) || 0 }))
                  }
                />
                <Input
                  label="Zahlungsziel (Tage)"
                  type="number"
                  min={1}
                  value={meta.zahlungsziel_tage}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, zahlungsziel_tage: Number(e.target.value) || 14 }))
                  }
                />
                <Input
                  label="Aufmaß-Rhythmus (Tage)"
                  type="number"
                  min={1}
                  value={meta.aufmass_rhythmus_tage}
                  onChange={(e) =>
                    setMeta((m) => ({ ...m, aufmass_rhythmus_tage: Number(e.target.value) || 14 }))
                  }
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Interne Notizen"
                  rows={2}
                  value={meta.notizen}
                  onChange={(e) => setMeta((m) => ({ ...m, notizen: e.target.value }))}
                />
              </div>
            </Card>
          </div>
        ) : null}

        {step === 3 ? (
          <Card title="PDF erzeugen">
            <div className="space-y-4 text-sm">
              <p className="text-bw-text-muted">
                Der Vertrag wird im Bärenwald-Design erzeugt und automatisch in den Auftragsdokumenten
                gespeichert.
              </p>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-bw-text-muted">Vertrags-Nr.</dt>
                  <dd className="font-medium">{vertragsNr}</dd>
                </div>
                <div>
                  <dt className="text-bw-text-muted">Partner</dt>
                  <dd className="font-medium">{handwerker ? handwerkerAnzeigename(handwerker) : '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-bw-text-muted">Bauvorhaben</dt>
                  <dd className="font-medium">{meta.bauvorhaben || '—'}</dd>
                </div>
              </dl>
              {pdfUrl ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm inline-flex gap-1.5"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    PDF öffnen
                  </a>
                  <Button variant="secondary" onClick={onClose}>
                    Schließen
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </AppFlowScreen>
  )

  return createPortal(wizard, document.body)
}
