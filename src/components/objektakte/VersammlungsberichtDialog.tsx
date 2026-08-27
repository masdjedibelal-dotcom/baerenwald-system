'use client'

import { useMemo, useState, useTransition } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { DateInput } from '@/components/ui/DateInput'
import { toast } from '@/components/ui/app-toast'

type ZeitraumPreset = 'laufendes_jahr' | 'letztes_jahr' | '12_monate' | 'custom'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function presetRange(preset: ZeitraumPreset): { von: string; bis: string } {
  const now = new Date()
  const y = now.getFullYear()
  if (preset === 'laufendes_jahr') {
    return { von: `${y}-01-01`, bis: isoDate(now) }
  }
  if (preset === 'letztes_jahr') {
    return { von: `${y - 1}-01-01`, bis: `${y - 1}-12-31` }
  }
  const bis = isoDate(now)
  const vonDate = new Date(now)
  vonDate.setFullYear(vonDate.getFullYear() - 1)
  vonDate.setDate(vonDate.getDate() + 1)
  return { von: isoDate(vonDate), bis }
}

export function VersammlungsberichtDialog({
  open,
  onClose,
  objektId,
  kundeId,
}: {
  open: boolean
  onClose: () => void
  objektId: string
  kundeId: string
}) {
  const [preset, setPreset] = useState<ZeitraumPreset>('letztes_jahr')
  const [von, setVon] = useState(() => presetRange('letztes_jahr').von)
  const [bis, setBis] = useState(() => presetRange('letztes_jahr').bis)
  const [einzelpreise, setEinzelpreise] = useState(true)
  const [pending, startTransition] = useTransition()

  const previewLabel = useMemo(() => {
    if (!von && !bis) return 'Zeitraum wählen'
    return `${von || '…'} – ${bis || '…'}`
  }, [von, bis])

  function applyPreset(p: ZeitraumPreset) {
    setPreset(p)
    if (p === 'custom') return
    const r = presetRange(p)
    setVon(r.von)
    setBis(r.bis)
  }

  function exportPdf() {
    const params = new URLSearchParams({
      kundeId: kundeId.trim(),
      von: von.trim(),
      bis: bis.trim(),
      einzelpreise: einzelpreise ? '1' : '0',
    })
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/objekte/${encodeURIComponent(objektId)}/versammlungsbericht?${params}`
        )
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null
          toast.error(j?.error || 'PDF konnte nicht erstellt werden.')
          return
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener,noreferrer')
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
        onClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Export fehlgeschlagen.')
      }
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Versammlungsbericht"
      context="canvas"
      footer={
        <div className="flex justify-end gap-2">
          <MockBtn kind="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </MockBtn>
          <MockBtn
            kind="primary"
            icon="file-text"
            onClick={exportPdf}
            disabled={pending || !von.trim() || !bis.trim()}
          >
            {pending ? 'Wird erstellt …' : 'PDF erstellen'}
          </MockBtn>
        </div>
      }
    >
      <MockFormSection title="Zeitraum">
        <div className="flex flex-wrap gap-2 mb-3">
          {(
            [
              ['laufendes_jahr', 'Laufendes Jahr'],
              ['letztes_jahr', 'Letztes Jahr'],
              ['12_monate', 'Letzte 12 Monate'],
              ['custom', 'Individuell'],
            ] as const
          ).map(([id, label]) => (
            <MockBtn
              key={id}
              sm
              kind={preset === id ? 'primary' : 'ghost'}
              onClick={() => applyPreset(id)}
            >
              {label}
            </MockBtn>
          ))}
        </div>
        <MockField label="Von">
          <DateInput
            value={von}
            onChange={(e) => {
              setPreset('custom')
              setVon(e.target.value)
            }}
          />
        </MockField>
        <MockField label="Bis">
          <DateInput
            value={bis}
            onChange={(e) => {
              setPreset('custom')
              setBis(e.target.value)
            }}
          />
        </MockField>
        <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
          Vorschau: {previewLabel}
        </p>
      </MockFormSection>
      <MockFormSection title="Inhalt">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={einzelpreise}
            onChange={(e) => setEinzelpreise(e.target.checked)}
          />
          <span>Einzelpreise in der Maßnahmenliste anzeigen</span>
        </label>
        <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
          Der Bericht wird immer erzeugt — auch ohne Vorgänge oder Anlagen im Zeitraum.
        </p>
      </MockFormSection>
    </EditorSheet>
  )
}
