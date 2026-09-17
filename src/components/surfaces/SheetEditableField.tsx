'use client'

import { useEffect, useState } from 'react'
import { EditorSheet, type EditorSheetContext } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

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
   * `auto` (default): detail → inline; canvas → Desktop inline / Mobil Sheet.
   * `inline` / `sheet`: erzwingen.
   */
  editMode?: 'auto' | 'inline' | 'sheet'
}

/**
 * Textfeld: Desktop (und in Detail-Sheets) direkt tippen;
 * Mobil auf der Canvas-Seite optional Sheet mit Stift.
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
}: Props) {
  const isMobile = useIsMobile()
  const useSheet =
    editMode === 'sheet' ||
    (editMode === 'auto' && sheetContext !== 'detail' && isMobile)

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
  const showKi = Boolean(kiExtraHint != null || multiline)

  if (!useSheet) {
    const control = multiline ? (
      <textarea
        className="input ta ta--long wizard-dok-beschreibung"
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onSave(e.target.value)}
      />
    ) : (
      <input
        className="input"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onSave(e.target.value)}
      />
    )

    return (
      <div className={cn('sheet-editable-field sheet-editable-field--inline full', multiline && 'sheet-editable-field--dok-beschreibung', className)}>
        {hint ? <p className="sheet-editable-field__hint">{hint}</p> : null}
        {showKi ? (
          <KiAssistFieldLabel
            label={label}
            value={value}
            onApply={onSave}
            extraHint={kiExtraHint}
            multiline={multiline}
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
      <div className={cn('sheet-editable-field full', multiline && 'sheet-editable-field--dok-beschreibung', className)}>
        <div className="lt-field-lbl">{label}</div>
        {hint ? <p className="sheet-editable-field__hint">{hint}</p> : null}
        <div className="sheet-editable-field__row">
          <button
            type="button"
            className={cn(
              'sheet-editable-field__value',
              multiline && 'sheet-editable-field__value--multi',
              !display && 'is-empty'
            )}
            disabled={disabled}
            onClick={() => !disabled && setOpen(true)}
          >
            {display || placeholder}
          </button>
          <button
            type="button"
            className="ki-assist-icon-btn sheet-editable-field__edit"
            title={`${label} bearbeiten`}
            aria-label={`${label} bearbeiten`}
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            <MockIcon ctx="btn" n="pencil" size={16} />
          </button>
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
              multiline={multiline}
              className="full"
            >
              {multiline ? (
                <textarea
                  className="input ta ta--long wizard-dok-beschreibung"
                  rows={rows}
                  value={draft}
                  autoFocus
                  placeholder={placeholder}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setDirty(true)
                  }}
                />
              ) : (
                <input
                  className="input"
                  value={draft}
                  autoFocus
                  placeholder={placeholder}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setDirty(true)
                  }}
                />
              )}
            </KiAssistFieldLabel>
          ) : (
            <div className="full">
              {multiline ? (
                <textarea
                  className="input ta ta--long wizard-dok-beschreibung"
                  rows={rows}
                  value={draft}
                  autoFocus
                  placeholder={placeholder}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setDirty(true)
                  }}
                />
              ) : (
                <input
                  className="input"
                  value={draft}
                  autoFocus
                  placeholder={placeholder}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setDirty(true)
                  }}
                />
              )}
            </div>
          )}
        </div>
      </EditorSheet>
    </>
  )
}
