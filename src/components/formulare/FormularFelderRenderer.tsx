'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { DateInput } from '@/components/ui/DateInput'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import type { FormularFeld } from '@/lib/types'
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
  'w-full min-h-[44px] rounded-card border border-bw-border bg-bw-canvas px-3 text-bw-text opacity-80'

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
  maxFotos,
}: {
  felder: FormularFeld[]
  daten: Record<string, unknown>
  onChange?: (id: string, value: unknown) => void
  readonly?: boolean
  disabled?: boolean
  vorschauModus?: boolean
  oeffentlicherFotoUpload?: boolean
  onFotoDatei?: (feldId: string, file: File) => void | Promise<void>
  maxFotos?: number
}) {
  const prev = Boolean(vorschauModus)
  const ro = readonly && !prev
  const dis = disabled || prev
  const fotoLimit = maxFotos ?? 5

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
                <MockInput className={prev ? inputPreviewClass : 'w-full min-h-[44px] rounded-card border border-border px-3'} value={String(v ?? '')} readOnly={prev} disabled={dis && !prev} onChange={(e) => set(f.id, e.target.value)} />
              )
            ) : null}
            {f.typ === 'number' ? (
              ro ? (
                <p className="text-sm text-bw-text">{v != null && v !== '' ? String(v) : '—'}</p>
              ) : (
                <MockInput type="number" className={prev ? inputPreviewClass : 'w-full min-h-[44px] rounded-card border border-border px-3'} value={v === undefined || v === null ? '' : String(v)} readOnly={prev} disabled={dis && !prev} onChange={(e) => set(f.id, e.target.value === '' ? '' : Number(e.target.value))} />
              )
            ) : null}
            {f.typ === 'date' ? (
              ro ? (
                <p className="text-sm text-bw-text">{String(v ?? '—')}</p>
              ) : (
                <DateInput className={prev ? inputPreviewClass : 'w-full min-h-[44px] rounded-card border border-border px-3'} value={String(v ?? '')} readOnly={prev} disabled={dis && !prev} onChange={(e) => set(f.id, e.target.value)} />
              )
            ) : null}
            {f.typ === 'textarea' ? (
              ro ? (
                <RichTextContent html={String(v ?? '')} className="text-sm" fallback={<span>—</span>} />
              ) : (
                <RichTextEditor value={String(v ?? '')} onChange={(__v) => set(f.id, __v)} disabled={dis && !prev} minHeight={120} className={prev ? inputPreviewClass : undefined} />
              )
            ) : null}
            {f.typ === 'checkbox' ? (
              ro ? (
                <p className="text-sm text-bw-text">{v ? 'Ja' : 'Nein'}</p>
              ) : (
                <label
                  className={cn(
                    'flex items-center gap-2',
                    prev && 'pointer-events-none rounded-card border border-bw-border bg-bw-canvas px-3 py-2 opacity-90'
                  )}
                >
                  <MockCheckbox
                    className="rounded-card border-bw-border"
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
                <MockSelect className={prev ? inputPreviewClass : 'w-full min-h-[44px] rounded-card border border-border px-3'} value={String(v ?? '')} disabled={dis} onChange={(e) => set(f.id, e.target.value)}>
                  <option value="">Bitte wählen</option>
                  {(f.optionen ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </MockSelect>
              )
            ) : null}
            {f.typ === 'foto' ? (
              <div className="text-sm text-bw-light">
                {ro ? (
                  Array.isArray(v) && v.length > 0 ? (
                    <div className="bt-foto-grid">
                      {(v as string[]).map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bt-foto-thumb block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    '—'
                  )
                ) : oeffentlicherFotoUpload && onFotoDatei ? (
                  (() => {
                    const urls = Array.isArray(v) ? (v as string[]) : []
                    const canAdd = urls.length < fotoLimit
                    return (
                      <div className="space-y-2">
                        {urls.length > 0 ? (
                          <div className="bt-foto-grid">
                            {urls.map((url) => (
                              <div key={url} className="bt-foto-thumb">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" />
                                {!dis ? (
                                  <MockBtn className="bt-foto-remove" type="button" aria-label="Foto löschen" onClick={() =>
                                      set(
                                        f.id,
                                        urls.filter((u) => u !== url)
                                      )}>
                                    <MockIcon n="x" ctx="default" className="h-3 w-3" aria-hidden />
                                  </MockBtn>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <label
                          className={
                            canAdd && !dis
                              ? 'inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-card border border-bw-border bg-bw-canvas px-4 text-sm text-bw-text hover:bg-bw-hover'
                              : 'inline-flex min-h-[44px] cursor-not-allowed items-center gap-2 rounded-card border border-bw-border bg-bw-canvas px-4 text-sm text-bw-text-muted opacity-60'
                          }
                        >
                          <MockIcon n="photo" ctx="default" className="h-4 w-4" aria-hidden />
                          {canAdd ? 'Fotos wählen' : 'Maximum erreicht'}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="sr-only"
                            disabled={!canAdd || dis}
                            onChange={async (e) => {
                              const picked = Array.from(e.target.files ?? [])
                              e.target.value = ''
                              if (!picked.length) return
                              const slots = fotoLimit - urls.length
                              if (slots <= 0) return
                              for (const file of picked.slice(0, slots)) {
                                await onFotoDatei(f.id, file)
                              }
                            }}
                          />
                        </label>
                        <p className="text-fs-caption text-bw-text-muted">
                          Bis zu {fotoLimit} Fotos · {urls.length}/{fotoLimit}
                        </p>
                      </div>
                    )
                  })()
                ) : (
                  <MockBtn className="inline-flex min-h-[44px] items-center gap-2 rounded-button border border-bw-border bg-bw-canvas px-4 text-sm text-bw-text opacity-90" type="button" disabled>
                    Foto aufnehmen
                  </MockBtn>
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
    <span className={cn('rounded-field bg-canvas px-2 py-0.5 text-xs font-medium text-ink')}>{typBadge(typ)}</span>
  )
}
