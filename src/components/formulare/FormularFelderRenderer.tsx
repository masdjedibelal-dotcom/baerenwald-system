'use client'

import type { FormularFeld } from '@/lib/types'
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

export function FormularFelderRenderer({
  felder,
  daten,
  onChange,
  readonly,
  disabled,
}: {
  felder: FormularFeld[]
  daten: Record<string, unknown>
  onChange?: (id: string, value: unknown) => void
  readonly?: boolean
  disabled?: boolean
}) {
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
            <label className="mb-1 block text-sm font-medium text-ink">
              {f.label}
              {pflicht ? <span className="text-danger"> *</span> : null}
              {readonly ? (
                <span className="ml-2 text-xs font-normal text-muted">({typBadge(f.typ)})</span>
              ) : null}
            </label>
            {f.typ === 'text' ? (
              readonly ? (
                <p className="text-sm text-ink">{String(v ?? '—')}</p>
              ) : (
                <input
                  className="w-full min-h-[44px] rounded-lg border border-border px-3"
                  value={String(v ?? '')}
                  disabled={disabled}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              )
            ) : null}
            {f.typ === 'number' ? (
              readonly ? (
                <p className="text-sm text-ink">{v != null && v !== '' ? String(v) : '—'}</p>
              ) : (
                <input
                  type="number"
                  className="w-full min-h-[44px] rounded-lg border border-border px-3"
                  value={v === undefined || v === null ? '' : String(v)}
                  disabled={disabled}
                  onChange={(e) => set(f.id, e.target.value === '' ? '' : Number(e.target.value))}
                />
              )
            ) : null}
            {f.typ === 'date' ? (
              readonly ? (
                <p className="text-sm text-ink">{String(v ?? '—')}</p>
              ) : (
                <input
                  type="date"
                  className="w-full min-h-[44px] rounded-lg border border-border px-3"
                  value={String(v ?? '')}
                  disabled={disabled}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              )
            ) : null}
            {f.typ === 'textarea' ? (
              readonly ? (
                <p className="whitespace-pre-wrap text-sm text-ink">{String(v ?? '—')}</p>
              ) : (
                <textarea
                  className="w-full rounded-lg border border-border p-3"
                  rows={4}
                  value={String(v ?? '')}
                  disabled={disabled}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              )
            ) : null}
            {f.typ === 'checkbox' ? (
              readonly ? (
                <p className="text-sm text-ink">{v ? 'Ja' : 'Nein'}</p>
              ) : (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(v)}
                    disabled={disabled}
                    onChange={(e) => set(f.id, e.target.checked)}
                  />
                  <span className="text-sm text-muted">Ja</span>
                </label>
              )
            ) : null}
            {f.typ === 'select' ? (
              readonly ? (
                <p className="text-sm text-ink">{String(v ?? '—')}</p>
              ) : (
                <select
                  className="w-full min-h-[44px] rounded-lg border border-border px-3"
                  value={String(v ?? '')}
                  disabled={disabled}
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
              <div className="text-sm text-muted">
                {readonly ? (
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
                ) : (
                  <p>Foto-Upload ist hier nicht verfügbar (nur in öffentlichem Formular).</p>
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
