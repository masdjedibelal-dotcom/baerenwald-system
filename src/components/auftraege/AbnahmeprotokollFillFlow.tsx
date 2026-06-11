'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AuftragBaustelleScreen } from '@/components/auftraege/AuftragBaustelleScreen'
import { AbnahmeprotokollChecklist } from '@/components/auftraege/AbnahmeprotokollChecklist'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  loadAbnahmeprotokollSummary,
  saveAbnahmeprotokollDraft,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import {
  maengelAusPunkten,
  type AbnahmeMangel,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { looksLikeHtml, richTextToPlain } from '@/lib/rich-text'
import { cn } from '@/lib/utils'

const STEPS = ['Vor Ort', 'Mängel'] as const

function sanitizeGeladenePunkte(punkte: AbnahmePunkt[]): AbnahmePunkt[] {
  return punkte.map((p) => {
    const raw = p.beschreibung ?? ''
    if (!raw || !looksLikeHtml(raw)) return p
    return { ...p, beschreibung: richTextToPlain(raw) }
  })
}

/** Ausfüllen vor Ort — getrennt von der Erstellung. */
export function AbnahmeprotokollFillFlow({
  auftragId,
  kundeName,
  onClose,
  onDone,
}: {
  auftragId: string
  kundeName: string
  onClose: () => void
  onDone: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [pending, startTransition] = useTransition()
  const [punkte, setPunkte] = useState<AbnahmePunkt[]>([])
  const [maengel, setMaengel] = useState<AbnahmeMangel[]>([])
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const prevStepRef = useRef<1 | 2>(1)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const mangelPunkte = useMemo(() => punkte.filter((p) => p.status === 'mangel'), [punkte])

  useEffect(() => {
    setLoading(true)
    void (async () => {
      const saved = await loadAbnahmeprotokollSummary(auftragId)
      if (!saved?.punkte.length) {
        toast.error('Bitte zuerst ein Abnahmeprotokoll erstellen.')
        onClose()
        return
      }
      setPunkte(sanitizeGeladenePunkte(saved.punkte))
      setMaengel(saved.maengel)
      setLoading(false)
    })()
  }, [auftragId, onClose])

  useEffect(() => {
    if (step === 2 && prevStepRef.current !== 2) {
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
          p.id === id ? { ...p, foto_urls: [...(p.foto_urls ?? []), ...urls].slice(0, 8) } : p
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

  function speichern(onSuccess?: () => void) {
    startTransition(async () => {
      const saved = await loadAbnahmeprotokollSummary(auftragId)
      if (!saved) {
        toast.error('Kein Protokoll gefunden.')
        return
      }
      const r = await saveAbnahmeprotokollDraft({
        auftragId,
        abnahmeDatum: saved.abnahme_datum,
        punkte,
        maengel: step >= 2 ? maengel : maengelAusPunkten(punkte),
        notizen: saved.notizen,
        regeneratePdf: step >= 2,
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Abnahme gespeichert')
        onDone()
        onSuccess?.()
      }
    })
  }

  const footer = (
    <div className="flex flex-wrap justify-between gap-2">
      <div className="flex gap-2">
        {step > 1 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)}>
            Zurück
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Abbrechen
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" loading={pending} onClick={() => speichern()}>
          Speichern
        </Button>
        {step < 2 ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              if (mangelPunkte.length === 0) speichern(() => onClose())
              else setStep(2)
            }}
          >
            {mangelPunkte.length === 0 ? 'Fertig' : 'Weiter'}
          </Button>
        ) : (
          <Button type="button" variant="primary" size="sm" loading={pending} onClick={() => speichern(() => onClose())}>
            Fertig
          </Button>
        )}
      </div>
    </div>
  )

  const body = loading ? (
    <p className="py-8 text-center text-sm text-bw-text-muted" aria-busy="true">
      Protokoll wird geladen…
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
          <p className="mb-3 text-sm font-medium text-bw-text">
            Vor-Ort-Abnahme für <strong>{kundeName}</strong>
          </p>
          <p className="mb-3 text-sm text-bw-text-muted">
            Punkte abhaken (OK / Mangel / Offen). Änderungen mit „Speichern“ sichern.
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
      ) : (
        <div className="space-y-3">
          {maengel.map((m, idx) => {
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
          })}
        </div>
      )}
    </>
  )

  return (
    <AuftragBaustelleScreen auftragId={auftragId} title="Abnahme ausfüllen" footer={footer}>
      {body}
    </AuftragBaustelleScreen>
  )
}
