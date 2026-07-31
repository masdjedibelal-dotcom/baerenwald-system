'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useRef, useState } from 'react'
import { Check, Wrench } from 'lucide-react'
import { AuftragBaustelleScreen } from '@/components/auftraege/AuftragBaustelleScreen'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { toast } from '@/components/ui/app-toast'
import {
  loadAbnahmeprotokollSummary,
  updateAbnahmeMaengel,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import {
  countOffeneMaengel,
  isMangelOffen,
  mangelStatusLabel,
  type AbnahmeMangelStatus,
} from '@/lib/auftraege/abnahme-maengel-helpers'
import type { AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import { cn, formatDatum } from '@/lib/utils'

export function AbnahmeMaengelBearbeitenFlow({
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
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [punkte, setPunkte] = useState<AbnahmePunkt[]>([])
  const [maengel, setMaengel] = useState<AbnahmeMangel[]>([])
  const baselineRef = useRef<AbnahmeMangel[]>([])
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      const saved = await loadAbnahmeprotokollSummary(auftragId)
      if (!saved) {
        toast.error('Bitte zuerst ein Abnahmeprotokoll erstellen.')
        onClose()
        return
      }
      setPunkte(saved.punkte)
      setMaengel(saved.maengel)
      baselineRef.current = structuredClone(saved.maengel)
      setLoading(false)
    })()
  }, [auftragId, onClose])

  function mangelDirty(m: AbnahmeMangel) {
    const b = baselineRef.current.find((x) => x.punkt_id === m.punkt_id)
    if (!b) return true
    return (
      (m.beschreibung ?? '') !== (b.beschreibung ?? '') ||
      (m.frist?.slice(0, 10) ?? '') !== (b.frist?.slice(0, 10) ?? '')
    )
  }

  function abbrechenMangel(punktId: string) {
    const b = baselineRef.current.find((x) => x.punkt_id === punktId)
    if (!b) return
    setMaengel((prev) => prev.map((x) => (x.punkt_id === punktId ? structuredClone(b) : x)))
  }

  async function uploadFoto(files: FileList | null, punktId: string) {
    if (!files?.length) return
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
      const m = maengel.find((x) => x.punkt_id === punktId)
      if (!m) return
      const merged = [...(m.foto_nachher_urls ?? []), ...urls].slice(0, 8)
      await patchMangel(punktId, { status: m.status ?? 'offen', foto_nachher_urls: merged })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      setUploadTarget(null)
    }
  }

  async function patchMangel(
    punktId: string,
    patch: {
      status: AbnahmeMangelStatus
      beschreibung?: string
      frist?: string | null
      foto_nachher_urls?: string[]
      notiz?: string
    }
  ) {
    startTransition(async () => {
      const r = await updateAbnahmeMaengel({
        auftragId,
        punktId,
        ...patch,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      const fresh = await loadAbnahmeprotokollSummary(auftragId)
      if (fresh) {
        setPunkte(fresh.punkte)
        setMaengel(fresh.maengel)
        baselineRef.current = structuredClone(fresh.maengel)
      }
      toast.success('Mangel aktualisiert — PDF neu erstellt')
      if (fresh && countOffeneMaengel(fresh.maengel) === 0) onDone()
    })
  }

  const offen = countOffeneMaengel(maengel)

  const footer = (
    <div className="sheet-footer-actions">
      <Button type="button" variant="secondary" onClick={onClose}>
        Schließen
      </Button>
      <Button type="button" variant="primary" onClick={onDone} disabled={pending}>
        Fertig
      </Button>
    </div>
  )

  const body = loading ? (
    <p className="py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">Mängel werden geladen…</p>
  ) : maengel.length === 0 ? (
    <p className="text-[length:var(--fs-text)] text-bw-text-muted">Keine Mängel im Protokoll — alles abgenommen.</p>
  ) : (
    <>
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        onChange={(e) => {
          if (uploadTarget && e.target.files?.length) void uploadFoto(e.target.files, uploadTarget)
          e.target.value = ''
        }}
      />
      <p className="mb-3 text-[length:var(--fs-text)] text-bw-text-muted">
        Nacharbeit für <strong>{kundeName}</strong>
        {offen > 0 ? (
          <>
            {' '}
            — <span className="font-medium text-amber-800">{offen} offen</span>
          </>
        ) : (
          <> — alle Mängel erledigt</>
        )}
      </p>
      <div className="space-y-3">
        {maengel.map((m) => {
          const punkt = punkte.find((p) => p.id === m.punkt_id)
          const offenItem = isMangelOffen(m)
          return (
            <div
              key={m.punkt_id}
              className={cn(
                'rounded-lg border p-3',
                offenItem ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/40'
              )}
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[length:var(--fs-text)] font-semibold text-bw-text">{punkt?.beschreibung ?? m.beschreibung}</p>
                  <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
                    {punkt?.gewerk}
                    {punkt?.leistung_name ? ` · ${punkt.leistung_name}` : ''}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[length:var(--fs-meta)] font-medium',
                    offenItem ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                  )}
                >
                  {mangelStatusLabel(m.status)}
                </span>
              </div>
              <KiAssistFieldLabel
                label="Beschreibung"
                value={m.beschreibung}
                onApply={(text) => {
                  setMaengel((prev) =>
                    prev.map((x) => (x.punkt_id === m.punkt_id ? { ...x, beschreibung: text } : x))
                  )
                }}
                extraHint="Mangel-Beschreibung für Abnahme/PDF (kundensichtbar)."
              >
                <Textarea
                  rows={2}
                  value={m.beschreibung}
                  onChange={(e) => {
                    const next = maengel.map((x) =>
                      x.punkt_id === m.punkt_id ? { ...x, beschreibung: e.target.value } : x
                    )
                    setMaengel(next)
                  }}
                />
              </KiAssistFieldLabel>
              <Input
                label="Frist"
                type="date"
                className="mt-2"
                value={m.frist?.slice(0, 10) ?? ''}
                onChange={(e) => {
                  const frist = e.target.value || null
                  setMaengel((prev) =>
                    prev.map((x) => (x.punkt_id === m.punkt_id ? { ...x, frist } : x))
                  )
                }}
              />
              {mangelDirty(m) ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => abbrechenMangel(m.punkt_id)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={pending}
                    onClick={() =>
                      void patchMangel(m.punkt_id, {
                        status: m.status ?? 'offen',
                        beschreibung: m.beschreibung,
                        frist: m.frist,
                      })
                    }
                  >
                    Speichern
                  </Button>
                </div>
              ) : null}
              {(m.verlauf ?? []).length > 0 ? (
                <ul className="mt-2 space-y-0.5 text-[length:var(--fs-meta)] text-bw-text-muted">
                  {m.verlauf!.map((v, i) => (
                    <li key={`${v.at}-${i}`}>
                      {formatDatum(v.at.slice(0, 10))} · {v.typ}
                      {v.notiz ? ` — ${v.notiz}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {offenItem ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={pending}
                      onClick={() => void patchMangel(m.punkt_id, { status: 'in_bearbeitung', notiz: 'In Bearbeitung' })}
                    >
                      <Wrench className="mr-1 h-3.5 w-3.5" aria-hidden />
                      In Bearbeitung
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={pending}
                      onClick={() => {
                        setUploadTarget(m.punkt_id)
                        fileRef.current?.click()
                      }}
                      disabled={uploading}
                    >
                      Nachher-Foto
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={pending}
                      onClick={() => void patchMangel(m.punkt_id, { status: 'behoben', notiz: 'Nacharbeit erledigt' })}
                    >
                      Als behoben
                    </Button>
                  </>
                ) : m.status === 'behoben' ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={pending}
                    onClick={() => void patchMangel(m.punkt_id, { status: 'abgenommen', notiz: 'Vom Kunden abgenommen' })}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Abgenommen
                  </Button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )

  return (
    <AuftragBaustelleScreen auftragId={auftragId} title="Mängel bearbeiten" footer={footer}>
      {body}
    </AuftragBaustelleScreen>
  )
}
