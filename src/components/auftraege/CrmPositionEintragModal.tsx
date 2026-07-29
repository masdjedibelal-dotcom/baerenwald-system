'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Camera } from 'lucide-react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { createCrmPositionEintrag } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import {
  eintragTypLabel,
  type EintragTyp,
} from '@/lib/auftraege/position-lebenszyklus'
import { cn } from '@/lib/utils'
import type { AuftragPosition } from '@/lib/types'

/**
 * Fortschritt / freier Tagebuch-Eintrag — EditorSheet rechts (Mock).
 */
export function CrmPositionEintragModal({
  open,
  onClose,
  auftragId,
  positionen,
  initialPositionId = null,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  positionen: AuftragPosition[]
  /** null = freier Notiz-Eintrag ohne Leistungsbezug */
  initialPositionId?: string | null
  onSaved?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [positionId, setPositionId] = useState<string>('')
  const [typ, setTyp] = useState<EintragTyp>('fortschritt')
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [fotoPath, setFotoPath] = useState('')

  const sortedPos = useMemo(
    () =>
      [...positionen]
        .filter((p) => (p.aenderung_typ ?? '').toLowerCase() !== 'entfernt')
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            (a.leistung_name ?? '').localeCompare(b.leistung_name ?? '', 'de')
        ),
    [positionen]
  )

  useEffect(() => {
    if (!open) return
    const pref = initialPositionId?.trim() || ''
    setPositionId(pref)
    setTyp(pref ? 'fortschritt' : 'notiz')
    setTitel('')
    setBeschreibung('')
    setFotoPath('')
  }, [open, initialPositionId])

  const selected = sortedPos.find((p) => p.id === positionId) ?? null
  const ohneLeistung = !positionId

  const typTabs: { id: EintragTyp; label: string }[] = ohneLeistung
    ? [{ id: 'notiz', label: 'Notiz' }]
    : [
        { id: 'start', label: 'Start' },
        { id: 'fortschritt', label: 'Fortschritt' },
        { id: 'ergebnis', label: 'Ergebnis' },
      ]

  async function uploadFoto(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('filename', file.name)
    const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
      method: 'POST',
      body: fd,
    })
    const json = (await res.json()) as { url?: string; error?: string }
    if (!res.ok || !json.url) {
      toast.error(json.error || 'Upload fehlgeschlagen')
      return
    }
    setFotoPath(json.url)
    toast.success('Foto hochgeladen')
  }

  function speichern() {
    if (!beschreibung.trim() && !fotoPath) {
      toast.error('Bitte Beschreibung angeben.')
      return
    }
    if (!positionId) {
      toast.error('Bitte eine Leistung zuordnen (Soft-Bezug).')
      return
    }
    const eintragTyp: EintragTyp =
      typ === 'notiz' ? 'weitere_arbeit' : typ === 'fortschritt' && ohneLeistung ? 'weitere_arbeit' : typ
    const text = [titel.trim(), beschreibung.trim()].filter(Boolean).join('\n\n')
    startTransition(async () => {
      const r = await createCrmPositionEintrag({
        positionId,
        typ: eintragTyp,
        beschreibung: text || null,
        quelle: 'vor_ort',
        rueckdatiertGrund: null,
        ereignisZeit: null,
        zeitStd: null,
        zeitMin: null,
        fotoStoragePath: fotoPath.trim() || null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(`${eintragTypLabel(eintragTyp)} erfasst`)
      onSaved?.()
      onClose()
    })
  }

  const crumb = ohneLeistung
    ? 'Freier Eintrag >'
    : selected
      ? `${selected.leistung_name?.trim() || 'Leistung'} >`
      : null
  const title = ohneLeistung ? 'Tagebuch-Eintrag' : 'Fortschritt erfassen'
  const dirty = Boolean(beschreibung.trim() || titel.trim() || fotoPath)

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={title}
      crumb={crumb}
      size="lg"
      dirty={dirty && !pending}
      footer={
        <div className="ldr-cta" style={{ justifyContent: 'space-between' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            {ohneLeistung ? 'Abbrechen' : '< Zurück'}
          </Button>
          <Button type="button" variant="primary" loading={pending} onClick={speichern}>
            ✓ Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {ohneLeistung ? (
          <>
            <div className="ldr-empty" style={{ borderStyle: 'solid' }}>
              Freier Eintrag ohne Leistungsbezug — für Wetter, Baustellenzustand, Besuche oder
              Behinderungen.
            </div>
            <label className="block">
              <span className="lt-field-lbl">Leistung</span>
              <select
                className="input"
                value={positionId}
                onChange={(e) => {
                  setPositionId(e.target.value)
                  setTyp(e.target.value ? 'fortschritt' : 'notiz')
                }}
              >
                <option value="">Leistung zuordnen…</option>
                {sortedPos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.leistung_name?.trim() || 'Leistung'}
                  </option>
                ))}
              </select>
              <span className="lt-field-opt">optional Soft-Bezug — Angebotszeile ≠ Baustellen-Update</span>
            </label>
          </>
        ) : null}

        {!ohneLeistung && typTabs.length > 1 ? (
          <div>
            <div className="lt-seg-label">Art des Eintrags</div>
            <div className="lt-seg" role="tablist">
              {typTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={typ === t.id}
                  className={cn('lt-seg__btn', typ === t.id && 'on')}
                  onClick={() => setTyp(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {ohneLeistung ? (
          <label className="block">
            <span className="lt-field-lbl">Titel</span>
            <input
              className="input"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="z.B. Regen — Außenarbeiten verschoben"
            />
            <span className="lt-field-opt">optional</span>
          </label>
        ) : null}

        {!ohneLeistung && !selected ? (
          <label className="block">
            <span className="lt-field-lbl">Leistung</span>
            <select
              className="input"
              value={positionId}
              onChange={(e) => {
                setPositionId(e.target.value)
                setTyp(e.target.value ? 'fortschritt' : 'notiz')
              }}
            >
              <option value="">Leistung wählen…</option>
              {sortedPos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.leistung_name?.trim() || 'Leistung'}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block">
          <span className="lt-field-lbl">
            Beschreibung <span aria-hidden>*</span>
          </span>
          <Textarea
            rows={4}
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="Was ist passiert?"
          />
        </label>

        <div>
          <span className="lt-field-lbl">Foto</span>
          <label className="lt-foto-zone">
            <Camera className="h-5 w-5" aria-hidden />
            <span>{fotoPath ? 'Foto ersetzt — tippen zum Ändern' : 'Foto hinzufügen'}</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void uploadFoto(f)
              }}
            />
          </label>
          <span className="lt-field-opt">optional</span>
        </div>
      </div>
    </EditorSheet>
  )
}
