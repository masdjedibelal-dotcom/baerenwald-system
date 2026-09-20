'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn, MockEmpty } from '@/components/mock-ui'
import { MockField, MockTextarea } from '@/components/mock-ui/MockForm'
import { useLocalTransition } from '@/components/ui/action-busy'
import { DateInput } from '@/components/ui/DateInput'
import { useEffect, useRef, useState } from 'react'
import { AuftragBaustelleScreen } from '@/components/auftraege/AuftragBaustelleScreen'
<<<<<<< Updated upstream
=======
import { MockBtn } from '@/components/mock-ui'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
>>>>>>> Stashed changes
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
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

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
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [pending, startTransition] = useLocalTransition()
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
        applyFieldErrors({ _form: TOAST.bitte_zuerst_ein_abnahmeprotokoll_erstellen })
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
      toast.systemError(e, 'ui', 'Upload fehlgeschlagen')
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
        toast.systemError(r)
        return
      }
      const fresh = await loadAbnahmeprotokollSummary(auftragId)
      if (fresh) {
        setPunkte(fresh.punkte)
        setMaengel(fresh.maengel)
        baselineRef.current = structuredClone(fresh.maengel)
      }
      toast.success(TOAST.mangel_aktualisiert_pdf_neu_erstellt)
      if (fresh && countOffeneMaengel(fresh.maengel) === 0) onDone()
    })
  }

  const offen = countOffeneMaengel(maengel)

  const footer = (
    <div className="sheet-footer-actions">
      <MockBtn type="button" kind="secondary" onClick={onClose}>
<<<<<<< Updated upstream
        Abbrechen
=======
        Schließen
>>>>>>> Stashed changes
      </MockBtn>
      <MockBtn type="button" kind="primary" onClick={onDone} disabled={pending}>
        Speichern
      </MockBtn>
    </div>
  )

  const body = loading ? (
    <p className="py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">Mängel werden geladen…</p>
  ) : maengel.length === 0 ? (
    <MockEmpty title="Keine Mängel im Protokoll — alles abgenommen." />
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
            — <span className="font-medium text-status-contact-text">{offen} offen</span>
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
                'rounded-card border p-3',
                offenItem ? 'border-status-contact-bg bg-status-contact-bg/50' : 'border-status-order-bg bg-status-order-bg/40'
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
                    'rounded-pill px-2 py-0.5 text-[length:var(--fs-meta)] font-medium',
                    offenItem ? 'bg-status-contact-bg text-status-contact-text' : 'bg-status-order-bg text-status-order-text'
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
                <MockTextarea value={m.beschreibung} onChange={(e) => {
                    const next = maengel.map((x) =>
                      x.punkt_id === m.punkt_id ? { ...x, beschreibung: e.target.value } : x
                    )
                    setMaengel(next)
                  }} rows={14} className="resize-y py-2 ta--long" />
              </KiAssistFieldLabel>
              <MockField label="Frist"><DateInput value={m.frist?.slice(0, 10) ?? ''} onChange={(e) => {
                  const frist = e.target.value || null
                  setMaengel((prev) =>
                    prev.map((x) => (x.punkt_id === m.punkt_id ? { ...x, frist } : x))
                  )
                }} className=" mt-2" /></MockField>
              {mangelDirty(m) ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <MockBtn
                    type="button"
                    kind="ghost" sm
                    disabled={pending}
                    onClick={() => abbrechenMangel(m.punkt_id)}
                  >
                    Abbrechen
                  </MockBtn>
                  <MockBtn
                    type="button"
                    kind="primary" sm
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
                  </MockBtn>
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
                    <MockBtn
                      type="button"
                      kind="secondary" sm
                      loading={pending}
                      onClick={() => void patchMangel(m.punkt_id, { status: 'in_bearbeitung', notiz: 'In Bearbeitung' })}
                    >
                      <MockIcon n="tool" ctx="default" className="mr-1 h-3.5 w-3.5" aria-hidden />
                      In Bearbeitung
                    </MockBtn>
                    <MockBtn
                      type="button"
                      kind="secondary" sm
                      loading={pending}
                      onClick={() => {
                        setUploadTarget(m.punkt_id)
                        fileRef.current?.click()
                      }}
                      disabled={uploading}
                    >
                      Nachher-Foto
                    </MockBtn>
                    <MockBtn
                      type="button"
                      kind="primary" sm
                      loading={pending}
                      onClick={() => void patchMangel(m.punkt_id, { status: 'behoben', notiz: 'Nacharbeit erledigt' })}
                    >
                      Als behoben
                    </MockBtn>
                  </>
                ) : m.status === 'behoben' ? (
                  <MockBtn
                    type="button"
                    kind="primary" sm
                    loading={pending}
                    onClick={() => void patchMangel(m.punkt_id, { status: 'abgenommen', notiz: 'Vom Kunden abgenommen' })}
                  >
                    <MockIcon n="check" ctx="default" className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Abgenommen
                  </MockBtn>
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
