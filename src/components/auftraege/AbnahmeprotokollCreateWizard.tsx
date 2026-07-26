'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { AppFlowScreen, WizardMobileToolbar } from '@/components/layout/app'
import { AbnahmeprotokollChecklist } from '@/components/auftraege/AbnahmeprotokollChecklist'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { saveAbnahmeprotokollPdfOnly } from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import {
  ABNAHME_ERGEBNIS_LABEL,
  emptyAbnahmeProtokollMeta,
  type AbnahmeErgebnis,
  type AbnahmeProtokollMeta,
} from '@/lib/auftraege/abnahme-protokoll-meta'
import {
  buildAbnahmePunkteInitial,
  filterAbnahmePunkteFuerDokument,
  leistungFuerAbnahmeAusgewaehlt,
  maengelAusPunkten,
  type AbnahmePunkt,
  type AbnahmePunktStatus,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { downloadPdfFromBase64 } from '@/lib/download-pdf-base64'
import type { AngebotPosition, AuftragPosition, Gewerk } from '@/lib/types'
import { cn } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'

const STEP_LABELS = [
  'Übergabe',
  'Personen',
  'Bauvorhaben',
  'Leistungen',
  'Ergebnis',
  'Fotos',
  'PDF',
] as const
const TOTAL_STEPS = STEP_LABELS.length

function WizardStep({
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
      <span className="hidden lg:inline">{label}</span>
    </div>
  )
}

function setLeistungStatus(punkte: AbnahmePunkt[], leistungId: string, status: AbnahmePunktStatus) {
  return punkte.map((p) => {
    const key = p.leistung_id?.trim() || p.id
    if (key !== leistungId) return p
    return { ...p, status }
  })
}

function markAllOk(punkte: AbnahmePunkt[]): AbnahmePunkt[] {
  return punkte.map((p) =>
    p.beschreibung?.trim() ? { ...p, status: 'ok' as const } : p
  )
}

export function AbnahmeprotokollCreateWizard({
  auftragId,
  positionen,
  angebotPositionen,
  gewerke = [],
  kundeName,
  auftragsLabel,
  initialMeta,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  angebotPositionen?: AngebotPosition[] | null
  gewerke?: Pick<Gewerk, 'id' | 'name' | 'slug'>[]
  kundeName: string
  auftragsLabel?: string
  initialMeta?: Partial<AbnahmeProtokollMeta>
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const [punkte, setPunkte] = useState<AbnahmePunkt[]>(() =>
    markAllOk(buildAbnahmePunkteInitial({ positionen, angebotPositionen, gewerke }))
  )
  const [abnahmeDatum, setAbnahmeDatum] = useState(heuteYmd())
  const [notizen, setNotizen] = useState('')
  const [meta, setMeta] = useState<AbnahmeProtokollMeta>(() =>
    emptyAbnahmeProtokollMeta(initialMeta)
  )

  const onClose = () => router.push(`/auftraege/${auftragId}?tab=abnahme`)

  const ausgewaehlt = useMemo(
    () => filterAbnahmePunkteFuerDokument(punkte).length,
    [punkte]
  )

  function patchMeta(patch: Partial<AbnahmeProtokollMeta>) {
    setMeta((m) => ({ ...m, ...patch }))
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!abnahmeDatum.trim()) return 'Bitte Übergabedatum angeben.'
      if (!meta.uebergabe_ort.trim()) return 'Bitte Übergabeort angeben.'
    }
    if (s === 2) {
      if (!meta.vertreter_an.trim()) return 'Bitte Vertreter (Auftragnehmer) angeben.'
    }
    if (s === 3) {
      if (!meta.projektbezeichnung.trim()) return 'Bitte Projektbezeichnung angeben.'
    }
    if (s === 4) {
      if (ausgewaehlt === 0) return 'Mindestens eine Leistung für die Abnahme auswählen (OK).'
    }
    return null
  }

  function weiter() {
    const err = validateStep(step)
    if (err) {
      toast.error(err)
      return
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }

  function zurueck() {
    setStep((s) => Math.max(1, s - 1))
  }

  async function uploadFotos(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      const room = Math.max(0, 4 - meta.uebergabe_foto_urls.length)
      for (const file of Array.from(files).slice(0, room)) {
        const fd = new FormData()
        fd.set('file', file)
        fd.set('filename', file.name)
        const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
        urls.push(json.url)
      }
      patchMeta({
        uebergabe_foto_urls: [...meta.uebergabe_foto_urls, ...urls].slice(0, 4),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function erstellen() {
    const err = validateStep(4) || validateStep(1) || validateStep(2) || validateStep(3)
    if (err) {
      toast.error(err)
      return
    }
    startTransition(async () => {
      const r = await saveAbnahmeprotokollPdfOnly({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: maengelAusPunkten(punkte),
        notizen: notizen.trim() || null,
        meta,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      downloadPdfFromBase64(r.pdfBase64, r.filename)
      toast.success('Abnahmeprotokoll erstellt')
      router.push(`/auftraege/${auftragId}?tab=abnahme`)
      router.refresh()
    })
  }

  const mobileActions =
    step < TOTAL_STEPS ? (
      <Button type="button" variant="primary" size="sm" className="gap-1" onClick={weiter}>
        Weiter
        <ChevronRight className="h-4 w-4" />
      </Button>
    ) : (
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="gap-1"
        loading={pending}
        onClick={erstellen}
      >
        <Check className="h-4 w-4" />
        PDF
      </Button>
    )

  const header = (
    <>
      <WizardMobileToolbar
        onClose={onClose}
        totalSteps={TOTAL_STEPS}
        currentStep={step}
        stepLabel={`Schritt ${step}: ${STEP_LABELS[step - 1]}`}
        actions={mobileActions}
      />
      <div className="wizard-header-desktop hidden md:flex md:min-w-0 md:flex-1 md:items-center md:gap-3">
        <button type="button" className="btn ghost sm" onClick={onClose} aria-label="Schließen">
          <X className="h-4 w-4" />
        </button>
        <div className="h-6 w-px bg-bw-border" aria-hidden />
        <div className="title-block min-w-0 flex-1">
          <div className="ttl">Abnahmeprotokoll</div>
          <div className="sub">
            {auftragsLabel ? `${auftragsLabel} · ` : ''}
            {kundeName}
          </div>
        </div>
        <nav className="stepper overflow-x-auto" aria-label="Fortschritt">
          {STEP_LABELS.map((label, i) => (
            <span key={label} className="inline-flex items-center">
              {i > 0 ? <ChevronRight className="step-arrow mx-0.5 h-3 w-3" aria-hidden /> : null}
              <WizardStep
                n={i + 1}
                label={label}
                active={step === i + 1}
                done={step > i + 1}
              />
            </span>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {step > 1 ? (
            <Button type="button" variant="ghost" size="sm" onClick={zurueck}>
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </Button>
          ) : null}
          {step < TOTAL_STEPS ? (
            <Button type="button" variant="primary" size="sm" className="gap-1.5" onClick={weiter}>
              Weiter
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="gap-1.5"
              loading={pending}
              onClick={erstellen}
            >
              <Check className="h-4 w-4" />
              PDF erstellen
            </Button>
          )}
        </div>
      </div>
    </>
  )

  const leistungGroups = useMemo(() => {
    const map = new Map<string, AbnahmePunkt[]>()
    for (const p of punkte) {
      const key = p.leistung_id?.trim() || p.id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries()).map(([id, pts]) => ({
      id,
      name: pts[0]?.leistung_name || pts[0]?.beschreibung || 'Leistung',
      gewerk: pts[0]?.gewerk || '',
      punkte: pts,
      selected: leistungFuerAbnahmeAusgewaehlt(pts),
    }))
  }, [punkte])

  return (
    <AppFlowScreen className="wizard-flow" header={header}>
      <div className="wizard-inner max-w-2xl">
        {step === 1 ? (
          <div className="wizard-section-gap space-y-4">
            <p className="text-sm text-bw-text-muted">Wann und wo fand die Übergabe statt?</p>
            <Input
              label="Übergabedatum"
              type="date"
              value={abnahmeDatum}
              onChange={(e) => setAbnahmeDatum(e.target.value)}
            />
            <Input
              label="Uhrzeit"
              type="time"
              value={meta.uebergabe_uhrzeit}
              onChange={(e) => patchMeta({ uebergabe_uhrzeit: e.target.value })}
            />
            <Input
              label="Übergabeort"
              value={meta.uebergabe_ort}
              onChange={(e) => patchMeta({ uebergabe_ort: e.target.value })}
              placeholder="PLZ Ort / Stadtteil"
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wizard-section-gap space-y-4">
            <p className="text-sm text-bw-text-muted">Wer war bei der Übergabe dabei?</p>
            <Input
              label="Vertreten durch (Auftragnehmer)"
              value={meta.vertreter_an}
              onChange={(e) => patchMeta({ vertreter_an: e.target.value })}
              placeholder="Name"
            />
            <Input
              label="Ansprechpartner Kunde"
              value={meta.ansprechpartner_kunde}
              onChange={(e) => patchMeta({ ansprechpartner_kunde: e.target.value })}
            />
            <Input
              label="Anwesend bei Übergabe"
              value={meta.anwesend_uebergabe}
              onChange={(e) => patchMeta({ anwesend_uebergabe: e.target.value })}
              placeholder="Optional, dritte Unterschrift"
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="wizard-section-gap space-y-4">
            <p className="text-sm text-bw-text-muted">Angaben zum Bauvorhaben — vorgefüllt, bitte prüfen.</p>
            <Input
              label="Projektbezeichnung"
              value={meta.projektbezeichnung}
              onChange={(e) => patchMeta({ projektbezeichnung: e.target.value })}
            />
            <Input
              label="Projektadresse"
              value={meta.projektadresse}
              onChange={(e) => patchMeta({ projektadresse: e.target.value })}
            />
            <Textarea
              label="Leistungsumfang (Kurz)"
              plain
              rows={4}
              value={meta.leistungsumfang_kurz}
              onChange={(e) => patchMeta({ leistungsumfang_kurz: e.target.value })}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="wizard-section-gap space-y-4">
            <p className="text-sm text-bw-text-muted">
              Leistungen für die Abnahme auf OK setzen. Nicht ausgewählte erscheinen nicht im PDF.
              Detail-Checkliste unten anpassbar.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setPunkte(markAllOk(punkte))}>
                Alle OK
              </Button>
            </div>
            <ul className="space-y-2">
              {leistungGroups.map((g) => (
                <li
                  key={g.id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
                    g.selected ? 'border-bw-green bg-bw-green/5' : 'border-bw-border'
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{g.name}</p>
                    {g.gewerk ? (
                      <p className="text-xs text-bw-text-muted">{g.gewerk}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className={cn('btn sm', g.selected && g.punkte.every((p) => p.status === 'ok') && 'primary')}
                      onClick={() => setPunkte(setLeistungStatus(punkte, g.id, 'ok'))}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'btn sm',
                        g.punkte.some((p) => p.status === 'mangel') && 'primary'
                      )}
                      onClick={() => setPunkte(setLeistungStatus(punkte, g.id, 'mangel'))}
                    >
                      Mangel
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setPunkte(setLeistungStatus(punkte, g.id, 'offen'))}
                    >
                      Weg
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <details className="rounded-lg border border-bw-border p-3">
              <summary className="cursor-pointer text-sm font-medium">Checkpunkte bearbeiten</summary>
              <div className="mt-3">
                <AbnahmeprotokollChecklist punkte={punkte} onChange={setPunkte} mode="edit" />
              </div>
            </details>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="wizard-section-gap space-y-4">
            <p className="text-sm text-bw-text-muted">Abnahmeergebnis und Hinweise.</p>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Ergebnis</legend>
              {(Object.keys(ABNAHME_ERGEBNIS_LABEL) as AbnahmeErgebnis[]).map((key) => (
                <label
                  key={key}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                    meta.abnahme_ergebnis === key
                      ? 'border-bw-green bg-bw-green/5'
                      : 'border-bw-border'
                  )}
                >
                  <input
                    type="radio"
                    name="abnahme_ergebnis"
                    className="mt-1"
                    checked={meta.abnahme_ergebnis === key}
                    onChange={() => patchMeta({ abnahme_ergebnis: key })}
                  />
                  <span>{ABNAHME_ERGEBNIS_LABEL[key]}</span>
                </label>
              ))}
            </fieldset>
            <Textarea
              label="Hinweis (z. B. nicht Vertragsgegenstand)"
              plain
              rows={3}
              value={meta.hinweis_sonstiges}
              onChange={(e) => patchMeta({ hinweis_sonstiges: e.target.value })}
              placeholder="Optional…"
            />
            <Textarea
              label="Interne / weitere Anmerkungen"
              plain
              rows={3}
              value={notizen}
              onChange={(e) => setNotizen(e.target.value)}
            />
          </div>
        ) : null}

        {step === 6 ? (
          <div className="wizard-section-gap space-y-4">
            <p className="text-sm text-bw-text-muted">
              Bis zu 4 Fotos für „Örtliche Situation“ im PDF. Optional — Schritt überspringbar.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void uploadFotos(e.target.files)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading || meta.uebergabe_foto_urls.length >= 4}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Lädt…' : 'Fotos hinzufügen'}
            </Button>
            {meta.uebergabe_foto_urls.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {meta.uebergabe_foto_urls.map((url) => (
                  <button
                    key={url}
                    type="button"
                    className="relative h-20 w-20 overflow-hidden rounded-md border border-bw-border"
                    title="Entfernen"
                    onClick={() =>
                      patchMeta({
                        uebergabe_foto_urls: meta.uebergabe_foto_urls.filter((u) => u !== url),
                      })
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-bw-text-muted">Noch keine Fotos.</p>
            )}
          </div>
        ) : null}

        {step === 7 ? (
          <div className="wizard-section-gap space-y-4">
            <p className="text-sm text-bw-text-muted">
              Kurz prüfen und PDF erzeugen. Rechtshinweise erscheinen im Protokoll.
            </p>
            <ul className="space-y-1 text-sm text-bw-text">
              <li>
                <strong>Übergabe:</strong> {abnahmeDatum}
                {meta.uebergabe_uhrzeit ? ` · ${meta.uebergabe_uhrzeit} Uhr` : ''} ·{' '}
                {meta.uebergabe_ort || '—'}
              </li>
              <li>
                <strong>Vertreter:</strong> {meta.vertreter_an || '—'}
              </li>
              <li>
                <strong>Projekt:</strong> {meta.projektbezeichnung || '—'}
              </li>
              <li>
                <strong>Leistungen im PDF:</strong> {ausgewaehlt} Punkte
              </li>
              <li>
                <strong>Ergebnis:</strong> {ABNAHME_ERGEBNIS_LABEL[meta.abnahme_ergebnis]}
              </li>
              <li>
                <strong>Fotos:</strong> {meta.uebergabe_foto_urls.length}
              </li>
            </ul>
            <Textarea
              label="Weitere Hinweise (Rechtstext)"
              plain
              rows={6}
              value={meta.rechtshinweise}
              onChange={(e) => patchMeta({ rechtshinweise: e.target.value })}
            />
            <Button
              type="button"
              variant="primary"
              className="w-full gap-2 md:w-auto"
              loading={pending}
              onClick={erstellen}
            >
              <Check className="h-4 w-4" />
              Abnahmeprotokoll als PDF erstellen
            </Button>
          </div>
        ) : null}
      </div>
    </AppFlowScreen>
  )
}
