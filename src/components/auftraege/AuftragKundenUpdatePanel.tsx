'use client'

import { useMemo, useState, useTransition } from 'react'
import { Mail, Send, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { createKundenUpdateAndSend } from '@/app/(dashboard)/auftraege/kunden-update-actions'
import {
  aktuellePhaseIndex,
  auftragStatusLabelDe,
  PROJEKT_PHASEN,
} from '@/lib/auftraege/projekt-phasen'
import type { AuftragDetail, AuftragStatus, LeadStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AuftragKundenUpdatePanel({
  detail,
  leadStatus,
  onChanged,
}: {
  detail: AuftragDetail
  leadStatus?: LeadStatus | null
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [mailModus, setMailModus] = useState<'voll' | 'schlicht'>('schlicht')
  const [sendMail, setSendMail] = useState(true)

  const phaseIdx = useMemo(
    () => aktuellePhaseIndex(leadStatus ?? null, detail.status as AuftragStatus),
    [leadStatus, detail.status]
  )

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('filename', file.name)
      const res = await fetch(`/api/auftraege/${detail.id}/timeline-foto/upload`, {
        method: 'POST',
        body: fd,
      })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
      setFotos((f) => [...f, json.url!])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  function absenden() {
    if (!titel.trim()) {
      toast.error('Bitte einen Titel für das Update angeben.')
      return
    }
    startTransition(async () => {
      const r = await createKundenUpdateAndSend({
        auftragId: detail.id,
        titel: titel.trim(),
        beschreibung: beschreibung.trim(),
        foto_urls: fotos,
        mailModus,
        kundeBenachrichtigen: sendMail,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(sendMail ? 'Update veröffentlicht und Kunde benachrichtigt' : 'Update veröffentlicht')
      setTitel('')
      setBeschreibung('')
      setFotos([])
      onChanged()
    })
  }

  return (
    <section className="mb-8 rounded-lg border border-bw-border bg-bw-card p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-bw-text">
        <Send className="h-4 w-4 text-bw-primary" aria-hidden />
        Kunden-Update erstellen
      </h3>
      <p className="mb-4 text-xs text-bw-text-muted">
        Status-Update mit Fotos — erscheint auf der Kunden-Statusseite und optional per E-Mail (mit Phasen-Anzeige oben).
      </p>

      <div className="mb-4 overflow-x-auto rounded-lg bg-bw-hover/60 p-3">
        <p className="mb-2 text-xs font-medium text-bw-text-muted">
          Aktuelle Phase: {auftragStatusLabelDe(detail.status)} · {PROJEKT_PHASEN[phaseIdx]}
        </p>
        <div className="flex min-w-[420px] items-center justify-between gap-1">
          {PROJEKT_PHASEN.map((label, i) => {
            const done = i < phaseIdx
            const active = i === phaseIdx
            return (
              <div key={label} className="flex flex-1 flex-col items-center text-center">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold',
                    done && 'border-bw-primary bg-bw-primary text-white',
                    active && !done && 'border-bw-primary bg-white text-bw-dark',
                    !done && !active && 'border-bw-border text-bw-text-muted'
                  )}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className={cn('mt-1 text-[10px]', active ? 'font-semibold text-bw-text' : 'text-bw-text-muted')}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Input label="Update-Titel *" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Fliesenarbeiten abgeschlossen" />
        <Textarea
          label="Details für Kundin"
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={4}
          placeholder="Was wurde gemacht, was folgt als Nächstes…"
        />

        <div>
          <p className="input-label">Fotos</p>
          <div className="flex flex-wrap gap-2">
            {fotos.map((url) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-bw-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 rounded bg-black/50 p-0.5 text-white"
                  onClick={() => setFotos((f) => f.filter((u) => u !== url))}
                  aria-label="Entfernen"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-bw-border text-bw-text-muted hover:bg-bw-hover">
              <Upload className="h-5 w-5" aria-hidden />
              <span className="mt-1 text-[10px]">{uploading ? '…' : 'Foto'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || pending}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void uploadFile(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-bw-border bg-bw-hover/40 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">E-Mail an Kundin</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} />
            Kunde per E-Mail informieren
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="mail-modus"
              checked={mailModus === 'schlicht'}
              onChange={() => setMailModus('schlicht')}
            />
            <span>
              <strong>Schlicht</strong> — Phasen-Leiste + Kurzhinweis + Link (empfohlen, weniger Spam)
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="mail-modus"
              checked={mailModus === 'voll'}
              onChange={() => setMailModus('voll')}
            />
            <span>
              <strong>Mit Details</strong> — Phasen + vollständiger Text + Foto-Links in der Mail
            </span>
          </label>
        </div>

        <Button type="button" variant="primary" loading={pending} onClick={absenden}>
          <Mail className="mr-2 inline h-4 w-4" aria-hidden />
          Update veröffentlichen{sendMail ? ' & senden' : ''}
        </Button>
      </div>
    </section>
  )
}
