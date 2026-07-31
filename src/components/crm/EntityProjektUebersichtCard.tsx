'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState, type ReactNode } from 'react'
import { InlineEditField, InlineEditSection } from '@/components/ui/InlineEditSection'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { formatEurRange } from '@/lib/angebote/angebot-wizard-types'
import { formatDatum, cn } from '@/lib/utils'

export type ProjektUebersichtExtraRow = {
  label: string
  children: ReactNode
}

export type ProjektInlineDraft = {
  titel: string
  beschreibung: string
  startDatum: string
  endDatum: string
  istBauprojekt: boolean
}

type EditableKeys = keyof ProjektInlineDraft

/**
 * Projekt-Übersicht mit optionalem Inline-Bearbeiten (Stift → Speichern/Abbrechen).
 */
export function EntityProjektUebersichtCard({
  title = 'Projekt-Übersicht',
  icon = 'clipboard-list',
  titelLabel = 'Projekt',
  initial,
  editableFields = [],
  onSave,
  disabled,
  region,
  preisMin,
  preisMax,
  preisrahmenLabel,
  quelle,
  fortschritt,
  extraRows,
  footerRows,
  belowContent,
}: {
  title?: string
  icon?: string
  /** Label für das Titel-Feld (Anfrage: Vorhaben). */
  titelLabel?: string
  initial: ProjektInlineDraft
  /** Welche Felder im Bearbeitungsmodus editierbar sind */
  editableFields?: EditableKeys[]
  onSave?: (draft: ProjektInlineDraft) => Promise<{ ok: true } | { ok: false; message: string }>
  disabled?: boolean
  region?: string | null
  preisMin?: number | null
  preisMax?: number | null
  preisrahmenLabel?: string | null
  quelle?: string | null
  fortschritt?: number | null
  extraRows?: ProjektUebersichtExtraRow[]
  footerRows?: ProjektUebersichtExtraRow[]
  /** Inhalt unter den Props (z. B. KI-Auskunft inline in Bedarf). */
  belowContent?: ReactNode
}) {
  const canEdit = Boolean(onSave) && editableFields.length > 0 && !disabled
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initial)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!editing) setDraft(initial)
  }, [initial, editing])

  const preisrahmen =
    preisrahmenLabel?.trim() ||
    (preisMin != null && preisMax != null ? formatEurRange(preisMin, preisMax) : null)

  const zeitraumView =
    draft.startDatum && draft.endDatum
      ? `${formatDatum(draft.startDatum)} – ${formatDatum(draft.endDatum)}`
      : draft.startDatum
        ? formatDatum(draft.startDatum)
        : null

  function can(field: EditableKeys) {
    return editing && editableFields.includes(field)
  }

  function patch(p: Partial<ProjektInlineDraft>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  function cancel() {
    setDraft(initial)
    setEditing(false)
  }

  function save() {
    if (!onSave) return
    startTransition(async () => {
      const r = await onSave(draft)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Details gespeichert')
      setEditing(false)
    })
  }

  return (
    <InlineEditSection
      title={title}
      icon={icon}
      editing={editing}
      onStartEdit={() => setEditing(true)}
      onCancel={cancel}
      onSave={save}
      saving={pending}
      disabled={!canEdit}
    >
      {editing ? (
        <p className="inline-edit-hint">
          <MockIcon ctx="default" n="info-circle" size={14} />
          Hervorgehobene Felder sind bearbeitbar.
        </p>
      ) : null}
      <div className="props">
        <InlineEditField
          label={titelLabel}
          editing={can('titel')}
          value={draft.titel.trim() || '—'}
        >
          <input
            className="input"
            value={draft.titel}
            onChange={(e) => patch({ titel: e.target.value })}
            autoFocus={can('titel')}
          />
        </InlineEditField>

        {(editing && editableFields.includes('beschreibung')) || draft.beschreibung.trim() ? (
          can('beschreibung') ? (
            <KiAssistFieldLabel
              label="Beschreibung"
              value={draft.beschreibung}
              onApply={(text) => patch({ beschreibung: text })}
              extraHint="Projektbeschreibung (kundensichtbar)."
            >
              <textarea
                className="input"
                rows={3}
                value={draft.beschreibung}
                onChange={(e) => patch({ beschreibung: e.target.value })}
              />
            </KiAssistFieldLabel>
          ) : (
            <InlineEditField
              label="Beschreibung"
              editing={false}
              value={draft.beschreibung.trim() || '—'}
            />
          )
        ) : null}

        {(extraRows ?? []).map((row, i) => (
          <div key={`extra-${i}-${row.label}`} className="prop">
            <div className="k">{row.label}</div>
            <div className="v">{row.children}</div>
          </div>
        ))}

        {region && region !== '—' ? (
          <InlineEditField label="Region" editing={false} value={region} />
        ) : null}

        {preisrahmen ? (
          <InlineEditField
            label="Preisrahmen"
            editing={false}
            value={<span style={{ color: 'var(--green)', fontWeight: 600 }}>{preisrahmen}</span>}
          />
        ) : null}

        {quelle ? <InlineEditField label="Quelle" editing={false} value={quelle} /> : null}

        {editableFields.includes('startDatum') || editableFields.includes('endDatum') ? (
          editing ? (
            <>
              {editableFields.includes('startDatum') ? (
                <InlineEditField label="Start" editing value={draft.startDatum || '—'}>
                  <input
                    className="input"
                    type="date"
                    value={draft.startDatum}
                    onChange={(e) => patch({ startDatum: e.target.value })}
                  />
                </InlineEditField>
              ) : null}
              {editableFields.includes('endDatum') ? (
                <InlineEditField label="Ende" editing value={draft.endDatum || '—'}>
                  <input
                    className="input"
                    type="date"
                    value={draft.endDatum}
                    onChange={(e) => patch({ endDatum: e.target.value })}
                  />
                </InlineEditField>
              ) : null}
            </>
          ) : zeitraumView ? (
            <InlineEditField label="Zeitraum" editing={false} value={zeitraumView} />
          ) : null
        ) : zeitraumView ? (
          <InlineEditField label="Zeitraum" editing={false} value={zeitraumView} />
        ) : null}

        {fortschritt != null ? (
          <InlineEditField label="Fortschritt" editing={false} value={`${fortschritt} %`} />
        ) : null}

        {editableFields.includes('istBauprojekt') ? (
          <InlineEditField
            label="Bauprojekt"
            editing={can('istBauprojekt')}
            value={draft.istBauprojekt ? 'Ja' : 'Nein'}
          >
            <label className={cn('flex cursor-pointer items-start gap-2 text-[length:var(--fs-text)]')}>
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-bw-border"
                checked={draft.istBauprojekt}
                onChange={(e) => patch({ istBauprojekt: e.target.checked })}
              />
              <span>
                Bauprojekt / Bauauftrag
                <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
                  Aktiviert Bautagebuch, Baustellen-Tab und Compliance.
                </span>
              </span>
            </label>
          </InlineEditField>
        ) : null}

        {(footerRows ?? []).map((row, i) => (
          <div key={`footer-${i}-${row.label}`} className="prop">
            <div className="k">{row.label}</div>
            <div className="v">{row.children}</div>
          </div>
        ))}
      </div>
      {belowContent ? <div className="mt-4">{belowContent}</div> : null}
    </InlineEditSection>
  )
}
