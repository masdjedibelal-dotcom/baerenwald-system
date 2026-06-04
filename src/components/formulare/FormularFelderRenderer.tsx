'use client'

import { Camera } from 'lucide-react'
import type { FormularFeld } from '@/lib/types'
import { Textarea } from '@/components/ui/Textarea'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { cn } from '@/lib/utils'

function typBadge(t: FormularFeld['typ']) {
  const map: Record<FormularFeld['typ'], string> = {
    text: 'Text',
    textarea: 'Mehrzeilig',
    number: 'Zahl',
    date: 'Datum',
    checkbox: 'Ja/Nein',
    select: 'Auswahl',
    foto: 'Foto',
  }
  return map[t]
}

function showPflichtStern(f: FormularFeld) {
  return f.pflicht || Boolean(f.pflicht_wenn)
}

export function validateFormularPflicht(
  felder: FormularFeld[],
  daten: Record<string, unknown>
): string | null {
  for (const f of felder) {
    const need =
      f.pflicht ||
      (f.pflicht_wenn &&
        daten[f.pflicht_wenn.feld_id] ===
          (f.pflicht_wenn.wert !== undefined ? f.pflicht_wenn.wert : true))
    if (!need) continue
    const v = daten[f.id]
    if (f.typ === 'checkbox') {
      if (!v) return `${f.label} muss angehakt sein.`
      continue
    }
    if (f.typ === 'foto') {
      if (!Array.isArray(v) || v.length === 0) return `${f.label} ist ein Pflichtfeld.`
      continue
    }
    if (v == null || v === '') return `${f.label} ist ein Pflichtfeld.`
  }
  return null
}

const inputPreviewClass =
  'w-full min-h-[44px] rounded-lg border border-bw-border bg-bw-canvas px-3 text-bw-text opacity-80'

export function FormularFelderRenderer({
  felder,
  daten,
  onChange,
  readonly,
  disabled,
  /** Nur Darstellung wie Formularfelder, aber nicht editierbar (Builder-Vorschau) */
  vorschauModus,
  /** Öffentliches Formular: Datei wählen / Kamera (speichern extern) */
  oeffentlicherFotoUpload,
  onFotoDatei,
}: {
  felder: FormularFeld[]
  daten: Record<string, unknown>
  onChange?: (id: string, value: unknown) => void
  readonly?: boolean
  disabled?: boolean
  vorschauModus?: boolean
  oeffentlicherFotoUpload?: boolean
  onFotoDatei?: (feldId: string, file: File) => void | Promise<void>
}) {
  const prev = Boolean(vorschauModus)
  const ro = readonly && !prev
  const dis = disabled || prev

  function set(id: string, value: unknown) {
    onChange?.(id, value)
  }

  return (
    <div className="space-y-4">
      {felder.map((f) => {
        const pflicht = showPflichtStern(f)
        const v = daten[f.id]

        return (
          <div key={f.id}>
            <label className="mb-1 block text-sm font-medium text-bw-text">
              {f.label}
              {pflicht ? <span className="text-status-cancel-text"> *</span> : null}
              {ro ? (
                <span className="ml-2 text-xs font-normal text-bw-light">({typBadge(f.typ)})</span>
              ) : null}
            </label>
            {f.typ === 'text' ? (
              ro ? (
                <p className="text-sm text-bw-text">{String(v ?? '—')}</p>
              ) : (
                <input
                  className={prev ? inputPreviewClass : 'w-full min-h-[44px] rounded-lg border border-border px-3'}
                  value={String(v ?? '')}
                  readOnly={prev}
                  disabled={dis && !prev}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              )
            ) : null}
            {f.typ === 'number' ? (
              ro ? (
                <p className="text-sm text-bw-text">{v != null && v !== '' ? String(v) : '—'}</p>
              ) : (
                <input
                  type="number"
                  className={prev ? inputPreviewClass : 'w-full min-h-[44px] rounded-lg border border-border px-3'}
                  value={v === undefined || v === null ? '' : String(v)}
                  readOnly={prev}
                  disabled={dis && !prev}
                  onChange={(e) => set(f.id, e.target.value === '' ? '' : Number(e.target.value))}
                />
              )
            ) : null}
            {f.typ === 'date' ? (
              ro ? (
                <p className="text-sm text-bw-text">{String(v ?? '—')}</p>
              ) : (
                <input
                  type="date"
                  className={prev ? inputPreviewClass : 'w-full min-h-[44px] rounded-lg border border-border px-3'}
                  value={String(v ?? '')}
                  readOnly={prev}
                  disabled={dis && !prev}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              )
            ) : null}
            {f.typ === 'textarea' ? (
              ro ? (
                <RichTextContent html={String(v ?? '')} className="text-sm" fallback={<span>—</span>} />
              ) : (
                <Textarea
                  className={prev ? inputPreviewClass : undefined}
                  rows={4}
                  value={String(v ?? '')}
                  readOnly={prev}
                  disabled={dis && !prev}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              )
            ) : null}
            {f.typ === 'checkbox' ? (
              ro ? (
                <p className="text-sm text-bw-text">{v ? 'Ja' : 'Nein'}</p>
              ) : (
                <label
                  className={cn(
                    'flex items-center gap-2',
                    prev && 'pointer-events-none rounded-lg border border-bw-border bg-bw-canvas px-3 py-2 opacity-90'
                  )}
                >
                  <input
                    type="checkbox"
                    className="rounded border-bw-border"
                    checked={Boolean(v)}
                    disabled={dis}
                    readOnly={prev}
                    onChange={(e) => set(f.id, e.target.checked)}
                  />
                  <span className="text-sm text-bw-light">Ja</span>
                </label>
              )
            ) : null}
            {f.typ === 'select' ? (
              ro ? (
                <p className="text-sm text-bw-text">{String(v ?? '—')}</p>
              ) : (
                <select
                  className={prev ? inputPreviewClass : 'w-full min-h-[44px] rounded-lg border border-border px-3'}
                  value={String(v ?? '')}
                  disabled={dis}
                  onChange={(e) => set(f.id, e.target.value)}
                >
                  <option value="">Bitte wählen</option>
                  {(f.optionen ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )
            ) : null}
            {f.typ === 'foto' ? (
              <div className="text-sm text-bw-light">
                {ro ? (
                  Array.isArray(v) && v.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {(v as string[]).map((url) => (
                        <li key={url} className="max-w-[120px] truncate text-xs">
                          {url}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    '—'
                  )
                ) : oeffentlicherFotoUpload && onFotoDatei ? (
                  <div className="space-y-2">
                    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-bw-border bg-bw-canvas px-4 text-sm text-bw-text hover:bg-bw-hover">
                      <Camera className="h-4 w-4" aria-hidden /> Foto aufnehmen / wählen
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) await onFotoDatei(f.id, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    {Array.isArray(v) && (v as string[]).length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {(v as string[]).map((url) => (
                          <li key={url} className="text-xs text-bw-mid">
                            Foto gespeichert
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-bw-border bg-bw-canvas px-4 text-sm text-bw-text opacity-90"
                  >
                    Foto aufnehmen
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function FormularFeldTypBadge({ typ }: { typ: FormularFeld['typ'] }) {
  return (
    <span className={cn('rounded-md bg-canvas px-2 py-0.5 text-xs font-medium text-ink')}>{typBadge(typ)}</span>
  )
}
