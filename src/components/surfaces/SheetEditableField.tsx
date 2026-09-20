'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useEffect, useState } from 'react'
import { EditorSheet, type EditorSheetContext } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { DateInput } from '@/components/ui/DateInput'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

export type SheetEditableFieldKind = 'text' | 'tel' | 'email' | 'date' | 'long'

type Props = {
  label: string
  value: string
  onSave: (value: string) => void
  placeholder?: string
  multiline?: boolean
  /** Zeilen im Edit-Textarea (default 14 für Beschreibung) */
  rows?: number
  /** KI-Sparkles im Edit-Sheet / Inline */
  kiExtraHint?: string | null
  disabled?: boolean
  /** Beim Mount/True einmal Edit-Sheet öffnen (Deep-Link Fokus) */
  autoOpen?: boolean
  className?: string
  /** Zusätzlicher Hinweis unter dem Label in der Liste */
  hint?: string | null
  /**
   * `detail` = bereits in einem Sheet → immer inline tippen (kein verschachteltes Sheet).
   * `canvas` = auf der Seite: Desktop inline, Mobil Sheet+Stift.
   */
  sheetContext?: EditorSheetContext
  /**
   * `auto` (default): kurze Felder (text/tel/email/date) immer inline;
   * long/multiline → detail inline, canvas Desktop inline / Mobil Sheet.
   * `inline` / `sheet`: erzwingen.
   */
  editMode?: 'auto' | 'inline' | 'sheet'
  /**
   * Kurze Feldarten — immer inline (kein Sheet pro Feld).
   * `long` = lange Texte (Beschreibung etc.).
   */
  kind?: SheetEditableFieldKind
}

function isShortKind(kind: SheetEditableFieldKind | undefined, multiline: boolean): boolean {
  if (multiline) return false
  if (kind === 'long') return false
  return true
}

/**
 * Textfeld: kurze Felder (Text, Tel, E-Mail, Datum) immer inline;
 * lange Texte mobil optional Sheet mit Stift.
 */
export function SheetEditableField({
  label,
  value,
  onSave,
  placeholder = 'Tippen zum Bearbeiten…',
  multiline = false,
  rows = 14,
  kiExtraHint,
  disabled,
  autoOpen,
  className,
  hint,
  sheetContext = 'canvas',
  editMode = 'auto',
  kind,
}: Props) {
  const isMobile = useIsMobile()
  const short = isShortKind(kind, multiline) || (!multiline && kind !== 'long')
  const resolvedKind: SheetEditableFieldKind =
    kind ?? (multiline ? 'long' : 'text')

  const useSheet =
    editMode === 'sheet' ||
    (editMode === 'auto' &&
      !short &&
      sheetContext !== 'detail' &&
      isMobile)

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (autoOpen && useSheet) setOpen(true)
  }, [autoOpen, useSheet])

  useEffect(() => {
    if (!open) return
    setDraft(value)
    setDirty(false)
  }, [open, value])

  function confirm() {
    onSave(draft)
    setDirty(false)
    setOpen(false)
  }

  const display = value.trim()
  const showKi =
    Boolean(kiExtraHint != null || multiline || resolvedKind === 'long') &&
    resolvedKind !== 'date' &&
    resolvedKind !== 'tel' &&
    resolvedKind !== 'email'

  function renderControl(
    current: string,
    onChange: (v: string) => void,
    opts?: { autoFocus?: boolean }
  ) {
    if (resolvedKind === 'date') {
      return (
        <DateInput
          value={current}
          disabled={disabled}
          autoFocus={opts?.autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    }
    if (multiline || resolvedKind === 'long') {
      return (
        <MockTextarea
          className="ta ta--long wizard-dok-beschreibung"
          rows={rows}
          value={current}
          disabled={disabled}
          placeholder={placeholder}
          autoFocus={opts?.autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    }
    const inputType =
      resolvedKind === 'email' ? 'email' : resolvedKind === 'tel' ? 'tel' : 'text'
    return (
      <MockInput
        type={inputType}
        value={current}
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={opts?.autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (!useSheet) {
    const control = renderControl(value, onSave)

    return (
      <div
        className={cn(
          'sheet-editable-field sheet-editable-field--inline full',
          (multiline || resolvedKind === 'long') && 'sheet-editable-field--dok-beschreibung',
          className
        )}
      >
        {hint ? <p className="sheet-editable-field__hint">{hint}</p> : null}
        {showKi ? (
          <KiAssistFieldLabel
            label={label}
            value={value}
            onApply={onSave}
            extraHint={kiExtraHint}
            multiline={multiline || resolvedKind === 'long'}
            disabled={disabled}
            className="full"
          >
            {control}
          </KiAssistFieldLabel>
        ) : (
          <div className="full">
            <div className="lt-field-lbl">{label}</div>
            {control}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div
        className={cn(
          'sheet-editable-field full',
          (multiline || resolvedKind === 'long') && 'sheet-editable-field--dok-beschreibung',
          className
        )}
      >
        <div className="lt-field-lbl">{label}</div>
        {hint ? <p className="sheet-editable-field__hint">{hint}</p> : null}
        <div className="sheet-editable-field__row">
          <MockBtn
            className={cn(
              'sheet-editable-field__value',
              (multiline || resolvedKind === 'long') && 'sheet-editable-field__value--multi',
              !display && 'is-empty'
            )}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setOpen(true)}
          >
            {display || placeholder}
          </MockBtn>
          <MockBtn
            className="ki-assist-icon-btn sheet-editable-field__edit"
            type="button"
            title={`${label} bearbeiten`}
            aria-label={`${label} bearbeiten`}
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            <MockIcon ctx="btn" n="pencil" size={16} />
          </MockBtn>
        </div>
      </div>

      <EditorSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        context={sheetContext}
        dirty={dirty}
        onConfirm={confirm}
        confirmDisabled={disabled}
      >
        <div className="form-grid form-grid--sheet">
          {showKi ? (
            <KiAssistFieldLabel
              label={label}
              value={draft}
              onApply={(text) => {
                setDraft(text)
                setDirty(true)
              }}
              extraHint={kiExtraHint}
              multiline={multiline || resolvedKind === 'long'}
              className="full"
            >
              {renderControl(
                draft,
                (v) => {
                  setDraft(v)
                  setDirty(true)
                },
                { autoFocus: true }
              )}
            </KiAssistFieldLabel>
          ) : (
            <div className="full">
              {renderControl(
                draft,
                (v) => {
                  setDraft(v)
                  setDirty(true)
                },
                { autoFocus: true }
              )}
            </div>
          )}
        </div>
      </EditorSheet>
    </>
  )
}
