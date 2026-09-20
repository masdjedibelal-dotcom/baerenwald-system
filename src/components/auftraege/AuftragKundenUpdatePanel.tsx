'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { useLocalTransition } from '@/components/ui/action-busy'
import { useMemo, useState } from 'react'
<<<<<<< Updated upstream
=======
import { Mail, Send, Upload, X } from 'lucide-react'
import { MockBtn } from '@/components/mock-ui'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
>>>>>>> Stashed changes
import { toast } from '@/components/ui/app-toast'
import { createKundenUpdateAndSend } from '@/app/(dashboard)/auftraege/kunden-update-actions'
import {
  aktuellePhaseIndexFromEntities,
  auftragStatusLabelDe,
  PROJEKT_PHASEN,
} from '@/lib/auftraege/projekt-phasen'
import type { AuftragDetail, AuftragStatus, LeadStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

export function AuftragKundenUpdatePanel({
  detail,
  leadStatus,
  onChanged,
}: {
  detail: AuftragDetail
  leadStatus?: LeadStatus | null
  onChanged: () => void
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [pending, startTransition] = useLocalTransition()
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [mailModus, setMailModus] = useState<'voll' | 'schlicht'>('schlicht')
  const [sendMail, setSendMail] = useState(true)

  const phaseIdx = useMemo(
    () =>
      aktuellePhaseIndexFromEntities({
        aufStatus: detail.status as AuftragStatus,
        hasAuftrag: true,
        hasAngebot: true,
        leadStatus: leadStatus ?? null,
      }),
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
      toast.systemError(e, 'ui', 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  function absenden() {
    if (!titel.trim()) {
      applyFieldErrors({ _form: TOAST.bitte_einen_titel_fuer_das_update_angeben })
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
        toast.systemError(r)
        return
      }
      toast.success(
        sendMail && !r.warning
          ? 'Update veröffentlicht und Kunde benachrichtigt'
          : 'Update veröffentlicht'
      )
      if (r.warning) toast.error(r.warning)
      setTitel('')
      setBeschreibung('')
      setFotos([])
      onChanged()
    })
  }

  return (
    <section className="mb-8 rounded-card border border-bw-border bg-surface p-4">
      <h3 className="mb-1 flex items-center gap-2 text-[length:var(--fs-text)] font-semibold text-bw-text">
        <MockIcon n="send" ctx="default" className="h-4 w-4 text-bw-primary" aria-hidden />
        Kunden-Update erstellen
      </h3>
      <p className="mb-4 text-[length:var(--fs-meta)] text-bw-text-muted">
        Status-Update mit Fotos — erscheint auf der Kunden-Statusseite und optional per E-Mail (mit Phasen-Anzeige oben).
      </p>

      <div className="mb-4 overflow-x-auto rounded-card bg-bw-hover/60 p-3">
        <p className="mb-2 text-[length:var(--fs-meta)] font-medium text-bw-text-muted">
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
                    'flex h-7 w-7 items-center justify-center rounded-pill border-2 text-[length:var(--fs-meta)] font-bold',
                    done && 'border-bw-primary bg-bw-primary text-white',
                    active && !done && 'border-bw-primary bg-white text-bw-dark',
                    !done && !active && 'border-bw-border text-bw-text-muted'
                  )}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className={cn('mt-1 text-[length:var(--fs-meta)]', active ? 'font-semibold text-bw-text' : 'text-bw-text-muted')}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <MockField label="Update-Titel *"><MockInput value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Fliesenarbeiten abgeschlossen" /></MockField>
        <MockField label="Details für Kundin"><MockTextarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="Was wurde gemacht, was folgt als Nächstes…" rows={14} className="resize-y py-2 ta--long" /></MockField>

        <div>
          <p className="input-label">Fotos</p>
          <div className="flex flex-wrap gap-2">
            {fotos.map((url) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-card border border-bw-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <MockBtn className="absolute right-0.5 top-0.5 rounded-button bg-black/50 p-0.5 text-white" type="button" onClick={() => setFotos((f) => f.filter((u) => u !== url))} aria-label="Löschen">
                  <MockIcon n="x" ctx="default" className="h-3 w-3" />
                </MockBtn>
              </div>
            ))}
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-bw-border text-bw-text-muted hover:bg-bw-hover">
              <MockIcon n="upload" ctx="default" className="h-5 w-5" aria-hidden />
              <span className="mt-1 text-[length:var(--fs-meta)]">{uploading ? '…' : 'Foto'}</span>
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

        <div className="rounded-card border border-bw-border bg-bw-hover/40 p-3 space-y-2">
          <p className="text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">E-Mail an Kundin</p>
          <label className="flex items-center gap-2 text-[length:var(--fs-text)]">
            <MockCheckbox checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} />
            Kunde per E-Mail informieren
          </label>
          <label className="flex items-start gap-2 text-[length:var(--fs-text)]">
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
          <label className="flex items-start gap-2 text-[length:var(--fs-text)]">
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

        <MockBtn type="button" kind="primary" loading={pending} onClick={absenden}>
<<<<<<< Updated upstream
          <MockIcon n="mail" ctx="default" className="mr-2 inline h-4 w-4" aria-hidden />
=======
          <Mail className="mr-2 inline h-4 w-4" aria-hidden />
>>>>>>> Stashed changes
          Update veröffentlichen{sendMail ? ' & senden' : ''}
        </MockBtn>
      </div>
    </section>
  )
}
