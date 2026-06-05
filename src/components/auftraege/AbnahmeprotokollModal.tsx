'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { AuftragBaustelleScreen } from '@/components/auftraege/AuftragBaustelleScreen'
import { AbnahmeprotokollChecklist } from '@/components/auftraege/AbnahmeprotokollChecklist'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  getAbnahmeprotokollMailDefaults,
  loadAbnahmeprotokollSummary,
  previewAbnahmeprotokollMail,
  saveAbnahmeprotokollDraft,
  saveAbnahmeprotokollPdfOnly,
  saveAndSendAbnahmeprotokoll,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import {
  buildAbnahmePunkteInitial,
  maengelAusPunkten,
  type AbnahmeMangel,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { downloadPdfFromBase64 } from '@/lib/download-pdf-base64'
import { looksLikeHtml, richTextToPlain } from '@/lib/rich-text'
import type { AngebotPosition, AuftragPosition, Gewerk } from '@/lib/types'
import { cn } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'

const STEPS = ['Checkliste', 'Vor Ort', 'Mängel', 'Abschluss'] as const

function sanitizeGeladenePunkte(punkte: AbnahmePunkt[]): AbnahmePunkt[] {
  return punkte.map((p) => {
    const raw = p.beschreibung ?? ''
    if (!raw || !looksLikeHtml(raw)) return p
    return { ...p, beschreibung: richTextToPlain(raw) }
  })
}

export function AbnahmeprotokollModal({
  open,
  onClose,
  auftragId,
  positionen,
  angebotPositionen,
  gewerke = [],
  kundeName,
  onDone,
  presentation = 'modal',
  initialStep = 1,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  positionen: AuftragPosition[]
  angebotPositionen?: AngebotPosition[] | null
  gewerke?: Pick<Gewerk, 'id' | 'name' | 'slug'>[]
  kundeName: string
  onDone: () => void
  presentation?: 'modal' | 'flow'
  initialStep?: 1 | 2 | 3 | 4
}) {
  const active = presentation === 'flow' || open
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep)
  const [pending, startTransition] = useTransition()
  const [punkte, setPunkte] = useState<AbnahmePunkt[]>([])
  const [maengel, setMaengel] = useState<AbnahmeMangel[]>([])
  const [abnahmeDatum, setAbnahmeDatum] = useState(heuteYmd())
  const [notizen, setNotizen] = useState('')
  const [anrede, setAnrede] = useState<'du' | 'sie'>('sie')
  const [betreff, setBetreff] = useState('')
  const [nachricht, setNachricht] = useState('')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const prevStepRef = useRef<1 | 2 | 3 | 4>(1)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const mangelPunkte = useMemo(() => punkte.filter((p) => p.status === 'mangel'), [punkte])

  useEffect(() => {
    if (!active) return
    setLoading(true)
    setStep(initialStep)
    setPreviewHtml(null)
    void (async () => {
      const saved = await loadAbnahmeprotokollSummary(auftragId)
      if (saved?.punkte.length) {
        setPunkte(sanitizeGeladenePunkte(saved.punkte))
        setMaengel(saved.maengel)
        setAbnahmeDatum(saved.abnahme_datum?.slice(0, 10) || heuteYmd())
        setNotizen(saved.notizen ?? '')
      } else {
        setPunkte(
          buildAbnahmePunkteInitial({
            positionen,
            angebotPositionen,
            gewerke,
          })
        )
        setMaengel([])
        setAbnahmeDatum(heuteYmd())
        setNotizen('')
      }
      const mail = await getAbnahmeprotokollMailDefaults(auftragId)
      if (mail.ok) {
        setAnrede(mail.defaultAnrede)
        setBetreff(mail.defaultBetreff)
        setNachricht(mail.defaultNachricht)
      }
      setLoading(false)
    })()
  }, [active, positionen, angebotPositionen, gewerke, auftragId, initialStep])

  useEffect(() => {
    if (step === 3 && prevStepRef.current !== 3) {
      setMaengel((prev) => {
        const fresh = maengelAusPunkten(punkte)
        if (!prev.length) return fresh
        const byId = new Map(prev.map((m) => [m.punkt_id, m]))
        return fresh.map((f) => {
          const old = byId.get(f.punkt_id)
          if (!old) return f
          return {
            ...f,
            beschreibung: old.beschreibung,
            frist: old.frist,
            foto_urls: old.foto_urls?.length ? old.foto_urls : f.foto_urls,
          }
        })
      })
    }
    prevStepRef.current = step
  }, [step, punkte])

  async function uploadFoto(files: FileList | null) {
    if (!files?.length || !uploadTarget) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, 3)) {
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
      const id = uploadTarget
      setPunkte((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, foto_urls: [...(p.foto_urls ?? []), ...urls].slice(0, 8) }
            : p
        )
      )
      setMaengel((prev) =>
        prev.map((m) =>
          m.punkt_id === id
            ? { ...m, foto_urls: [...(m.foto_urls ?? []), ...urls].slice(0, 8) }
            : m
        )
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      setUploadTarget(null)
    }
  }

  function speichernDraft(onSuccess?: () => void) {
    startTransition(async () => {
      const r = await saveAbnahmeprotokollDraft({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: maengelAusPunkten(punkte),
        notizen,
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Abnahme gespeichert')
        onDone()
        onSuccess?.()
      }
    })
  }

  function downloadPdf() {
    startTransition(async () => {
      const r = await saveAbnahmeprotokollPdfOnly({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: step >= 3 ? maengel : maengelAusPunkten(punkte),
        notizen,
      })
      if (!r.ok) toast.error(r.message)
      else {
        downloadPdfFromBase64(r.pdfBase64, r.filename)
        toast.success('PDF erstellt')
        onDone()
      }
    })
  }

  function senden() {
    if (!betreff.trim() || !nachricht.trim()) {
      toast.error('Bitte Betreff und Nachricht ausfüllen.')
      return
    }
    startTransition(async () => {
      const r = await saveAndSendAbnahmeprotokoll({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel,
        notizen,
        betreff,
        nachricht,
        anrede,
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Abnahmeprotokoll gesendet')
        onDone()
        onClose()
      }
    })
  }

  const footer = (
    <div className="flex flex-wrap justify-between gap-2">
      <div className="flex gap-2">
        {step > 1 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}>
            Zurück
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Abbrechen
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {step === 2 ? (
          <Button type="button" variant="secondary" size="sm" loading={pending} onClick={() => speichernDraft()}>
            Zwischenspeichern
          </Button>
        ) : null}
        {step < 4 ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              if (step === 1 && punkte.every((p) => !p.beschreibung.trim())) {
                toast.error('Bitte mindestens einen Checkpunkt beschreiben.')
                return
              }
              if (step === 2 && mangelPunkte.length === 0) setStep(4)
              else setStep((step + 1) as 2 | 3 | 4)
            }}
          >
            Weiter
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" size="sm" loading={pending} onClick={downloadPdf}>
              PDF herunterladen
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() => speichernDraft(() => onClose())}
            >
              Ohne E-Mail speichern
            </Button>
            <Button type="button" variant="primary" size="sm" loading={pending} onClick={senden}>
              An Kunden senden
            </Button>
          </>
        )}
      </div>
    </div>
  )

  const body = loading ? (
    <p className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
      Abnahmeprotokoll wird geladen…
    </p>
  ) : (
    <>
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        onChange={(e) => {
          if (uploadTarget && e.target.files?.length) void uploadFoto(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="abnahme-steps mb-4 flex flex-wrap gap-2 text-[11px] font-medium">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={cn(
              'rounded-full px-2.5 py-1',
              step === i + 1 ? 'bg-bw-primary text-white' : 'bg-bw-hover text-bw-text-muted'
            )}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <div>
          <p className="mb-3 text-sm text-bw-text-muted">
            Gewerke und Leistungen vom Auftrag — Checkpunkte anpassen, ergänzen oder entfernen.
          </p>
          <AbnahmeprotokollChecklist punkte={punkte} onChange={setPunkte} mode="edit" />
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <p className="mb-3 text-sm font-medium text-bw-text">
            Vor-Ort-Abnahme für <strong>{kundeName}</strong>
          </p>
          <p className="mb-3 text-sm text-bw-text-muted">
            Punkte abhaken (OK / Mangel / Offen). Änderungen mit „Zwischenspeichern“ sichern.
          </p>
          <AbnahmeprotokollChecklist
            punkte={punkte}
            onChange={setPunkte}
            mode="vorort"
            uploading={uploading}
            onFotoClick={(id) => {
              setUploadTarget(id)
              fileRef.current?.click()
            }}
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          {mangelPunkte.length === 0 ? (
            <p className="text-sm text-bw-text-muted">Keine Mängel markiert — weiter zum Abschluss.</p>
          ) : (
            maengel.map((m, idx) => {
              const punkt = punkte.find((p) => p.id === m.punkt_id)
              return (
                <div key={m.punkt_id} className="abnahme-punkt-card border-red-200 bg-red-50/40">
                  <p className="text-[13px] font-semibold text-bw-text">{punkt?.beschreibung ?? 'Mangel'}</p>
                  <p className="text-[11px] text-bw-text-muted">
                    {punkt?.gewerk}
                    {punkt?.leistung_name ? ` · ${punkt.leistung_name}` : ''}
                  </p>
                  <Textarea
                    label="Beschreibung"
                    className="mt-2"
                    rows={2}
                    value={m.beschreibung}
                    onChange={(e) => {
                      const next = [...maengel]
                      next[idx] = { ...m, beschreibung: e.target.value }
                      setMaengel(next)
                    }}
                  />
                  <Input
                    label="Frist zur Behebung"
                    type="date"
                    className="mt-2"
                    value={m.frist?.slice(0, 10) ?? ''}
                    onChange={(e) => {
                      const next = [...maengel]
                      next[idx] = { ...m, frist: e.target.value || null }
                      setMaengel(next)
                    }}
                  />
                </div>
              )
            })
          )}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-bw-border bg-bw-hover/50 px-3 py-2 text-[13px] text-bw-text-muted">
            Tipp: „Ohne E-Mail speichern“ — der Versand an den Kunden erfolgt gesammelt in der
            Abschlussdokumentation (zusammen mit Rechnung).
          </p>
          <Input
            label="Datum der Abnahme"
            type="date"
            value={abnahmeDatum}
            onChange={(e) => setAbnahmeDatum(e.target.value)}
          />
          <Textarea
            label="Notizen"
            plain
            rows={4}
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            placeholder="Zusätzliche Anmerkungen zur Abnahme…"
          />

          <div className="space-y-2 rounded-md border border-bw-border bg-bw-bg-soft/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">E-Mail an Kunden (optional)</p>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={anrede === 'sie'} onChange={() => setAnrede('sie')} />
                Sie
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={anrede === 'du'} onChange={() => setAnrede('du')} />
                Du
              </label>
            </div>
            <Input label="Betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} />
            <Textarea label="Nachricht" plain rows={4} value={nachricht} onChange={(e) => setNachricht(e.target.value)} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                startTransition(async () => {
                  const r = await previewAbnahmeprotokollMail({ auftragId, betreff, nachricht, anrede })
                  if (!r.ok) toast.error(r.message)
                  else setPreviewHtml(r.html)
                })
              }}
            >
              Mail-Vorschau
            </Button>
            {previewHtml ? (
              <div
                className="max-h-48 overflow-auto rounded border border-bw-border bg-white p-2 text-xs"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )

  if (presentation === 'flow') {
    return (
      <AuftragBaustelleScreen auftragId={auftragId} title="Abnahmeprotokoll" footer={footer}>
        {body}
      </AuftragBaustelleScreen>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Abnahmeprotokoll" size="lg" footer={footer}>
      {body}
    </Modal>
  )
}
