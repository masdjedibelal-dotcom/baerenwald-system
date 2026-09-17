'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { PickerSheet } from '@/components/surfaces/PickerSheet'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockField } from '@/components/mock-ui/MockForm'
import {
  createObjektAnlage,
  fetchObjektAnlagenForPicker,
} from '@/app/actions/objektakte-actions'
import {
  ObjektAnlageFormFields,
  anlageInputFromFormState,
  emptyAnlageFormState,
  type ObjektAnlageFormState,
} from '@/components/objektakte/ObjektAnlageFormFields'
import { formatAnlageGarantieHint } from '@/lib/objektakte/labels'
import { OBJEKT_ANLAGE_STATUS_LABELS } from '@/lib/objektakte/labels'
import type { ObjektAnlage } from '@/lib/objektakte/types'
import type { Gewerk } from '@/lib/types'
import { toast } from '@/components/ui/app-toast'

export function AnlageTeilPicker({
  kundeId,
  kundeObjektId,
  value,
  onChange,
  gewerke,
  disabled = false,
}: {
  kundeId: string | null
  kundeObjektId: string | null
  value: string | null
  onChange: (anlageId: string | null) => void
  gewerke: Gewerk[]
  disabled?: boolean
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [anlagen, setAnlagen] = useState<ObjektAnlage[]>([])
  const [loading, setLoading] = useState(false)
  const [suche, setSuche] = useState('')
  const [pending, startTransition] = useTransition()

  const [formState, setFormState] = useState<ObjektAnlageFormState>(() =>
    emptyAnlageFormState(gewerke)
  )
  const [createErr, setCreateErr] = useState<string | null>(null)

  const sichtbar = Boolean(kundeObjektId?.trim() && kundeId?.trim())
  const selected = anlagen.find((a) => a.id === value) ?? null
  const selectedGarantie = selected ? formatAnlageGarantieHint(selected.garantie_bis) : null

  useEffect(() => {
    if (!sichtbar) {
      setAnlagen([])
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchObjektAnlagenForPicker(kundeId!, kundeObjektId!).then((rows) => {
      if (cancelled) return
      setAnlagen(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [sichtbar, kundeId, kundeObjektId, pickerOpen, createOpen])

  const filtered = useMemo(() => {
    const q = suche.trim().toLowerCase()
    if (!q) return anlagen
    return anlagen.filter((a) => {
      const hay = [
        a.bezeichnung,
        a.standort,
        a.gewerke?.name,
        a.hersteller,
        a.modell,
        formatAnlageGarantieHint(a.garantie_bis),
        OBJEKT_ANLAGE_STATUS_LABELS[a.status],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [anlagen, suche])

  function openCreate() {
    setFormState(emptyAnlageFormState(gewerke))
    setCreateErr(null)
    setCreateOpen(true)
  }

  function speichernNeu() {
    if (!kundeId?.trim() || !kundeObjektId?.trim()) return
    setCreateErr(null)
    startTransition(async () => {
      const r = await createObjektAnlage(kundeId, kundeObjektId, anlageInputFromFormState(formState))
      if (!r.ok) {
        setCreateErr(r.message)
        return
      }
      setAnlagen((prev) => [...prev, r.anlage])
      onChange(r.anlage.id)
      setCreateOpen(false)
      setPickerOpen(false)
      toast.success('Anlage angelegt')
    })
  }

  if (!sichtbar) return null

  return (
    <>
      <MockField label="Anlage / Teil" hint="Optional — nur bei gewähltem Objekt">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="sel sel--choice text-left"
            disabled={disabled}
            onClick={() => setPickerOpen(true)}
          >
            {selected?.bezeichnung ?? 'Keine Anlage gewählt'}
          </button>
          {value ? (
            <MockBtn
              sm
              kind="ghost"
              icon="x"
              disabled={disabled}
              title="Zuordnung entfernen"
              onClick={() => onChange(null)}
            />
          ) : null}
        </div>
        {selectedGarantie ? (
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
            {selectedGarantie}
          </p>
        ) : null}
      </MockField>

      <PickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Anlage / Teil"
        onNeu={disabled ? undefined : openCreate}
        search={
          <input
            className="input"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Suchen …"
            aria-label="Anlagen suchen"
          />
        }
      >
        {loading ? (
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
            Wird geladen …
          </p>
        ) : filtered.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
            {anlagen.length === 0
              ? 'Noch keine Anlagen am Objekt — über + anlegen.'
              : 'Keine Treffer.'}
          </p>
        ) : (
          <ul className="picker-sheet__list">
            {filtered.map((a) => {
              const garantie = formatAnlageGarantieHint(a.garantie_bis)
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className="picker-sheet__item"
                    data-selected={a.id === value ? true : undefined}
                    onClick={() => {
                      onChange(a.id)
                      setPickerOpen(false)
                    }}
                  >
                    <span className="picker-sheet__item-title">{a.bezeichnung}</span>
                    <span className="picker-sheet__item-meta">
                      {[a.gewerke?.name, a.standort?.trim(), garantie]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PickerSheet>

      <EditorSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Neue Anlage"
        context="canvas"
        onConfirm={speichernNeu}
        confirmDisabled={pending || !formState.bezeichnung.trim() || !formState.gewerkId}
        confirmBusy={pending}
      >
        {kundeId ? (
          <ObjektAnlageFormFields
            kundeId={kundeId}
            gewerke={gewerke}
            state={formState}
            onChange={(patch) => setFormState((prev) => ({ ...prev, ...patch }))}
            compact
          />
        ) : null}
        {createErr ? (
          <p style={{ color: 'var(--danger)', fontSize: 'var(--fs-meta)', marginTop: 8 }}>
            {createErr}
          </p>
        ) : null}
      </EditorSheet>
    </>
  )
}
