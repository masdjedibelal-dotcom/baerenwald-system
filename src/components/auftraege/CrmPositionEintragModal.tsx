'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { createCrmPositionEintrag } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import {
  eintragTypLabel,
  type EintragQuelle,
  type EintragTyp,
} from '@/lib/auftraege/position-lebenszyklus'
import type { AuftragPosition } from '@/lib/types'

/**
 * CRM-Nacherfassung in position_eintraege (Bautagebuch-Lebenszyklus).
 * Freier Eintrag (ohne Leistung) oder gebunden an eine Position.
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
  const [typ, setTyp] = useState<EintragTyp>('notiz')
  const [beschreibung, setBeschreibung] = useState('')
  const [quelle, setQuelle] = useState<EintragQuelle>('telefonisch')
  const [ereignisZeit, setEreignisZeit] = useState('')
  const [rueckgrund, setRueckgrund] = useState('')
  const [zeitStd, setZeitStd] = useState('')
  const [zeitMin, setZeitMin] = useState('')
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
    setBeschreibung('')
    setQuelle('telefonisch')
    setEreignisZeit('')
    setRueckgrund('')
    setZeitStd('')
    setZeitMin('')
    setFotoPath('')
  }, [open, initialPositionId])

  const selected = sortedPos.find((p) => p.id === positionId) ?? null
  const ohneLeistung = !positionId
  const isAufwand = String(selected?.verguetung ?? '') === 'aufwand'

  const typOptions: EintragTyp[] = ohneLeistung
    ? ['notiz']
    : selected?.leistung_status === 'offen' && !selected?.gestartet_am
      ? ['start', 'fortschritt']
      : selected?.leistung_status === 'erledigt'
        ? ['fortschritt', 'weitere_arbeit']
        : ['start', 'fortschritt', 'ergebnis', 'weitere_arbeit']

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
      toast.error('Bitte Beschreibung oder Foto angeben.')
      return
    }
    if (!positionId.trim()) {
      toast.error('Bitte eine Leistung wählen.')
      return
    }
    const eintragTyp: EintragTyp = typ === 'notiz' ? 'fortschritt' : typ
    startTransition(async () => {
      const r = await createCrmPositionEintrag({
        positionId,
        typ: eintragTyp,
        beschreibung: beschreibung.trim() || null,
        quelle,
        rueckdatiertGrund: rueckgrund.trim() || null,
        ereignisZeit: ereignisZeit ? new Date(ereignisZeit).toISOString() : null,
        zeitStd: zeitStd ? Number(zeitStd) : null,
        zeitMin: zeitMin ? Number(zeitMin) : null,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tagebucheintrag"
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" variant="primary" loading={pending} onClick={speichern}>
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">
          Dokumentation landet in <code className="text-[length:var(--fs-meta)]">position_eintraege</code>{' '}
          (gleiche Quelle wie Regiebericht / Bautagebuch-PDF).
        </p>

        <label className="block text-[length:var(--fs-meta)] text-bw-text-muted">
          Leistung (optional)
          <select
            className="mt-0.5 w-full rounded-md border border-bw-border bg-bw-card px-2 py-2 text-[length:var(--fs-text)]"
            value={positionId}
            onChange={(e) => {
              const next = e.target.value
              setPositionId(next)
              setTyp(next ? 'fortschritt' : 'notiz')
            }}
          >
            <option value="">Ohne Leistungsbezug (freie Notiz)</option>
            {sortedPos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.leistung_name?.trim() || 'Leistung'}
              </option>
            ))}
          </select>
        </label>

        {!ohneLeistung ? (
          <label className="block text-[length:var(--fs-meta)] text-bw-text-muted">
            Typ
            <select
              className="mt-0.5 w-full rounded-md border border-bw-border bg-bw-card px-2 py-2 text-[length:var(--fs-text)]"
              value={typ}
              onChange={(e) => setTyp(e.target.value as EintragTyp)}
            >
              {typOptions.map((t) => (
                <option key={t} value={t}>
                  {eintragTypLabel(t)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <Textarea
          label="Beschreibung"
          rows={3}
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          placeholder="Was wurde gemacht / beobachtet…"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-[length:var(--fs-meta)] text-bw-text-muted">
            Quelle
            <select
              className="mt-0.5 w-full rounded-md border border-bw-border bg-bw-card px-2 py-2 text-[length:var(--fs-text)]"
              value={quelle}
              onChange={(e) => setQuelle(e.target.value as EintragQuelle)}
            >
              <option value="telefonisch">telefonisch</option>
              <option value="foto_erhalten">Foto erhalten</option>
              <option value="vor_ort">vor Ort</option>
            </select>
          </label>
          <label className="block text-[length:var(--fs-meta)] text-bw-text-muted">
            Ereigniszeit (Rückdatierung)
            <input
              type="datetime-local"
              className="mt-0.5 w-full rounded-md border border-bw-border bg-bw-card px-2 py-2 text-[length:var(--fs-text)]"
              value={ereignisZeit}
              onChange={(e) => setEreignisZeit(e.target.value)}
            />
          </label>
        </div>

        {ereignisZeit ? (
          <label className="block text-[length:var(--fs-meta)] text-bw-text-muted">
            Grund für Rückdatierung
            <input
              className="mt-0.5 w-full rounded-md border border-bw-border bg-bw-card px-2 py-2 text-[length:var(--fs-text)]"
              value={rueckgrund}
              onChange={(e) => setRueckgrund(e.target.value)}
              placeholder="Pflicht bei Rückdatierung"
            />
          </label>
        ) : null}

        {isAufwand || ohneLeistung ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[length:var(--fs-meta)] text-bw-text-muted">
              Std
              <input
                className="mt-0.5 w-full rounded-md border border-bw-border bg-bw-card px-2 py-2 text-[length:var(--fs-text)]"
                value={zeitStd}
                onChange={(e) => setZeitStd(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label className="block text-[length:var(--fs-meta)] text-bw-text-muted">
              Min
              <input
                className="mt-0.5 w-full rounded-md border border-bw-border bg-bw-card px-2 py-2 text-[length:var(--fs-text)]"
                value={zeitMin}
                onChange={(e) => setZeitMin(e.target.value)}
                inputMode="numeric"
              />
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[length:var(--fs-text)]">
            <span className="sr-only">Foto</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void uploadFoto(f)
                e.target.value = ''
              }}
            />
          </label>
          {fotoPath ? (
            <span className="text-[length:var(--fs-meta)] text-emerald-800">Foto gesetzt</span>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
